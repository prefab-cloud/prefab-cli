import {expect, test} from '@oclif/test'
import {HttpResponse, http, passthrough} from 'msw'
import {setupServer} from 'msw/node'

const keyWithEvaluations = 'my-string-list-key'
const keyWithNoEvaluations = 'my-test-key'
const keyDoesNotExist = 'this.does.not.exist'

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
  key: keyWithEvaluations,
  start: 1_699_975_592_151,
  total: 51_934,
}

const server = setupServer(
  http.get('https://api-staging-prefab-cloud.global.ssl.fastly.net/api/v1/configs/0', () => passthrough()),

  http.get(`https://api.staging-prefab.cloud/api/v1/evaluation-stats/${keyWithEvaluations}`, () =>
    HttpResponse.json(rawEvaluationResponse),
  ),

  http.get(`https://api.staging-prefab.cloud/api/v1/evaluation-stats/${keyWithNoEvaluations}`, () =>
    HttpResponse.json({end: 1_700_059_396_635, key: keyWithNoEvaluations, start: 1_699_972_996_635, total: 0}),
  ),
)

describe('info', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  describe('when there are evaluations in the last 24 hours', () => {
    test
      .stdout()
      .command(['info', keyWithEvaluations])
      .it('returns info for a name', (ctx) => {
        expect(ctx.stdout.trim()).to.eql(
          `
https://app.staging-prefab.cloud/account/projects/124/configs/my-string-list-key

- Default: a,b,c
- Production: [inherit]

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
      .command(['info', keyWithEvaluations, '--json'])
      .it('returns JSON for a name', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          'my-string-list-key': {
            evaluations: {
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
            url: 'https://app.staging-prefab.cloud/account/projects/124/configs/my-string-list-key',
            values: {
              Default: ['a', 'b', 'c'],
            },
          },
        })
      })
  })

  describe('when there are no evaluations in the last 24 hours', () => {
    test
      .stdout()
      .command(['info', keyWithNoEvaluations])
      .it('returns a message', (ctx) => {
        expect(ctx.stdout.trim()).to.eql(
          `
https://app.staging-prefab.cloud/account/projects/124/configs/my-test-key

- Production: [see rules](https://app.staging-prefab.cloud/account/projects/124/configs/my-test-key?environment=143)

No evaluations found for my-test-key in the past 24 hours
`.trim(),
        )
      })

    test
      .stdout()
      .command(['info', keyWithNoEvaluations, '--json'])
      .it('returns JSON', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          [keyWithNoEvaluations]: {
            evaluations: {
              error: `No evaluations found for ${keyWithNoEvaluations} in the past 24 hours`,
            },

            url: 'https://app.staging-prefab.cloud/account/projects/124/configs/my-test-key',

            values: {Production: '[see rules]'},
          },
        })
      })
  })

  describe('when the key does not exist', () => {
    test
      .command(['info', keyDoesNotExist])
      .catch((error) => {
        expect(error.message).to.contain(`Key ${keyDoesNotExist} not found`)
      })
      .it('returns a message')

    test
      .stdout()
      .command(['info', keyDoesNotExist, '--json'])
      .it('returns a JSON error', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          error: `Key ${keyDoesNotExist} not found`,
        })
      })
  })
})
