import {expect, test} from '@oclif/test'
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

  'https://api.staging-prefab.cloud/api/v1/config/set-default/': [
    [
      {configKey: 'feature-flag.simple', currentVersionId: ANY, environmentId: '5', value: {bool: 'true'}},
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

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.get('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),

  http.post('https://api.staging-prefab.cloud/api/v1/*', async ({request}) =>
    getCannedResponse(request, cannedResponses).catch(console.error),
  ),
)

describe('change-default', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  describe('success', () => {
    test
      .stdout()
      .command(['change-default', 'feature-flag.simple', '--environment=Development', '--value=true', '--confirm'])
      .it('can change the default for a boolean flag', (ctx) => {
        expect(ctx.stdout).to.contain('Successfully changed default to `true`')
      })

    test
      .stdout()
      .command([
        'change-default',
        'feature-flag.simple',
        '--environment=Development',
        '--value=true',
        '--confirm',
        '--json',
      ])
      .it('can change the default for a boolean flag with json output', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          environment: {
            id: '5',
            name: 'Development',
          },
          key: 'feature-flag.simple',
          success: true,
          value: 'true',
        })
      })

    test
      .stdout()
      .command([
        'change-default',
        'jeffreys.test.key',
        '--environment=[default]',
        '--value=hello default world',
        '--confirm',
      ])
      .it('can change the default for a string flag', (ctx) => {
        expect(ctx.stdout).to.contain('Successfully changed default to `hello default world`')
      })

    test
      .stdout()
      .command([
        'change-default',
        'jeffreys.test.key',
        '--environment=[default]',
        '--confirm',
        '--value=hello default world',
        '--json',
      ])
      .it('can change the default for a string flag with json output', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          environment: {
            id: '',
            name: '[Default]',
          },
          key: 'jeffreys.test.key',
          success: true,
          value: 'hello default world',
        })
      })

    test
      .stdout()
      .command(['change-default', 'jeffreys.test.key', '--environment=Staging', '--confirm', '--env-var=GREETING'])
      .it('can create a string provided by an env var', (ctx) => {
        expect(ctx.stdout).to.contain(`Successfully changed default to be provided by \`GREETING\``)
      })

    test
      .stdout()
      .command([
        'change-default',
        'jeffreys.test.key',
        '--environment=Staging',
        '--confirm',
        '--secret',
        '--value=hello',
      ])
      .it('can create a secret string', (ctx) => {
        expect(ctx.stdout).to.contain(`Successfully changed default to \`hello\` (encrypted)`)
      })

    test
      .stdout()
      .command(['change-default', 'robocop-secret', '--environment=Staging', '--confirm', '--value=hello'])
      .it('uses encryption if any existing value for the key is encrypted', (ctx) => {
        expect(ctx.stdout).to.contain(`Successfully changed default to \`hello\` (encrypted)`)
      })
  })

  describe('failure', () => {
    test
      .stderr()
      .command(['change-default', 'this.does.not.exist', '--environment=Staging', '--value=hello default world'])
      .catch((error) => {
        expect(error.message).to.contain(`Could not find config named this.does.not.exist`)
      })
      .it('shows an error when the key does not exist')
  })

  describe('parsing errors', () => {
    test
      .command(['change-default', '--no-interactive'])
      .catch((error) => {
        expect(error.message).to.eql("'name' argument is required when interactive mode isn't available.")
      })
      .it("shows an error if no key is provided when things aren't interactive")

    test
      .command(['change-default', 'my.key.name', '--no-interactive'])
      .catch((error) => {
        expect(error.message).to.eql("'environment' is required when interactive mode isn't available.")
      })
      .it("shows an error if no environment is provided when things aren't interactive")

    test
      .stderr()
      .command([
        'change-default',
        'jeffreys.test.key',
        '--environment=Staging',
        '--confirm',
        '--env-var=GREETING',
        '--value=hello world',
      ])
      .catch((error) => {
        expect(error.message).to.contain(`cannot specify both --env-var and --value`)
      })
      .it('shows an error when provided a value and an env-var')
  })
})
