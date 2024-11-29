// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as asyncCallStacksHandlerData} from './AsyncCallStacksHandler.js';
import {data as flowsHandlerData} from './FlowsHandler.js';

const lastScheduleStyleRecalcByFrame = new Map<string, Types.Events.ScheduleStyleRecalculation>();

// This tracks the last event that is considered to have invalidated the layout
// for a given frame.
// Note that although there is an InvalidateLayout event, there are also other
// events (ScheduleStyleRecalculation) that could be the reason a layout was
// invalidated.
const lastInvalidationEventForFrame = new Map<string, Types.Events.Event>();

// Important: although the event is called UpdateLayoutTree, in the UI we
// present these to the user as "Recalculate Style". So don't get confused!
// These are the same - just UpdateLayoutTree is what the event from Chromium
// is called.
const lastUpdateLayoutTreeByFrame = new Map<string, Types.Events.UpdateLayoutTree>();

// These two maps store the same data but in different directions.
// For a given event, tell me what its initiator was. An event can only have one initiator.
const eventToInitiatorMap = new Map<Types.Events.Event, Types.Events.Event>();
// For a given event, tell me what events it initiated. An event can initiate
// multiple events, hence why the value for this map is an array.
const initiatorToEventsMap = new Map<Types.Events.Event, Types.Events.Event[]>();

const webSocketCreateEventsById: Map<number, Types.Events.WebSocketCreate> = new Map();
const schedulePostTaskCallbackEventsById: Map<number, Types.Events.SchedulePostTaskCallback> = new Map();

export function reset(): void {
  lastScheduleStyleRecalcByFrame.clear();
  lastInvalidationEventForFrame.clear();
  lastUpdateLayoutTreeByFrame.clear();
  eventToInitiatorMap.clear();
  initiatorToEventsMap.clear();
  webSocketCreateEventsById.clear();
  schedulePostTaskCallbackEventsById.clear();
}

function storeInitiator(data: {initiator: Types.Events.Event, event: Types.Events.Event}): void {
  eventToInitiatorMap.set(data.event, data.initiator);
  const eventsForInitiator = initiatorToEventsMap.get(data.initiator) || [];
  eventsForInitiator.push(data.event);
  initiatorToEventsMap.set(data.initiator, eventsForInitiator);
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isScheduleStyleRecalculation(event)) {
    lastScheduleStyleRecalcByFrame.set(event.args.data.frame, event);
  } else if (Types.Events.isUpdateLayoutTree(event)) {
    // IMPORTANT: although the trace event is called UpdateLayoutTree, this
    // represents a Styles Recalculation. This event in the timeline is shown to
    // the user as "Recalculate Styles."
    if (event.args.beginData) {
      // Store the last UpdateLayout event: we use this when we see an
      // InvalidateLayout and try to figure out its initiator.
      lastUpdateLayoutTreeByFrame.set(event.args.beginData.frame, event);

      // If this frame has seen a ScheduleStyleRecalc event, then that event is
      // considered to be the initiator of this StylesRecalc.
      const scheduledStyleForFrame = lastScheduleStyleRecalcByFrame.get(event.args.beginData.frame);
      if (scheduledStyleForFrame) {
        storeInitiator({
          event,
          initiator: scheduledStyleForFrame,
        });
      }
    }
  } else if (Types.Events.isInvalidateLayout(event)) {
    // By default, the InvalidateLayout event is what triggered the layout invalidation for this frame.
    let invalidationInitiator: Types.Events.Event = event;

    // However, if we have not had any prior invalidations for this frame, we
    // want to consider StyleRecalculation events as they might be the actual
    // cause of this layout invalidation.
    if (!lastInvalidationEventForFrame.has(event.args.data.frame)) {
      // 1. If we have not had an invalidation event for this frame
      // 2. AND we have had an UpdateLayoutTree for this frame
      // 3. AND the UpdateLayoutTree event ended AFTER the InvalidateLayout startTime
      // 4. AND we have an initiator for the UpdateLayoutTree event
      // 5. Then we set the last invalidation event for this frame to be the UpdateLayoutTree's initiator.
      const lastUpdateLayoutTreeForFrame = lastUpdateLayoutTreeByFrame.get(event.args.data.frame);
      if (lastUpdateLayoutTreeForFrame) {
        const {endTime} = Helpers.Timing.eventTimingsMicroSeconds(lastUpdateLayoutTreeForFrame);
        const initiatorOfUpdateLayout = eventToInitiatorMap.get(lastUpdateLayoutTreeForFrame);

        if (initiatorOfUpdateLayout && endTime && endTime > event.ts) {
          invalidationInitiator = initiatorOfUpdateLayout;
        }
      }
    }
    lastInvalidationEventForFrame.set(event.args.data.frame, invalidationInitiator);
  } else if (Types.Events.isLayout(event)) {
    // The initiator of a Layout event is the last Invalidation event.
    const lastInvalidation = lastInvalidationEventForFrame.get(event.args.beginData.frame);
    if (lastInvalidation) {
      storeInitiator({
        event,
        initiator: lastInvalidation,
      });
    }
    // Now clear the last invalidation for the frame: the last invalidation has been linked to a Layout event, so it cannot be the initiator for any future layouts.
    lastInvalidationEventForFrame.delete(event.args.beginData.frame);
  } else if (Types.Events.isWebSocketCreate(event)) {
    webSocketCreateEventsById.set(event.args.data.identifier, event);
  } else if (Types.Events.isWebSocketInfo(event) || Types.Events.isWebSocketTransfer(event)) {
    const matchingCreateEvent = webSocketCreateEventsById.get(event.args.data.identifier);
    if (matchingCreateEvent) {
      storeInitiator({
        event,
        initiator: matchingCreateEvent,
      });
    }
  } else if (Types.Events.isSchedulePostTaskCallback(event)) {
    schedulePostTaskCallbackEventsById.set(event.args.data.taskId, event);
  } else if (Types.Events.isRunPostTaskCallback(event) || Types.Events.isAbortPostTaskCallback(event)) {
    const matchingSchedule = schedulePostTaskCallbackEventsById.get(event.args.data.taskId);
    if (matchingSchedule) {
      storeInitiator({event, initiator: matchingSchedule});
    }
  }
}

function createRelationshipsFromFlows(): void {
  const flows = flowsHandlerData().flows;
  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i];
    for (let j = 0; j < flow.length - 1; j++) {
      storeInitiator({event: flow[j + 1], initiator: flow[j]});
    }
  }
}

function createRelationshipsFromAsyncCallStacks(): void {
  const asyncCallPairs = asyncCallStacksHandlerData().schedulerToRunEntryPoints.entries();
  for (const [asyncCaller, asyncCallees] of asyncCallPairs) {
    for (const asyncCallee of asyncCallees) {
      storeInitiator({event: asyncCallee, initiator: asyncCaller});
    }
  }
}

export async function finalize(): Promise<void> {
  createRelationshipsFromFlows();
  createRelationshipsFromAsyncCallStacks();
}

export interface InitiatorsData {
  eventToInitiator: Map<Types.Events.Event, Types.Events.Event>;
  initiatorToEvents: Map<Types.Events.Event, Types.Events.Event[]>;
}

export function data(): InitiatorsData {
  return {
    eventToInitiator: eventToInitiatorMap,
    initiatorToEvents: initiatorToEventsMap,
  };
}

export function deps(): ['Flows', 'AsyncCallStacks'] {
  return ['Flows', 'AsyncCallStacks'];
}
