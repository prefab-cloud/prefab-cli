import {expect, test} from '@oclif/test'

const validKey = 'my-string-list-key'
const secretKey = 'a.secret.config'

describe('get', () => {
  test
    .stdout()
    .command(['get', validKey])
    .it('returns a value for a valid name', (ctx) => {
      expect(ctx.stdout).to.eql("[ 'a', 'b', 'c' ]\n")
    })

  test
    .stdout()
    .command(['get', validKey, '--json'])
    .it('returns JSON for a value for a valid name', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.eql({[validKey]: ['a', 'b', 'c']})
    })

  test
    .stdout()
    .command(['get', secretKey])
    .it('decrypts a secret', (ctx) => {
      expect(ctx.stdout).to.eql('hello.world\n')
    })

  test
    .command(['get', 'this-does-not-exist'])
    .catch((error) => {
      expect(error.message).to.eql(`this-does-not-exist does not exist`)
    })
    .it('shows an error if the key is invalid')

  test
    .command(['get', '--no-interactive'])
    .catch((error) => {
      expect(error.message).to.eql("'name' argument is required when interactive mode isn't available.")
    })
    .it("shows an error if no key is provided when things aren't interactive")

  test
    .command(['get', validKey, '--api-key='])
    .catch((error) => {
      expect(error.message).to.eql('API key is required')
    })
    .it('returns an error when the API key is not set')
})
