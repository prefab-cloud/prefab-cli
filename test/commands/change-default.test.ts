import {expect, test} from '@oclif/test'
import {HttpResponse, http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

import {ANY, CannedResponses, getCannedResponse} from '../test-helper.js'

const cannedResponses: CannedResponses = {
  'https://api.staging-prefab.cloud/api/v1/config/set-default/': [
    [
      {
        configKey: 'feature-flag.simple',
        currentVersionId: ANY,
        environmentId: '5',
        value: {bool: 'true'},
      },
      {response: {message: '', newId: '17002327855857830'}},
      200,
    ],

    [
      {
        configKey: 'jeffreys.test.key',
        currentVersionId: ANY,
        environmentId: '6',
        value: {string: 'hello default world'},
      },

      {response: {message: '', newId: '17002327855857830'}},
      200,
    ],
  ],
}

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.get('https://api.staging-prefab.cloud/api/v1/project-environments', () =>
    HttpResponse.json({
      envs: [
        {id: 5, name: 'Development'},
        {id: 590, name: 'Another One Mark 2'},
        {id: 6, name: 'Staging'},
      ],
      projectId: 3,
    }),
  ),

  http.post('https://api.staging-prefab.cloud/api/v1/config/set-default/', async ({request}) =>
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
      .command(['change-default', 'feature-flag.simple', '--environment=Development', '--value=true'])
      .it('can change the default for a boolean flag', (ctx) => {
        expect(ctx.stdout).to.contain('Successfully changed default to `true`.')
      })

    test
      .stdout()
      .command(['change-default', 'feature-flag.simple', '--environment=Development', '--value=true', '--json'])
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
      .command(['change-default', 'jeffreys.test.key', '--environment=Staging', '--value=hello default world'])
      .it('can change the default for a string flag', (ctx) => {
        expect(ctx.stdout).to.contain('Successfully changed default to `hello default world`.')
      })

    test
      .stdout()
      .command([
        'change-default',
        'jeffreys.test.key',
        '--environment=Staging',
        '--value=hello default world',
        '--json',
      ])
      .it('can change the default for a string flag with json output', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          environment: {
            id: '6',
            name: 'Staging',
          },
          key: 'jeffreys.test.key',
          success: true,
          value: 'hello default world',
        })
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
  })
})
