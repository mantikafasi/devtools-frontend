/**
 * Copyright 2017 Google Inc. All rights reserved.
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
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { Dialog as BaseDialog } from '../../api/Dialog.js';
import { BrowsingContext } from './BrowsingContext.js';
/**
 * @internal
 */
export declare class Dialog extends BaseDialog {
    #private;
    /**
     * @internal
     */
    constructor(context: BrowsingContext, type: Bidi.BrowsingContext.UserPromptOpenedParameters['type'], message: string, defaultValue?: string);
    /**
     * @internal
     */
    sendCommand(options: {
        accept: boolean;
        text?: string;
    }): Promise<void>;
}
//# sourceMappingURL=Dialog.d.ts.map