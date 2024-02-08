import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {CannedResponses, SECRET_VALUE, getCannedResponse} from '../test-helper.js'

const recipeResponse = (key: string, defaultValue: boolean = false) => ({
  allowableValues: [{bool: true}, {bool: false}],
  changedBy: {apiKeyId: '315', email: '', userId: '4'},
  configType: 'FEATURE_FLAG',
  id: '0',
  key,
  projectId: '124',
  rows: [{projectEnvId: '143', values: [{value: {bool: defaultValue}}]}],
  valueType: 'NOT_SET_VALUE_TYPE',
})

const createFlagRequest = (key: string, defaultValue: boolean = false) => ({
  allowableValues: [{bool: true}, {bool: false}],
  changedBy: {apiKeyId: '315', email: '', userId: '4'},
  configType: 'FEATURE_FLAG',
  id: '0',
  key,
  projectId: '124',
  rows: [{projectEnvId: '143', values: [{value: {bool: defaultValue}}]}],
  valueType: 'NOT_SET_VALUE_TYPE',
})

const createRequest = (key: string, options: Record<string, unknown>) => ({
  configType: 1,
  key,
  projectId: '124',
  sendToClientSdk: false,
  valueType: 2,
  ...options,
})

const conflictResponse = {
  _embedded: {
    errors: [{message: 'key `already.in.use` is already in use. Pass existing config id to overwrite'}],
  },
  _links: {self: {href: '/api/v1/config/', templated: false}},
  message: 'Conflict',
}

const successResponse = {
  message: '',
  newId: '17000801114938347',
}

const cannedResponses: CannedResponses = {
  'https://api.staging-prefab.cloud/api/v1/config/': [
    [createFlagRequest('brand.new.flag'), successResponse, 200],
    [createFlagRequest('already.in.use'), conflictResponse, 409],
    [createFlagRequest('new.with.different.default', true), conflictResponse, 200],
    [
      createRequest('brand.new.string', {
        rows: [{properties: {}, values: [{criteria: [], value: {string: 'hello.world'}}]}],
      }),
      successResponse,
      200,
    ],
    [
      createRequest('brand.new.int', {
        configType: 1,
        key: 'brand.new.int',
        projectId: '124',
        rows: [{properties: {}, values: [{criteria: [], value: {int: 123}}]}],
        valueType: 1,
      }),
      successResponse,
      200,
    ],
    [
      createRequest('brand.new.double', {
        configType: 1,
        key: 'brand.new.double',
        projectId: '124',
        rows: [{properties: {}, values: [{criteria: [], value: {double: 123.99}}]}],
        valueType: 4,
      }),
      successResponse,
      200,
    ],
    [
      createRequest('brand.new.boolean', {
        configType: 1,
        key: 'brand.new.boolean',
        projectId: '124',
        rows: [{properties: {}, values: [{criteria: [], value: {bool: false}}]}],
        valueType: 5,
      }),
      successResponse,
      200,
    ],
    [
      createRequest('brand.new.string-list', {
        configType: 1,
        key: 'brand.new.string-list',
        projectId: '124',
        rows: [{properties: {}, values: [{criteria: [], value: {stringList: {values: ['a', 'b', 'c', 'd']}}}]}],
        valueType: 10,
      }),
      successResponse,
      200,
    ],
    [
      createRequest('confidential.new.string', {
        rows: [{properties: {}, values: [{criteria: [], value: {confidential: true, string: 'hello.world'}}]}],
      }),
      successResponse,
      200,
    ],
    [
      createRequest('int.from.env', {
        rows: [{properties: {}, values: [{criteria: [], value: {provided: {lookup: 'MY_INT', source: 1}}}]}],
        valueType: 1,
      }),
      successResponse,
      200,
    ],
    [
      createRequest('greeting.from.env', {
        rows: [{properties: {}, values: [{criteria: [], value: {provided: {lookup: 'GREETING', source: 1}}}]}],
      }),
      successResponse,
      200,
    ],
    [
      createRequest('confidential.greeting.from.env', {
        rows: [
          {
            properties: {},
            values: [{criteria: [], value: {confidential: true, provided: {lookup: 'GREETING', source: 1}}}],
          },
        ],
      }),
      successResponse,
      200,
    ],
    [
      createRequest('brand.new.secret', {
        rows: [
          {
            properties: {},
            values: [
              {
                criteria: [],
                value: {
                  confidential: true,
                  decryptWith: 'prefab.secrets.encryption.key',
                  string: SECRET_VALUE,
                },
              },
            ],
          },
        ],
      }),
      successResponse,
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/missing.secret.key': [[{}, {}, 404]],

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

  'https://api.staging-prefab.cloud/api/v1/config-recipes/feature-flag/boolean': [
    [{defaultValue: false, key: 'brand.new.flag'}, recipeResponse('brand.new.flag'), 200],
    [{defaultValue: false, key: 'already.in.use'}, recipeResponse('already.in.use'), 200],
    [{defaultValue: true, key: 'new.with.different.default'}, recipeResponse('new.with.different.default', true), 200],
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
