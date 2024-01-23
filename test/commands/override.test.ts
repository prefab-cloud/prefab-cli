import {expect, test} from '@oclif/test'

import {server} from '../responses/override.js'

describe('override', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  test
    .stdout()
    .command(['override', 'feature-flag.simple', '--value=true'])
    .it('overrides a boolean flag when given a valid key and value', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stdout()
    .command(['override', 'my-double-key', '--value=42.1'])
    .it('overrides a double config when given a valid key and value', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stdout()
    .command(['override', 'my-string-list-key', '--value=a,b,c,d'])
    .it('overrides a string list config when given a valid key and value', (ctx) => {
      expect(ctx.stdout).to.contain(`Override set`)
    })

  test
    .stderr()
    .command(['override', 'my-double-key', '--value=pumpkin'])
    .catch((error) => {
      expect(error.message).to.contain(`Failed to override value: 400 -- is pumpkin a valid double?`)
    })
    .it('shows an error when the value type is wrong')

  test
    .stderr()
    .command(['override', 'this.does.not.exist', '--value=true'])
    .catch((error) => {
      expect(error.message).to.contain(`Could not find config named this.does.not.exist`)
    })
    .it('shows an error when the key does not exist')

  test
    .command(['override', 'this.does.not.exist', '--value=true', '--remove'])
    .catch((error) => {
      expect(error.message).to.contain(`remove and value flags are mutually exclusive`)
    })
    .it('shows an error when given remove and a value')

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
})
