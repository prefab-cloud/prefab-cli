import {expect, test} from '@oclif/test'

const validKey = 'my-string-list-key'

describe('get', () => {
  test
    .stdout()
    .command(['get', validKey])
    .it('returns a value for a valid name', (ctx) => {
      expect(ctx.stdout).to.eql("[ 'a', 'b', 'c' ]\n")
    })

  test
    .command(['get', 'this-does-not-exist'])
    .catch((error) => {
      expect(error.message).to.eql('Error: Key not found: this-does-not-exist')
    })
    .it('shows an error if the key is invalid')

  test
    .command(['get', '--no-interactive'])
    .catch((error) => {
      expect(error.message).to.eql("Error: 'name' argument is required when interactive mode isn't available.")
    })
    .it("shows an error if no key is provided when things aren't interactive")

  test
    .command(['get', validKey, '--api-key='])
    .exit(401)
    .catch((error) => {
      expect(error.message).to.eql('Error: API key is required')
    })
})
