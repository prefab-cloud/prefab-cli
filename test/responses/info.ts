import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {CannedResponses, getCannedResponse} from '../test-helper.js'

export const keyWithEvaluations = 'my-string-list-key'
export const keyWithNoEvaluations = 'jeffreys.test.key'
export const secretKey = 'a.secret.config'
export const confidentialKey = 'a.confidential.config'

const noEvaluationsResponse = (key: string) => ({end: 1_700_059_396_635, key, start: 1_699_972_996_635, total: 0})

export const rawSecret = `875247386844c18c58a97c--b307b97a8288ac9da3ce0cf2--7ab0c32e044869e355586ed653a435de`

const rawConfigResponseForKeyWithEvaluations = {
  changedBy: {apiKeyId: '', email: 'jeffrey.chupp@prefab.cloud', userId: '0'},
  configType: 'CONFIG',
  key: keyWithEvaluations,
  projectId: '124',
  rows: [{values: [{value: {stringList: {values: ['a', 'b', 'c']}}}]}],
  valueType: 'STRING',
}

const rawSecretConfigResponse = {
  changedBy: {apiKeyId: '315', email: '', userId: '4'},
  configType: 'CONFIG',
  draftId: '539',
  id: '17017173800583163',
  key: secretKey,
  projectId: '124',
  rows: [{values: [{value: {decryptWith: 'prefab.secrets.encryption.key', string: rawSecret}}]}],
  valueType: 'STRING',
}

const rawConfidentialConfigResponse = {
  changedBy: {apiKeyId: '315', email: '', userId: '4'},
  configType: 'CONFIG',
  draftId: '539',
  id: '17017173800583163',
  key: confidentialKey,
  projectId: '124',
  rows: [{values: [{value: {confidential: true, string: 'hello world'}}]}],
  valueType: 'STRING',
}

const rawEvaluationResponse = {
  end: 1_700_061_992_151,
  environments: {
    '2': {counts: [{configValue: {bool: false}, count: 7}], name: 'Development', total: 7},
    '3': {counts: [{configValue: {bool: true}, count: 17_138}], name: 'Staging', total: 17_138},
    '4': {
      counts: [
        {configValue: {bool: false}, count: 11_473},
        {configValue: {bool: true}, count: 23_316},
      ],
      name: 'Production',
      total: 34_789,
    },
  },
  key: keyWithEvaluations,
  start: 1_699_975_592_151,
  total: 51_934,
}

const rawConfigResponseForKeyWithNoEvaluations = {
  changedBy: {apiKeyId: '', email: 'jeffrey.chupp@prefab.cloud', userId: '0'},
  configType: 'CONFIG',
  key: 'jeffreys.test.key',
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
              valueToMatch: {stringList: {values: ['4']}},
            },
          ],
          value: {string: 'my.override'},
        },
      ],
    },
    {values: [{value: {string: 'abc'}}]},
    {
      projectEnvId: '588',
      values: [
        {
          criteria: [
            {operator: 'PROP_IS_ONE_OF', propertyName: 'user.key', valueToMatch: {stringList: {values: ['abc']}}},
          ],
          value: {string: 'test'},
        },
        {value: {string: 'default'}},
      ],
    },
  ],
  valueType: 'STRING',
}

const environmentResponse = {
  envs: [
    {id: 588, name: 'jeffrey'},
    {id: 143, name: 'Production'},
  ],
  projectId: 124,
}

const cannedResponses: CannedResponses = {
  [`https://api.staging-prefab.cloud/api/v1/config/key/${confidentialKey}`]: [[{}, rawConfidentialConfigResponse, 200]],
  [`https://api.staging-prefab.cloud/api/v1/config/key/${keyWithEvaluations}`]: [
    [{}, rawConfigResponseForKeyWithEvaluations, 200],
  ],
  [`https://api.staging-prefab.cloud/api/v1/config/key/${keyWithNoEvaluations}`]: [
    [{}, rawConfigResponseForKeyWithNoEvaluations, 200],
  ],
  [`https://api.staging-prefab.cloud/api/v1/config/key/${secretKey}`]: [[{}, rawSecretConfigResponse, 200]],
  [`https://api.staging-prefab.cloud/api/v1/evaluation-stats/${confidentialKey}`]: [
    [{}, rawConfigResponseForKeyWithNoEvaluations, 200],
  ],
  [`https://api.staging-prefab.cloud/api/v1/evaluation-stats/${keyWithEvaluations}`]: [
    [{}, rawEvaluationResponse, 200],
  ],
  [`https://api.staging-prefab.cloud/api/v1/evaluation-stats/${keyWithNoEvaluations}`]: [
    [{}, noEvaluationsResponse(keyWithNoEvaluations), 200],
  ],
  [`https://api.staging-prefab.cloud/api/v1/evaluation-stats/${secretKey}`]: [
    [{}, noEvaluationsResponse(keyWithNoEvaluations), 200],
  ],
  'https://api.staging-prefab.cloud/api/v1/project-environments': [[{}, environmentResponse, 200]],
}

export const server = setupServer(
  http.get('https://api.staging-prefab.cloud/api/v1/configs/0', () => passthrough()),
  http.get('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),
)
