/**
 * Copyright 2023 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { assert } from '../util/assert.js';
import { interpolateFunction, stringifyFunction } from '../util/Function.js';
import { QueryHandler } from './QueryHandler.js';
import { scriptInjector } from './ScriptInjector.js';
/**
 * The registry of {@link CustomQueryHandler | custom query handlers}.
 *
 * @example
 *
 * ```ts
 * Puppeteer.customQueryHandlers.register('lit', { … });
 * const aHandle = await page.$('lit/…');
 * ```
 *
 * @internal
 */
export class CustomQueryHandlerRegistry {
    #handlers = new Map();
    /**
     * @internal
     */
    get(name) {
        const handler = this.#handlers.get(name);
        return handler ? handler[1] : undefined;
    }
    /**
     * Registers a {@link CustomQueryHandler | custom query handler}.
     *
     * @remarks
     * After registration, the handler can be used everywhere where a selector is
     * expected by prepending the selection string with `<name>/`. The name is
     * only allowed to consist of lower- and upper case latin letters.
     *
     * @example
     *
     * ```ts
     * Puppeteer.customQueryHandlers.register('lit', { … });
     * const aHandle = await page.$('lit/…');
     * ```
     *
     * @param name - Name to register under.
     * @param queryHandler - {@link CustomQueryHandler | Custom query handler} to
     * register.
     *
     * @internal
     */
    register(name, handler) {
        if (this.#handlers.has(name)) {
            throw new Error(`Cannot register over existing handler: ${name}`);
        }
        assert(!this.#handlers.has(name), `Cannot register over existing handler: ${name}`);
        assert(/^[a-zA-Z]+$/.test(name), `Custom query handler names may only contain [a-zA-Z]`);
        assert(handler.queryAll || handler.queryOne, `At least one query method must be implemented.`);
        const Handler = class extends QueryHandler {
            static querySelectorAll = interpolateFunction((node, selector, PuppeteerUtil) => {
                return PuppeteerUtil.customQuerySelectors
                    .get(PLACEHOLDER('name'))
                    .querySelectorAll(node, selector);
            }, { name: JSON.stringify(name) });
            static querySelector = interpolateFunction((node, selector, PuppeteerUtil) => {
                return PuppeteerUtil.customQuerySelectors
                    .get(PLACEHOLDER('name'))
                    .querySelector(node, selector);
            }, { name: JSON.stringify(name) });
        };
        const registerScript = interpolateFunction((PuppeteerUtil) => {
            PuppeteerUtil.customQuerySelectors.register(PLACEHOLDER('name'), {
                queryAll: PLACEHOLDER('queryAll'),
                queryOne: PLACEHOLDER('queryOne'),
            });
        }, {
            name: JSON.stringify(name),
            queryAll: handler.queryAll
                ? stringifyFunction(handler.queryAll)
                : String(undefined),
            queryOne: handler.queryOne
                ? stringifyFunction(handler.queryOne)
                : String(undefined),
        }).toString();
        this.#handlers.set(name, [registerScript, Handler]);
        scriptInjector.append(registerScript);
    }
    /**
     * Unregisters the {@link CustomQueryHandler | custom query handler} for the
     * given name.
     *
     * @throws `Error` if there is no handler under the given name.
     *
     * @internal
     */
    unregister(name) {
        const handler = this.#handlers.get(name);
        if (!handler) {
            throw new Error(`Cannot unregister unknown handler: ${name}`);
        }
        scriptInjector.pop(handler[0]);
        this.#handlers.delete(name);
    }
    /**
     * Gets the names of all {@link CustomQueryHandler | custom query handlers}.
     *
     * @internal
     */
    names() {
        return [...this.#handlers.keys()];
    }
    /**
     * Unregisters all custom query handlers.
     *
     * @internal
     */
    clear() {
        for (const [registerScript] of this.#handlers) {
            scriptInjector.pop(registerScript);
        }
        this.#handlers.clear();
    }
}
/**
 * @internal
 */
export const customQueryHandlers = new CustomQueryHandlerRegistry();
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.registerCustomQueryHandler}
 *
 * @public
 */
export function registerCustomQueryHandler(name, handler) {
    customQueryHandlers.register(name, handler);
}
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.unregisterCustomQueryHandler}
 *
 * @public
 */
export function unregisterCustomQueryHandler(name) {
    customQueryHandlers.unregister(name);
}
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.customQueryHandlerNames}
 *
 * @public
 */
export function customQueryHandlerNames() {
    return customQueryHandlers.names();
}
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.clearCustomQueryHandlers}
 *
 * @public
 */
export function clearCustomQueryHandlers() {
    customQueryHandlers.clear();
}
//# sourceMappingURL=CustomQueryHandler.js.map