import {expect, test} from '@oclif/test'
import {HttpResponse, http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

const assignResponses = {
  'feature-flag.simple': {
    true: [200, {message: '', newId: '17001604601640547'}],
  },
  'my-double-key': {
    '42.1': [200, {message: '', newId: '17001604601640547'}],
    pumpkin: [
      400,
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
    ],
  },
}

type AssignVariantRequestBody = {
  configKey: string
  variant: Record<string, unknown>
}

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.post('https://api.staging-prefab.cloud/api/v1/config/assign-variant', async ({request}) => {
    const {configKey, variant} = (await request.json()) as AssignVariantRequestBody
    const variantValue = Object.values(variant)[0]
    const [status, response] = assignResponses[configKey][variantValue]
    return HttpResponse.json(response, {status})
  }),

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
    .command(['override', 'feature-flag.simple', '--variant=true'])
    .it('overrides a boolean flag when given a valid key and variant', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stdout()
    .command(['override', 'my-double-key', '--variant=42.1'])
    .it('overrides a string list config when given a valid key and variant', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stdout()
    .skip()
    .command(['override', 'my-string-list-key', '--variant=a,b,c,d'])
    .it('overrides a string list config when given a valid key and variant', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stderr()
    .command(['override', 'my-double-key', '--variant=pumpkin'])
    .catch((error) => {
      expect(error.message).to.contain(`Failed to override variant: 400 -- is pumpkin a valid double?`)
    })
    .it('shows an error when the variant type is wrong')

  test
    .stderr()
    .command(['override', 'my-double-key'])
    .catch((error) => {
      expect(error.message).to.contain(`variant is required for non-flag items`)
    })
    .it('shows an error when the variant type is not provided for a flag')

  test
    .stderr()
    .command(['override', 'this.does.not.exist', '--variant=true'])
    .catch((error) => {
      expect(error.message).to.contain(`Could not find config named this.does.not.exist`)
    })
    .it('shows an error when the key does not exist')

  test
    .command(['override', 'this.does.not.exist', '--variant=true', '--remove'])
    .catch((error) => {
      expect(error.message).to.contain(`remove and variant flags are mutually exclusive`)
    })
    .it('shows an error when given remove and a variant')

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

  // it prompts for a variant when not given one for a boolean flag
  // it prompts for a key when not given one
})