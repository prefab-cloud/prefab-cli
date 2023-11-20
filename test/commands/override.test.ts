import {expect, test} from '@oclif/test'
import {HttpResponse, http, passthrough} from 'msw'
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
}

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.post('https://api.staging-prefab.cloud/api/v1/config/assign-variant', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),

  http.post('https://api.staging-prefab.cloud/api/v1/config/remove-variant', async () =>
    HttpResponse.json({message: '', newId: '17001604601640547'}),
  ),
)

describe('override', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  test
    .stdout()
    .command(['override', 'feature-flag.simple', '--value=true'])
    .it('overrides a boolean flag when given a valid key and value', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stdout()
    .command(['override', 'my-double-key', '--value=42.1'])
    .it('overrides a double config when given a valid key and value', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stdout()
    .command(['override', 'my-string-list-key', '--value=a,b,c,d'])
    .it('overrides a string list config when given a valid key and value', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stderr()
    .command(['override', 'my-double-key', '--value=pumpkin'])
    .catch((error) => {
      expect(error.message).to.contain(`Failed to override value: 400 -- is pumpkin a valid double?`)
    })
    .it('shows an error when the value type is wrong')

  test
    .stderr()
    .command(['override', 'this.does.not.exist', '--value=true'])
    .catch((error) => {
      expect(error.message).to.contain(`Could not find config named this.does.not.exist`)
    })
    .it('shows an error when the key does not exist')

  test
    .command(['override', 'this.does.not.exist', '--value=true', '--remove'])
    .catch((error) => {
      expect(error.message).to.contain(`remove and value flags are mutually exclusive`)
    })
    .it('shows an error when given remove and a value')

  test
    .stdout()
    .command(['override', 'jeffreys.test.key', '--remove'])
    .it('removes an override successfully', (ctx) => {
      expect(ctx.stdout).to.contain(`Override removed`)
    })

  test
    .stdout()
    .command(['override', 'my-double-key', '--remove'])
    .it('succeeds when trying to remove an override that does not exist', (ctx) => {
      expect(ctx.stdout).to.contain(`No override found for my-double-key`)
    })
})
