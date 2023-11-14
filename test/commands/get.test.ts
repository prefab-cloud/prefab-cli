import {expect, test} from '@oclif/test'

const validKey = 'my-string-list-key'

describe('get', () => {
  test
    .stdout()
    .command(['get', validKey])
    .it('returns a value for a valid name', (ctx) => {
      expect(ctx.stdout).to.eql('a,b,c\n')
    })

  test
    .stderr()
    .command(['get', 'this-does-not-exist'])
    .it('shows an error if the key is invalid', (ctx) => {
      expect(ctx.stderr).to.contain('Error: Key not found: this-does-not-exist')
    })

  test
    .stderr()
    .command(['get', '--no-interactive'])
    .it("shows an error if no key is provided when things aren't interactive", (ctx) => {
      expect(ctx.stderr).to.contain("'name' argument is required")
    })

  test
    .stderr()
    .command(['get', validKey, '--api-key='])
    .exit(401)
    .it('exits with error the api key is invalid', (ctx) => {
      expect(ctx.stderr).to.contain('Error: API key is required')
    })
})
