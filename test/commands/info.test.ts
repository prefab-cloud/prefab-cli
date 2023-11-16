import {expect, test} from '@oclif/test'
import {HttpResponse, http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

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
  key: 'ex.pricing-homepage',
  start: 1_699_975_592_151,
  total: 51_934,
}

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.get('https://api.staging-prefab.cloud/api/v1/evaluation-stats/my-string-list-key', () =>
    HttpResponse.json(rawEvaluationResponse),
  ),

  http.get('https://api.staging-prefab.cloud/api/v1/evaluation-stats/hatcat', () =>
    HttpResponse.json({end: 1_700_059_396_635, key: 'hatcat', start: 1_699_972_996_635, total: 0}),
  ),
)

const validKey = 'my-string-list-key'

describe('info', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  test
    .stdout()
    .command(['info', validKey])
    .it('returns info for a name with evaluations', (ctx) => {
      expect(ctx.stdout.trim()).to.eql(
        `
Evaluations over the last 24 hours:

Production: 34,789
- 33% - false
- 67% - true

Staging: 17,138
- 100% - true

Development: 7
- 100% - false
`.trim(),
      )
    })

  test
    .stdout()
    .command(['info', validKey, '--json'])
    .it('returns JSON for a name with evaluations', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal({
        'my-string-list-key': {
          end: 1_700_061_992_151,
          environments: [
            {
              counts: [
                {configValue: {bool: false}, count: 11_473},
                {configValue: {bool: true}, count: 23_316},
              ],
              envId: '4',
              name: 'Production',
              total: 34_789,
            },
            {counts: [{configValue: {bool: true}, count: 17_138}], envId: '3', name: 'Staging', total: 17_138},
            {counts: [{configValue: {bool: false}, count: 7}], envId: '2', name: 'Development', total: 7},
          ],
          start: 1_699_975_592_151,
          total: 51_934,
        },
      })
    })

  test
    .command(['info', 'hatcat'])
    .catch((error) => {
      expect(error.message).to.eql('No evaluations found for hatcat in the past 24 hours')
    })
    .it('returns a message if no evaluations exist in the last 24 hours')

  test
    .stdout()
    .command(['info', 'hatcat', '--json'])
    .it('returns JSON if no evaluations exist in the last 24 hours', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.eql({
        error: 'No evaluations found for hatcat in the past 24 hours',
      })
    })

  test
    .command(['info', validKey, '--api-key='])
    .exit(401)
    .catch((error) => {
      expect(error.message).to.eql('Error: API key is required')
    })
})
