import {expect, test} from '@oclif/test'
import {HttpResponse, http} from 'msw'
import {setupServer} from 'msw/node'

const recipeResponse = (key: string) => ({
  allowableValues: [{bool: true}, {bool: false}],
  changedBy: {apiKeyId: '315', email: '', userId: '4'},
  configType: 'FEATURE_FLAG',
  id: '0',
  key,
  projectId: '124',
  rows: [{projectEnvId: '143', values: [{value: {bool: false}}]}],
  valueType: 'NOT_SET_VALUE_TYPE',
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

const createResponses = {
  'already.in.use': [conflictResponse, 409],
  'brand.new.flag': [successResponse, 200],
}

type RecipeRequestBody = {
  key: string
}

type CreateRequestBody = {
  key: string
}

const server = setupServer(
  http.post('https://api.staging-prefab.cloud/api/v1/config-recipes/feature-flag/boolean', async ({request}) => {
    const {key} = (await request.json()) as RecipeRequestBody
    return HttpResponse.json(recipeResponse(key))
  }),

  http.post('https://api.staging-prefab.cloud/api/v1/config/', async ({request}) => {
    const {key} = (await request.json()) as CreateRequestBody
    const [response, status] = createResponses[key]
    return HttpResponse.json(response, {status})
  }),
)

describe('create', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  test
    .stdout()
    .command(['create', '--name=brand.new.flag', '--type=boolean-flag'])
    .it('can create a boolean flag', (ctx) => {
      expect(ctx.stdout).to.contain(`Prefab: Created boolean flag: brand.new.flag`)
    })

  test
    .stdout()
    .command(['create', '--name=brand.new.flag', '--type=boolean-flag', '--json'])
    .it('can create a boolean flag and return a JSON response', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal({
        key: 'brand.new.flag',
        message: '',
        newId: '17000801114938347',
      })
    })

  test
    .command(['create', '--name=already.in.use', '--type=boolean-flag'])
    .catch((error) => {
      expect(error.message).to.contain(`Prefab: Failed to create boolean flag: already.in.use already exists`)
    })
    .it('returns an error if the flag exists')

  test
    .stdout()
    .command(['create', '--name=already.in.use', '--type=boolean-flag', '--json'])
    .it('returns a JSON error if the flag exists', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal({
        error: {
          key: 'already.in.use',
          phase: 'creation',
          serverError: {
            _embedded: {
              errors: [{message: 'key `already.in.use` is already in use. Pass existing config id to overwrite'}],
            },
            _links: {self: {href: '/api/v1/config/', templated: false}},
            message: 'Conflict',
          },
        },
      })
    })

  test
    .command(['create', '--name=brand.new.flag', '--type=boolean-flag', '--api-key='])
    .exit(401)
    .catch((error) => {
      expect(error.message).to.eql('Error: API key is required')
    })
})
