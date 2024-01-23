import {expect, test} from '@oclif/test'

import {
  confidentialKey,
  keyWithEvaluations,
  keyWithNoEvaluations,
  rawSecret,
  secretKey,
  server,
} from '../responses/info.js'

const keyDoesNotExist = 'this.does.not.exist'

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
https://app.staging-prefab.cloud/account/projects/124/configs/${keyWithEvaluations}

- Default: a,b,c
- jeffrey: [inherit]
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
          [keyWithEvaluations]: {
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
            url: `https://app.staging-prefab.cloud/account/projects/124/configs/${keyWithEvaluations}`,
            values: {
              Default: {
                url: 'https://app.staging-prefab.cloud/account/projects/124/configs/my-string-list-key?environment=undefined',
                value: ['a', 'b', 'c'],
              },
              Production: {
                url: 'https://app.staging-prefab.cloud/account/projects/124/configs/my-string-list-key?environment=143',
              },
              jeffrey: {
                url: 'https://app.staging-prefab.cloud/account/projects/124/configs/my-string-list-key?environment=588',
              },
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
https://app.staging-prefab.cloud/account/projects/124/configs/${keyWithNoEvaluations}

- Default: abc
- jeffrey: [see rules] https://app.staging-prefab.cloud/account/projects/124/configs/jeffreys.test.key?environment=588
- Production: [override] \`my.override\` https://app.staging-prefab.cloud/account/projects/124/configs/jeffreys.test.key?environment=143

No evaluations in the past 24 hours
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
              error: `No evaluations in the past 24 hours`,
            },

            url: `https://app.staging-prefab.cloud/account/projects/124/configs/${keyWithNoEvaluations}`,

            values: {
              Default: {
                url: 'https://app.staging-prefab.cloud/account/projects/124/configs/jeffreys.test.key?environment=undefined',
                value: 'abc',
              },
              Production: {
                override: 'my.override',
                url: 'https://app.staging-prefab.cloud/account/projects/124/configs/jeffreys.test.key?environment=143',
                value: '[see rules]',
              },

              jeffrey: {
                url: 'https://app.staging-prefab.cloud/account/projects/124/configs/jeffreys.test.key?environment=588',
                value: '[see rules]',
              },
            },
          },
        })
      })

    test
      .stdout()
      .command(['info', secretKey])
      .it('decrypts a secret', (ctx) => {
        expect(ctx.stdout).not.contains(rawSecret)
        expect(ctx.stdout).contains('Default: [encrypted]')
      })

    test
      .stdout()
      .command(['info', confidentialKey])
      .it('shows [confidential] for confidential items', (ctx) => {
        expect(ctx.stdout).not.contains(rawSecret)
        expect(ctx.stdout).contains('Default: [confidential]')
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
