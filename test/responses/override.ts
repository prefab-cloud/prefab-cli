import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {CannedResponses, getCannedResponse} from '../test-helper.js'

const cannedResponses: CannedResponses = {
  'https://api.staging-prefab.cloud/api/v1/config/assign-variant': [
    [
      {configKey: 'feature-flag.simple', variant: {bool: 'true'}},
      {response: {message: '', newId: '17002327855857830'}},
      200,
    ],
    [
      {configKey: 'my-double-key', variant: {double: '42.1'}},
      {response: {message: '', newId: '17002327855857830'}},
      200,
    ],
    [
      {configKey: 'my-string-list-key', variant: {stringList: {values: ['a', 'b', 'c', 'd']}}},
      {response: {message: '', newId: '17002327855857830'}},
      200,
    ],
    [
      {configKey: 'my-double-key', variant: {double: 'pumpkin'}},
      {
        _embedded: {
          errors: [
            {
              message:
                'Failed to convert argument [configVariantAssignmentRequest] for value [null] due to: Cannot deserialize value of type `long` from String "pumpkin": not a valid `long` value\n at [Source: UNKNOWN; byte offset: #UNKNOWN] (through reference chain: cloud.prefab.server.models.ConfigVariantAssignmentRequestDTO["variant"])',
              path: '/configVariantAssignmentRequest',
            },
          ],
        },
        _links: {self: {href: '/api/v1/config/assign-variant', templated: false}},
        message: 'Bad Request',
      },
      400,
    ],
  ],
  'https://api.staging-prefab.cloud/api/v1/config/remove-variant': [
    [
      {configKey: 'jeffreys.test.key', variant: {string: 'my.override'}},
      {message: '', newId: '17001604601640547'},
      200,
    ],
  ],
}

export const server = setupServer(
  http.get('https://api.staging-prefab.cloud/api/v1/configs/0', () => passthrough()),
  http.post('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),
)
