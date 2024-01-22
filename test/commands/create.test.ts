import {expect, test} from '@oclif/test'
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

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.get('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),

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
      .command(['create', 'new.with.different.default', '--type=boolean-flag', '--value=true'])
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
      .command(['create', 'brand.new.flag', '--type=boolean-flag', '--value=cake', '--verbose'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for boolean: cake`)
      })
      .it('returns an error if the value is not a boolean')

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
      .command(['create', 'brand.new.string', '--type=string', '--value=hello.world'])
      .it('can create a string', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.string`)
      })

    test
      .stdout()
      .command(['create', 'confidential.new.string', '--type=string', '--value=hello.world', '--confidential'])
      .it('can create a string', (ctx) => {
        expect(ctx.stdout).to.contain(`Created (confidential) config: confidential.new.string`)
      })

    test
      .stdout()
      .command(['create', 'greeting.from.env', '--type=string', '--env-var=GREETING'])
      .it('can create a string provided by an env var', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: greeting.from.env`)
      })

    test
      .stdout()
      .command(['create', 'confidential.greeting.from.env', '--type=string', '--env-var=GREETING', '--confidential'])
      .it('can create a confidential string provided by an env var', (ctx) => {
        expect(ctx.stdout).to.contain(`Created (confidential) config: confidential.greeting.from.env`)
      })

    test
      .stderr()
      .command(['create', 'greeting.from.env', '--type=string', '--env-var=GREETING', '--value=hello.world'])
      .catch((error) => {
        expect(error.message).to.contain(`cannot specify both --env-var and --value`)
      })
      .it('shows an error when provided a default and an env-var')
  })

  describe('type=int', () => {
    test
      .stdout()
      .command(['create', 'brand.new.int', '--type=int', '--value=123'])
      .it('can create an int', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.int`)
      })

    test
      .command(['create', 'brand.new.int', '--type=int', '--value=hat'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for int: hat`)
      })
      .it('returns an error if the value is not an int')
  })

  describe('type=double', () => {
    test
      .stdout()
      .command(['create', 'brand.new.double', '--type=double', '--value=123.99'])
      .it('can create a double', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.double`)
      })

    test
      .command(['create', 'brand.new.double', '--type=double', '--value=hat'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for double: hat`)
      })
      .it('returns an error if the value is not a double')
  })

  describe('type=boolean', () => {
    test
      .stdout()
      .command(['create', 'brand.new.boolean', '--type=boolean', '--value=f'])
      .it('can create a boolean', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.boolean`)
      })

    test
      .command(['create', 'brand.new.boolean', '--type=boolean', '--value=hat'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for boolean: hat`)
      })
      .it('returns an error if the value is not a boolean')
  })

  describe('type=string-list', () => {
    test
      .stdout()
      .command(['create', 'brand.new.string-list', '--type=string-list', '--value=a,b,c,d'])
      .it('can create a string list', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.string-list`)
      })
  })

  describe('secret', () => {
    describe('when no encryption key can be found', () => {
      test
        .command([
          'create',
          'brand.new.string',
          '--type=string',
          '--value=hello.world',
          '--secret',
          '--secret-key-name=missing.secret.key',
        ])
        .catch((error) => {
          expect(error.message).to.contain(`Failed to create secret: missing.secret.key not found`)
        })
        .it('complains about the missing key')
    })

    describe('type=string', () => {
      test
        .stdout()
        .command(['create', 'brand.new.secret', '--type=string', '--value=hello.world', '--secret'])
        .it('can create a string', (ctx) => {
          expect(ctx.stdout).to.contain(`Created config: brand.new.secret`)
        })
    })

    describe('type=NOT_STRING', () => {
      test
        .stderr()
        .command(['create', 'brand.new.secret', '--type=int', '--value=12', '--secret'])
        .catch((error) => {
          expect(error.message).to.contain(`--secret flag only works with string type`)
        })
        .it('errors')
    })
  })
})
