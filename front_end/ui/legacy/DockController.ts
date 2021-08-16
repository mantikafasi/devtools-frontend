/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';

import type {ActionDelegate} from './ActionRegistration.js';
import type {Context} from './Context.js';
import type {Provider, ToolbarItem} from './Toolbar.js';
import {ToolbarButton} from './Toolbar.js';

const UIStrings = {
  /**
  *@description Text to close something
  */
  close: 'Close',
  /**
  *@description Text to dock the DevTools to the right of the browser tab
  */
  dockToRight: 'Dock to right',
  /**
  *@description Text to dock the DevTools to the bottom of the browser tab
  */
  dockToBottom: 'Dock to bottom',
  /**
  *@description Text to dock the DevTools to the left of the browser tab
  */
  dockToLeft: 'Dock to left',
  /**
  *@description Text to undock the DevTools
  */
  undockIntoSeparateWindow: 'Undock into separate window',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/DockController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let dockControllerInstance: DockController;

export class DockController extends Common.ObjectWrapper.ObjectWrapper {
  private canDockInternal: boolean;
  readonly closeButton: ToolbarButton;
  private readonly currentDockStateSetting: Common.Settings.Setting<string>;
  private readonly lastDockStateSetting: Common.Settings.Setting<string>;
  private dockSideInternal!: string;
  private titles?: Common.UIString.LocalizedString[];
  private savedFocus?: Element|null;

  constructor(canDock: boolean) {
    super();
    this.canDockInternal = canDock;

    this.closeButton = new ToolbarButton(i18nString(UIStrings.close), 'largeicon-delete');
    this.closeButton.element.classList.add('close-devtools');
    this.closeButton.addEventListener(
        ToolbarButton.Events.Click,
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance));

    this.currentDockStateSetting = Common.Settings.Settings.instance().moduleSetting('currentDockState');
    this.lastDockStateSetting = Common.Settings.Settings.instance().createSetting('lastDockState', 'bottom');

    if (!canDock) {
      this.dockSideInternal = State.Undocked;
      this.closeButton.setVisible(false);
      return;
    }

    this.currentDockStateSetting.addChangeListener(this.dockSideChanged, this);
    if (states.indexOf(this.currentDockStateSetting.get()) === -1) {
      this.currentDockStateSetting.set('right');
    }
    if (states.indexOf(this.lastDockStateSetting.get()) === -1) {
      this.currentDockStateSetting.set('bottom');
    }
  }

  static instance(opts: {
    forceNew: boolean|null,
    canDock: boolean,
  } = {forceNew: null, canDock: false}): DockController {
    const {forceNew, canDock} = opts;
    if (!dockControllerInstance || forceNew) {
      dockControllerInstance = new DockController(canDock);
    }

    return dockControllerInstance;
  }

  initialize(): void {
    if (!this.canDockInternal) {
      return;
    }

    this.titles = [
      i18nString(UIStrings.dockToRight),
      i18nString(UIStrings.dockToBottom),
      i18nString(UIStrings.dockToLeft),
      i18nString(UIStrings.undockIntoSeparateWindow),
    ];
    this.dockSideChanged();
  }

  private dockSideChanged(): void {
    this.setDockSide(this.currentDockStateSetting.get());
  }

  dockSide(): string {
    return this.dockSideInternal;
  }

  canDock(): boolean {
    return this.canDockInternal;
  }

  isVertical(): boolean {
    return this.dockSideInternal === State.DockedToRight || this.dockSideInternal === State.DockedToLeft;
  }

  setDockSide(dockSide: string): void {
    if (states.indexOf(dockSide) === -1) {
      dockSide = states[0];
    }

    if (this.dockSideInternal === dockSide) {
      return;
    }

    document.body.classList.remove(this.dockSideInternal);
    document.body.classList.add(dockSide);

    if (this.dockSideInternal) {
      this.lastDockStateSetting.set(this.dockSideInternal);
    }

    this.savedFocus = document.deepActiveElement();
    const eventData = {from: this.dockSideInternal, to: dockSide};
    this.dispatchEventToListeners(Events.BeforeDockSideChanged, eventData);
    console.timeStamp('DockController.setIsDocked');
    this.dockSideInternal = dockSide;
    this.currentDockStateSetting.set(dockSide);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked(
        dockSide !== State.Undocked, this.setIsDockedResponse.bind(this, eventData));
    this.closeButton.setVisible(this.dockSideInternal !== State.Undocked);
    this.dispatchEventToListeners(Events.DockSideChanged, eventData);
  }

  private setIsDockedResponse(eventData: {
    from: string,
    to: string,
  }): void {
    this.dispatchEventToListeners(Events.AfterDockSideChanged, eventData);
    if (this.savedFocus) {
      (this.savedFocus as HTMLElement).focus();
      this.savedFocus = null;
    }
  }

  toggleDockSide(): void {
    if (this.lastDockStateSetting.get() === this.currentDockStateSetting.get()) {
      const index = states.indexOf(this.currentDockStateSetting.get()) || 0;
      this.lastDockStateSetting.set(states[(index + 1) % states.length]);
    }
    this.setDockSide(this.lastDockStateSetting.get());
  }
}

export const State = {
  DockedToBottom: 'bottom',
  DockedToRight: 'right',
  DockedToLeft: 'left',
  Undocked: 'undocked',
};

const states = [State.DockedToRight, State.DockedToBottom, State.DockedToLeft, State.Undocked];

// Use BeforeDockSideChanged to do something before all the UI bits are updated,
// DockSideChanged to update UI, and AfterDockSideChanged to perform actions
// after frontend is docked/undocked in the browser.

export const enum Events {
  BeforeDockSideChanged = 'BeforeDockSideChanged',
  DockSideChanged = 'DockSideChanged',
  AfterDockSideChanged = 'AfterDockSideChanged',
}

let toggleDockActionDelegateInstance: ToggleDockActionDelegate;

export class ToggleDockActionDelegate implements ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ToggleDockActionDelegate {
    const {forceNew} = opts;
    if (!toggleDockActionDelegateInstance || forceNew) {
      toggleDockActionDelegateInstance = new ToggleDockActionDelegate();
    }

    return toggleDockActionDelegateInstance;
  }

  handleAction(_context: Context, _actionId: string): boolean {
    DockController.instance().toggleDockSide();
    return true;
  }
}

let closeButtonProviderInstance: CloseButtonProvider;

export class CloseButtonProvider implements Provider {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CloseButtonProvider {
    const {forceNew} = opts;
    if (!closeButtonProviderInstance || forceNew) {
      closeButtonProviderInstance = new CloseButtonProvider();
    }

    return closeButtonProviderInstance;
  }

  item(): ToolbarItem|null {
    return DockController.instance().closeButton;
  }
}
