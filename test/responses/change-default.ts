import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {ANY, CannedResponses, SECRET_VALUE, getCannedResponse} from '../test-helper.js'

const createdResponse = {response: {message: '', newId: '17002327855857830'}}

const cannedResponses: CannedResponses = {
  'https://api.staging-prefab.cloud/api/v1/config/key/feature-flag.simple': [
    [
      {},
      {
        allowableValues: [{bool: true}, {bool: false}],
        changedBy: {apiKeyId: '315', email: '', userId: '4'},
        configType: 'FEATURE_FLAG',
        draftId: '522',
        id: '17005947285496532',
        key: 'feature-flag.simple',
        projectId: '124',
        rows: [
          {
            projectEnvId: '143',
            values: [
              {
                criteria: [
                  {
                    operator: 'PROP_IS_ONE_OF',
                    propertyName: 'prefab-api-key.user-id',
                    valueToMatch: {stringList: {values: ['4', '4', '4', '4', '4', '4', '4', '4', '4', '4', '4', '4']}},
                  },
                ],
                value: {bool: true},
              },
              {value: {bool: true}},
            ],
          },
        ],
        valueType: 'BOOL',
      },
      200,
    ],
  ],
  'https://api.staging-prefab.cloud/api/v1/config/key/jeffreys.test.int': [
    [
      {},
      {
        changedBy: {apiKeyId: '', email: 'jeffrey.chupp@prefab.cloud', userId: '0'},
        configType: 'CONFIG',
        draftId: '531',
        id: '17005955334851009',
        key: 'jeffreys.test.int',
        projectId: '124',
        rows: [{values: [{value: {int: 99}}]}],
        valueType: 'INT',
      },
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/jeffreys.test.key': [
    [
      {},
      {
        changedBy: {apiKeyId: '', email: 'jeffrey.chupp@prefab.cloud', userId: '0'},
        configType: 'CONFIG',
        draftId: '531',
        id: '17005955334851003',
        key: 'jeffreys.test.key',
        projectId: '124',
        rows: [
          {projectEnvId: '588', values: [{value: {string: 'default'}}]},
          {values: [{value: {string: 'abc'}}]},
          {
            projectEnvId: '143',
            values: [
              {
                criteria: [
                  {
                    operator: 'PROP_IS_ONE_OF',
                    propertyName: 'prefab-api-key.user-id',
                    valueToMatch: {stringList: {values: ['4']}},
                  },
                ],
                value: {string: 'my.override'},
              },
              {value: {string: 'default'}},
            ],
          },
        ],
        valueType: 'STRING',
      },
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/prefab.secrets.encryption.key': [
    [
      {},
      {
        changedBy: {apiKeyId: '', email: 'jeffrey.chupp@prefab.cloud', userId: '0'},
        configType: 'CONFIG',
        draftId: '497',
        id: '17018809595519854',
        key: 'prefab.secrets.encryption.key',
        projectId: '100',
        rows: [
          {values: [{value: {provided: {lookup: 'FAKE_PROD_SECRET', source: 'ENV_VAR'}}}]},
          {projectEnvId: '101', values: [{value: {provided: {lookup: 'FAKE_DEFAULT_SECRET', source: 'ENV_VAR'}}}]},
        ],
        valueType: 'STRING',
      },
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/robocop-secret': [
    [
      {},
      {
        changedBy: {apiKeyId: '315', email: '', userId: '4'},
        configType: 'CONFIG',
        draftId: '554',
        id: '17049868822052866',
        key: 'robocop-secret',
        projectId: '124',
        rows: [
          {
            values: [
              {
                value: {
                  confidential: true,
                  decryptWith: 'prefab.secrets.encryption.key',
                  string: 'ff6351432e--76813f77392fb3dd15f5ca1b--87f6c7691570d277ae1a9a302646f906',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      },
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/this.does.not.exist': [[{}, {}, 404]],

  'https://api.staging-prefab.cloud/api/v1/config/set-default/': [
    [
      {configKey: 'feature-flag.simple', currentVersionId: ANY, environmentId: '5', value: {bool: true}},
      createdResponse,
      200,
    ],

    [
      {
        configKey: 'jeffreys.test.key',
        currentVersionId: ANY,
        value: {string: 'hello default world'},
      },
      createdResponse,
      200,
    ],

    [
      {
        configKey: 'jeffreys.test.key',
        currentVersionId: ANY,
        environmentId: '6',
        value: {provided: {lookup: 'GREETING', source: 1}},
      },
      createdResponse,
      200,
    ],

    [
      {
        configKey: 'jeffreys.test.key',
        currentVersionId: ANY,
        environmentId: '6',
        value: {
          confidential: true,
          decryptWith: 'prefab.secrets.encryption.key',
          string: SECRET_VALUE,
        },
      },
      createdResponse,
      200,
    ],

    [
      {
        configKey: 'robocop-secret',
        currentVersionId: ANY,
        environmentId: '6',
        value: {confidential: true, decryptWith: 'prefab.secrets.encryption.key', string: ANY},
      },
      createdResponse,
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/project-environments': [
    [
      {},
      {
        envs: [
          {id: 5, name: 'Development'},
          {id: 590, name: 'Another One Mark 2'},
          {id: 6, name: 'Staging'},
        ],
        projectId: 3,
      },
      200,
    ],
  ],
}

export const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.get('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),

  http.post('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),
)
