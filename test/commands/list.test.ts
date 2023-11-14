import {expect, test} from '@oclif/test'

const exampleFF = 'feature-flag.integer'
const exampleLL = 'log-level.prefab.views.index'
const exampleSegment = 'segment-with-and-conditions'
const exampleConfig = 'my-string-list-key'

describe('list', () => {
  test
    .stdout()
    .command(['list'])
    .it('lists everything by default', (ctx) => {
      const keys = ctx.stdout.split('\n')

      expect(keys).to.contain(exampleSegment)
      expect(keys).to.contain(exampleLL)
      expect(keys).to.contain(exampleFF)
      expect(keys).to.contain(exampleConfig)
    })

  test
    .stdout()
    .command(['list', '--feature-flags'])
    .it('lists only flags', (ctx) => {
      const keys = ctx.stdout.split('\n')

      expect(keys).to.contain(exampleFF)
      expect(keys).to.not.contain(exampleLL)
      expect(keys).to.not.contain(exampleSegment)
      expect(keys).to.not.contain(exampleConfig)
    })

  test
    .stdout()
    .command(['list', '--configs'])
    .it('lists only configs', (ctx) => {
      const keys = ctx.stdout.split('\n')

      expect(keys).to.not.contain(exampleFF)
      expect(keys).to.not.contain(exampleLL)
      expect(keys).to.not.contain(exampleSegment)
      expect(keys).to.contain(exampleConfig)
    })

  test
    .stdout()
    .command(['list', '--log-levels'])
    .it('lists only log levels', (ctx) => {
      const keys = ctx.stdout.split('\n')

      expect(keys).to.not.contain(exampleFF)
      expect(keys).to.contain(exampleLL)
      expect(keys).to.not.contain(exampleSegment)
      expect(keys).to.not.contain(exampleConfig)
    })

  test
    .stdout()
    .command(['list', '--segments'])
    .it('lists only segments', (ctx) => {
      const keys = ctx.stdout.split('\n')

      expect(keys).to.not.contain(exampleFF)
      expect(keys).to.not.contain(exampleLL)
      expect(keys).to.contain(exampleSegment)
      expect(keys).to.not.contain(exampleConfig)
    })

  test
    .stdout()
    .command(['list', '--feature-flags', '--configs'])
    .it('lists multiple types', (ctx) => {
      const keys = ctx.stdout.split('\n')

      expect(keys).to.contain(exampleFF)
      expect(keys).to.not.contain(exampleLL)
      expect(keys).to.not.contain(exampleSegment)
      expect(keys).to.contain(exampleConfig)
    })

  test
    .stderr()
    .command(['list', '--api-key='])
    .exit(401)
    .it('exits with error the api key is invalid', (ctx) => {
      expect(ctx.stderr).to.contain('Error: API key is required')
    })
})
