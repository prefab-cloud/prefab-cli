import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {CannedResponses, getCannedResponse} from '../test-helper.js'

const cannedResponses: CannedResponses = {
  'https://api.staging-prefab.cloud/api/v1/config/': [
    // New schema creation success case
    [
      {
        configType: 7,
        key: 'new.schema',
        projectId: '124',
        rows: [
          {
            properties: {},
            values: [
              {
                criteria: [],
                value: {
                  schema: {
                    schema: 'z.string()',
                    schemaType: 1,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        id: '17000801114938347',
      },
      200,
    ],

    // Existing schema case - returns 409
    [
      {
        configType: 7,
        key: 'existing.schema',
        projectId: '124',
        rows: [
          {
            properties: {},
            values: [
              {
                criteria: [],
                value: {
                  schema: {
                    schema: 'z.number()',
                    schemaType: 1,
                  },
                },
              },
            ],
          },
        ],
      },
      {
        _embedded: {
          errors: [
            {
              message: 'key `existing.schema` is already in use. Pass existing config id to overwrite',
            },
          ],
        },
        message: 'Conflict',
      },
      409,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/my.schema': [
    [
      {},
      {
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: 'z.object({url: z.string()})',
                  },
                },
              },
            ],
          },
        ],
      },
      200,
    ],
  ],

  'https://api.staging-prefab.cloud/api/v1/config/key/non.existent.schema': [[{}, {message: 'Not Found'}, 404]],

  'https://api.staging-prefab.cloud/api/v1/config/set-default/': [
    [
      {
        configKey: 'existing.schema',
        value: {
          schema: {
            schema: 'z.number()',
            schemaType: 1,
          },
        },
      },
      {
        id: '17000801114938347',
      },
      200,
    ],
  ],
}

export const server = setupServer(
  http.get('https://api.staging-prefab.cloud/api/v1/configs/0', () => passthrough()),

  http.get('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),

  http.post('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),
)
