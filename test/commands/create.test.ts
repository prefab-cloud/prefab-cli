import {expect, test} from '@oclif/test'
import {http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {CannedResponses, getCannedResponse} from '../test-helper.js'

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
                  string(actual: string) {
                    const parts = actual.split('--')

                    if (parts.length !== 3) {
                      console.error('Expected 3 parts, got', parts)
                      return false
                    }

                    if (parts[0].length !== 22) {
                      console.error('Expected 22 chars, got', parts[0])
                      return false
                    }

                    if (parts[1].length !== 24) {
                      console.error('Expected 24 chars, got', parts[1])
                      return false
                    }

                    if (parts[2].length !== 32) {
                      console.error('Expected 32 chars, got', parts[2])
                      return false
                    }

                    return true
                  },
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

  'https://api.staging-prefab.cloud/api/v1/config-recipes/feature-flag/boolean': [
    [{defaultValue: false, key: 'brand.new.flag'}, recipeResponse('brand.new.flag'), 200],
    [{defaultValue: false, key: 'already.in.use'}, recipeResponse('already.in.use'), 200],
    [{defaultValue: true, key: 'new.with.different.default'}, recipeResponse('new.with.different.default', true), 200],
  ],
}

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),
  http.post('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),
)

describe('create', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  describe('type=boolean-flag', () => {
    test
      .stdout()
      .command(['create', 'brand.new.flag', '--type=boolean-flag'])
      .it('can create a boolean flag', (ctx) => {
        expect(ctx.stdout).to.contain(`Created boolean flag: brand.new.flag`)
      })

    test
      .stdout()
      .command(['create', 'brand.new.flag', '--type=boolean-flag', '--json'])
      .it('can create a boolean flag and return a JSON response', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          key: 'brand.new.flag',
          message: '',
          newId: '17000801114938347',
        })
      })

    test
      .stdout()
      .command(['create', 'new.with.different.default', '--type=boolean-flag', '--default=true'])
      .it('can create a boolean flag with a true default', (ctx) => {
        expect(ctx.stdout).to.contain(`Created boolean flag: new.with.different.default`)
      })

    test
      .command(['create', 'already.in.use', '--type=boolean-flag'])
      .catch((error) => {
        expect(error.message).to.contain(`Failed to create boolean flag: already.in.use already exists`)
      })
      .it('returns an error if the flag exists')

    test
      .stdout()
      .command(['create', 'already.in.use', '--type=boolean-flag', '--json'])
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
  })

  describe('type=string', () => {
    test
      .stdout()
      .command(['create', 'brand.new.string', '--type=string', '--default=hello.world'])
      .it('can create a string', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.string`)
      })
  })

  describe('secret', () => {
    describe('when no encryption key can be found', () => {
      test
        .command([
          'create',
          'brand.new.string',
          '--type=string',
          '--default=hello.world',
          '--secret',
          '--secret-key-name=missing.secret.key',
        ])
        .catch((error) => {
          expect(error.message).to.contain(`Failed to create secret flag: missing.secret.key not found`)
        })
        .it('complains about the missing key')
    })

    describe('type=string', () => {
      test
        .stdout()
        .command(['create', 'brand.new.secret', '--type=string', '--default=hello.world', '--secret'])
        .it('can create a string', (ctx) => {
          expect(ctx.stdout).to.contain(`Created config: brand.new.secret`)
        })
    })
  })
})
