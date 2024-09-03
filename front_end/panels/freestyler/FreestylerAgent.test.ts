// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import {
  describeWithEnvironment,
  getGetHostConfigStub,
} from '../../testing/EnvironmentHelpers.js';

import * as Freestyler from './freestyler.js';

const {FreestylerAgent} = Freestyler;

describeWithEnvironment('FreestylerAgent', () => {
  function mockHostConfig(modelId?: string) {
    getGetHostConfigStub({
      devToolsFreestylerDogfood: {
        modelId: modelId,
      },
    });
  }

  function createExtensionScope() {
    return {
      async install() {

      },
      async uninstall() {

      },
    };
  }
  describe('parseResponse', () => {
    it('parses a thought', async () => {
      const payload = 'some response';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`THOUGHT: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: payload,
            answer: undefined,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`   THOUGHT: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: payload,
            answer: undefined,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`Something\n   THOUGHT: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: payload,
            answer: undefined,
            fixable: false,
          },
      );
    });
    it('parses a answer', async () => {
      const payload = 'some response';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ANSWER: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`   ANSWER: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`Something\n   ANSWER: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
    });
    it('parses a multiline answer', async () => {
      const payload = `a
b
c`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ANSWER: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`   ANSWER: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`Something\n   ANSWER: ${payload}`),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ANSWER: ${payload}\nTHOUGHT: thought`),
          {
            action: undefined,
            title: undefined,
            thought: 'thought',
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ANSWER: ${payload}\nOBSERVATION: observation`,
              ),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ANSWER: ${payload}\nACTION\naction\nSTOP`,
              ),
          {
            action: 'action',
            title: undefined,
            thought: undefined,
            answer: payload,
            fixable: false,
          },
      );
    });
    it('parses an action', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ACTION\n${payload}\nSTOP`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
            answer: undefined,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ACTION\n${payload}`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
            answer: undefined,
            fixable: false,
          },
      );
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`ACTION\n\n${payload}\n\nSTOP`),
          {
            action: payload,
            title: undefined,
            thought: undefined,
            answer: undefined,
            fixable: false,
          },
      );
    });
    it('parses a thought and title', async () => {
      const payload = 'some response';
      const title = 'this is the title';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`THOUGHT: ${payload}\nTITLE: ${title}`),
          {
            action: undefined,
            thought: payload,
            title: title,
            answer: undefined,
            fixable: false,
          },
      );
    });

    it('parses an action with backticks in the code', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ACTION\n\`\`\`\n${payload}\n\`\`\`\nSTOP`,
              ),
          {
            action: payload,
            title: undefined,
            thought: undefined,
            answer: undefined,
            fixable: false,
          },
      );
    });

    it('parses an action with 5 backticks in the code and `js` text in the prelude', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `ACTION\n\`\`\`\`\`\njs\n${payload}\n\`\`\`\`\`\nSTOP`,
              ),
          {
            action: payload,
            title: undefined,
            thought: undefined,
            answer: undefined,
            fixable: false,
          },
      );
    });

    it('parses a thought and an action', async () => {
      const actionPayload = `const data = {
  someKey: "value",
}`;
      const thoughtPayload = 'thought';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              `THOUGHT:${thoughtPayload}\nACTION\n${actionPayload}\nSTOP`,
              ),
          {
            action: actionPayload,
            title: undefined,
            thought: thoughtPayload,
            answer: undefined,
            fixable: false,
          },
      );
    });

    it('parses a response as an answer', async () => {
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(
              'This is also an answer',
              ),
          {
            action: undefined,
            title: undefined,
            thought: undefined,
            answer: 'This is also an answer',
            fixable: false,
          },
      );
    });
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          FreestylerAgent.buildRequest({input: 'test input'}).options?.model_id,
          'test model',
      );
    });

    it('builds a request with logging', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          FreestylerAgent.buildRequest({input: 'test input', serverSideLoggingEnabled: true})
              .metadata?.disable_user_content_logging,
          false,
      );
    });

    it('builds a request without logging', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          FreestylerAgent.buildRequest({input: 'test input', serverSideLoggingEnabled: false})
              .metadata?.disable_user_content_logging,
          true,
      );
    });

    it('builds a request with input', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest({input: 'test input'});
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with a sessionId', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest({input: 'test input', sessionId: 'sessionId'});
      assert.strictEqual(request.metadata?.string_session_id, 'sessionId');
    });

    it('builds a request with preamble', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest({input: 'test input', preamble: 'preamble'});
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, 'preamble');
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with chat history', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest({
        input: 'test input',
        chatHistory: [
          {
            text: 'test',
            entity: Host.AidaClient.Entity.USER,
          },
        ],
      });
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.deepStrictEqual(request.chat_history, [
        {
          text: 'test',
          entity: 1,
        },
      ]);
    });

    it('structure matches the snapshot', () => {
      mockHostConfig('test model');
      assert.deepStrictEqual(
          FreestylerAgent.buildRequest({
            input: 'test input',
            preamble: 'preamble',
            chatHistory: [
              {
                text: 'first',
                entity: Host.AidaClient.Entity.UNKNOWN,
              },
              {
                text: 'second',
                entity: Host.AidaClient.Entity.SYSTEM,
              },
              {
                text: 'third',
                entity: Host.AidaClient.Entity.USER,
              },
            ],
            serverSideLoggingEnabled: true,
            sessionId: 'sessionId',
          }),
          {
            input: 'test input',
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            chat_history: [
              {
                entity: 0,
                text: 'first',
              },
              {
                entity: 2,
                text: 'second',
              },
              {
                entity: 1,
                text: 'third',
              },
            ],
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
            },
            options: {
              model_id: 'test model',
              temperature: 0,
            },
            client_feature: 2,
            functionality_type: 1,
          },
      );
    });
  });

  describe('run', () => {
    beforeEach(() => {
      mockHostConfig();
    });

    function mockAidaClient(
        fetch: () => AsyncGenerator<Host.AidaClient.AidaResponse, void, void>,
        ): Host.AidaClient.AidaClient {
      return {
        fetch,
        registerClientEvent: () => Promise.resolve({}),
      };
    }

    describe('side effect handling', () => {
      it('calls confirmSideEffect when the code execution contains a side effect', async () => {
        const promise = Promise.withResolvers();
        const stub = sinon.stub().returns(promise);

        let count = 0;
        async function* generateActionAndAnswer() {
          if (count === 0) {
            yield {
              explanation: `ACTION
              $0.style.backgroundColor = 'red'
              STOP`,
              metadata: {},
            };
          } else {
            yield {
              explanation: 'ANSWER: This is the answer',
              metadata: {},
            };
          }

          count++;
        }
        const execJs =
            sinon.mock().throws(new Freestyler.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        const agent = new FreestylerAgent({
          aidaClient: mockAidaClient(generateActionAndAnswer),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });

        promise.resolve(true);
        await Array.fromAsync(agent.run('test'));

        sinon.assert.match(execJs.getCall(0).args[1], sinon.match({throwOnSideEffect: true}));
      });

      it('calls execJs with allowing side effects when confirmSideEffect resolves to true', async () => {
        const promise = Promise.withResolvers();
        const stub = sinon.stub().returns(promise);
        let count = 0;
        async function* generateActionAndAnswer() {
          if (count === 0) {
            yield {
              explanation: `ACTION
              $0.style.backgroundColor = 'red'
              STOP`,
              metadata: {},
            };
          } else {
            yield {
              explanation: 'ANSWER: This is the answer',
              metadata: {},
            };
          }

          count++;
        }
        const execJs = sinon.mock().twice();
        execJs.onCall(0).throws(new Freestyler.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        execJs.onCall(1).resolves('value');
        const agent = new FreestylerAgent({
          aidaClient: mockAidaClient(generateActionAndAnswer),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });
        promise.resolve(true);
        await Array.fromAsync(agent.run('test'));

        assert.strictEqual(execJs.getCalls().length, 2);
        sinon.assert.match(execJs.getCall(1).args[1], sinon.match({throwOnSideEffect: false}));
      });

      it('returns side effect error when confirmSideEffect resolves to false', async () => {
        const promise = Promise.withResolvers();
        const stub = sinon.stub().returns(promise);
        let count = 0;
        async function* generateActionAndAnswer() {
          if (count === 0) {
            yield {
              explanation: `ACTION
              $0.style.backgroundColor = 'red'
              STOP`,
              metadata: {},
            };
          } else {
            yield {
              explanation: 'ANSWER: This is the answer',
              metadata: {},
            };
          }

          count++;
        }
        const execJs = sinon.mock().twice();
        execJs.onCall(0).throws(new Freestyler.SideEffectError('EvalError: Possible side-effect in debug-evaluate'));
        const agent = new FreestylerAgent({
          aidaClient: mockAidaClient(generateActionAndAnswer),
          createExtensionScope,
          confirmSideEffectForTest: stub,
          execJs,

        });
        promise.resolve(false);
        const responses = await Array.fromAsync(agent.run('test'));

        const actionStep = responses.find(response => response.type === Freestyler.ResponseType.ACTION)!;

        assert.strictEqual(actionStep.output, 'Error: EvalError: Possible side-effect in debug-evaluate');
        assert.strictEqual(execJs.getCalls().length, 1);
      });

      it('calls execJs with allowing side effects when the query includes "Fix this issue" prompt', async () => {
        let count = 0;
        async function* generateActionAndAnswer() {
          if (count === 0) {
            yield {
              explanation: `ACTION
              $0.style.backgroundColor = 'red'
              STOP`,
              metadata: {},
            };
          } else {
            yield {
              explanation: 'ANSWER: This is the answer',
              metadata: {},
            };
          }

          count++;
        }
        const execJs = sinon.mock().once();
        const agent = new FreestylerAgent({
          aidaClient: mockAidaClient(generateActionAndAnswer),
          createExtensionScope,
          execJs,

        });

        await Array.fromAsync(agent.run(Freestyler.FIX_THIS_ISSUE_PROMPT, {isFixQuery: true}));

        const optionsArg = execJs.lastCall.args[1];
        sinon.assert.match(optionsArg, sinon.match({throwOnSideEffect: false}));
      });
    });

    describe('long `Observation` text handling', () => {
      it('errors with too long input', async () => {
        let count = 0;
        async function* generateActionAndAnswer() {
          if (count === 0) {
            yield {
              explanation: `ACTION
              $0.style.backgroundColor = 'red'
              STOP`,
              metadata: {},
            };
          } else {
            yield {
              explanation: 'ANSWER: This is the answer',
              metadata: {},
            };
          }
          count++;
        }
        const execJs = sinon.mock().returns(new Array(10_000).fill('<div>...</div>').join());
        const agent = new FreestylerAgent({
          aidaClient: mockAidaClient(generateActionAndAnswer),
          createExtensionScope,
          execJs,

        });

        const result = await Array.fromAsync(agent.run('test'));
        const actionSteps = result.filter(step => {
          return step.type === Freestyler.ResponseType.ACTION;
        });
        assert(actionSteps.length === 1, 'Found non or multiple action steps');
        const actionStep = actionSteps.at(0)!;
        assert(actionStep.output.includes('Error: Output exceeded the maximum allowed length.'));
      });
    });

    it('generates an answer immediately', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'ANSWER: this is the answer',
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateAnswer),
        execJs,

      });

      const responses = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(responses, [
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          type: Freestyler.ResponseType.ANSWER,
          text: 'this is the answer',
          rpcId: undefined,
          fixable: false,
        },
      ]);
      sinon.assert.notCalled(execJs);
      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: 'QUERY: test',
        },
        {
          entity: 2,
          text: 'ANSWER: this is the answer',
        },
      ]);
    });

    it('generates an rpcId for the answer', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'ANSWER: this is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        };
      }

      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateAnswer),
        execJs: sinon.spy(),

      });

      const responses = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(responses, [
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          type: Freestyler.ResponseType.ANSWER,
          text: 'this is the answer',
          rpcId: 123,
          fixable: false,
        },
      ]);
    });

    it('throws an error based on the attribution metadata including RecitationAction.BLOCK', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'ANSWER: this is the answer',
          metadata: {
            rpcGlobalId: 123,
            attributionMetadata: [{
              attributionAction: Host.AidaClient.RecitationAction.BLOCK,
              citations: [],
            }],
          },
        };
      }

      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateAnswer),
        execJs: sinon.spy(),

      });

      const responses = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(responses, [
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          rpcId: undefined,
          type: Freestyler.ResponseType.ERROR,
          error: 'Sorry, I could not help you with this query.',
        },
      ]);
    });

    it('does not throw an error based on attribution metadata not including RecitationAction.BLOCK', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'ANSWER: this is the answer',
          metadata: {
            rpcGlobalId: 123,
            attributionMetadata: [{
              attributionAction: Host.AidaClient.RecitationAction.ACTION_UNSPECIFIED,
              citations: [],
            }],
          },
        };
      }

      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateAnswer),
        execJs: sinon.spy(),

      });

      const responses = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(responses, [
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          type: Freestyler.ResponseType.ANSWER,
          text: 'this is the answer',
          rpcId: 123,
          fixable: false,
        },
      ]);
    });

    it('generates a response if nothing is returned', async () => {
      async function* generateNothing() {
        yield {
          explanation: '',
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateNothing),
        execJs,

      });
      const responses = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(responses, [
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          type: Freestyler.ResponseType.ERROR,
          error: 'Sorry, I could not help you with this query.',
          rpcId: undefined,
        },
      ]);
      sinon.assert.notCalled(execJs);
      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: 'QUERY: test',
        },
        {
          entity: 2,
          text: '',
        },
      ]);
    });

    it('generates an action response if action and answer both present', async () => {
      let i = 0;
      async function* generateNothing() {
        if (i !== 0) {
          yield {
            explanation: 'ANSWER: this is the actual answer',
            metadata: {},
          };
          return;
        }
        yield {
          explanation: `THOUGHT: I am thinking.

ACTION
console.log('hello');
STOP

ANSWER: this is the answer`,
          metadata: {},
        };
        i++;
      }

      const execJs = sinon.mock().once();
      execJs.onCall(0).returns('hello');
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateNothing),
        createExtensionScope,
        execJs,

      });
      const responses = await Array.fromAsync(agent.run('test'));
      assert.deepStrictEqual(responses, [
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          type: Freestyler.ResponseType.THOUGHT,
          thought: 'I am thinking.',
          title: undefined,
          rpcId: undefined,
        },
        {
          type: Freestyler.ResponseType.ACTION,
          code: 'console.log(\'hello\');',
          output: 'hello',
          rpcId: undefined,
        },
        {
          type: Freestyler.ResponseType.QUERYING,
        },
        {
          type: Freestyler.ResponseType.ANSWER,
          text: 'this is the actual answer',
          rpcId: undefined,
          fixable: false,
        },
      ]);
      sinon.assert.calledOnce(execJs);
    });

    it('generates history for multiple actions', async () => {
      let count = 0;
      async function* generateMultipleTimes() {
        if (count === 3) {
          yield {
            explanation: 'ANSWER: this is the answer',
            metadata: {},
          };
          return;
        }
        count++;
        yield {
          explanation: `THOUGHT: thought ${count}\nTITLE:test\nACTION\nconsole.log('test')\nSTOP\n`,
          metadata: {},
        };
      }

      const execJs = sinon.spy(async () => 'undefined');
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateMultipleTimes),
        createExtensionScope,
        execJs,

      });

      await Array.fromAsync(agent.run('test'));

      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: 'QUERY: test',
        },
        {
          entity: 2,
          text: 'THOUGHT: thought 1\nTITLE: test\nACTION\nconsole.log(\'test\')\nSTOP',
        },
        {
          entity: 1,
          text: 'OBSERVATION: undefined',
        },
        {
          entity: 2,
          text: 'THOUGHT: thought 2\nTITLE: test\nACTION\nconsole.log(\'test\')\nSTOP',
        },
        {
          entity: 1,
          text: 'OBSERVATION: undefined',
        },
        {
          entity: 2,
          text: 'THOUGHT: thought 3\nTITLE: test\nACTION\nconsole.log(\'test\')\nSTOP',
        },
        {
          entity: 1,
          text: 'OBSERVATION: undefined',
        },
        {
          entity: 2,
          text: 'ANSWER: this is the answer',
        },
      ]);
    });

    it('stops when aborted', async () => {
      let count = 0;
      async function* generateMultipleTimes() {
        if (count === 3) {
          yield {
            explanation: 'ANSWER: this is the answer',
            metadata: {},
          };
          return;
        }
        count++;
        yield {
          explanation: `THOUGHT: thought ${count}\nACTION\nconsole.log('test')\nSTOP\n`,
          metadata: {},
        };
      }

      const execJs = sinon.spy();
      const agent = new FreestylerAgent({
        aidaClient: mockAidaClient(generateMultipleTimes),
        createExtensionScope,
        execJs,

      });

      const controller = new AbortController();
      controller.abort();
      await Array.fromAsync(agent.run('test', {signal: controller.signal, isFixQuery: false}));

      assert.deepStrictEqual(agent.chatHistoryForTesting, []);
    });
  });
});
