import {expect, test} from '@oclif/test'

import {server} from '../responses/create.js'

describe('create', () => {
  before(() => server.listen())
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  describe('type=boolean-flag', () => {
    test
      .stdout()
      .command(['create', 'brand.new.flag', '--type=boolean-flag'])
      .it('can create a boolean flag', (ctx) => {
        expect(ctx.stdout).to.contain(`Created boolean flag: brand.new.flag`)
      })

    test
      .stdout()
      .command(['create', 'brand.new.flag', '--type=boolean-flag', '--json'])
      .it('can create a boolean flag and return a JSON response', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          key: 'brand.new.flag',
          message: '',
          newId: '17000801114938347',
        })
      })

    test
      .stdout()
      .command(['create', 'new.with.different.default', '--type=boolean-flag', '--value=true'])
      .it('can create a boolean flag with a true default', (ctx) => {
        expect(ctx.stdout).to.contain(`Created boolean flag: new.with.different.default`)
      })

    test
      .command(['create', 'already.in.use', '--type=boolean-flag'])
      .catch((error) => {
        expect(error.message).to.contain(`Failed to create boolean flag: already.in.use already exists`)
      })
      .it('returns an error if the flag exists')

    test
      .command(['create', 'brand.new.flag', '--type=boolean-flag', '--value=cake', '--verbose'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for boolean: cake`)
      })
      .it('returns an error if the value is not a boolean')

    test
      .stdout()
      .command(['create', 'already.in.use', '--type=boolean-flag', '--json'])
      .it('returns a JSON error if the flag exists', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({
          error: {
            key: 'already.in.use',
            phase: 'creation',
            serverError: {
              _embedded: {
                errors: [{message: 'key `already.in.use` is already in use. Pass existing config id to overwrite'}],
              },
              _links: {self: {href: '/api/v1/config/', templated: false}},
              message: 'Conflict',
            },
          },
        })
      })
  })

  describe('type=string', () => {
    test
      .stdout()
      .command(['create', 'brand.new.string', '--type=string', '--value=hello.world'])
      .it('can create a string', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.string`)
      })

    test
      .stdout()
      .command(['create', 'confidential.new.string', '--type=string', '--value=hello.world', '--confidential'])
      .it('can create a string', (ctx) => {
        expect(ctx.stdout).to.contain(`Created (confidential) config: confidential.new.string`)
      })

    test
      .stdout()
      .command(['create', 'greeting.from.env', '--type=string', '--env-var=GREETING'])
      .it('can create a string provided by an env var', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: greeting.from.env`)
      })

    test
      .stdout()
      .command(['create', 'confidential.greeting.from.env', '--type=string', '--env-var=GREETING', '--confidential'])
      .it('can create a confidential string provided by an env var', (ctx) => {
        expect(ctx.stdout).to.contain(`Created (confidential) config: confidential.greeting.from.env`)
      })

    test
      .stderr()
      .command(['create', 'greeting.from.env', '--type=string', '--env-var=GREETING', '--value=hello.world'])
      .catch((error) => {
        expect(error.message).to.contain(`cannot specify both --env-var and --value`)
      })
      .it('shows an error when provided a default and an env-var')
  })

  describe('type=int', () => {
    test
      .stdout()
      .command(['create', 'brand.new.int', '--type=int', '--value=123'])
      .it('can create an int', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.int`)
      })

    test
      .command(['create', 'brand.new.int', '--type=int', '--value=hat'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for int: hat`)
      })
      .it('returns an error if the value is not an int')
  })

  describe('type=double', () => {
    test
      .stdout()
      .command(['create', 'brand.new.double', '--type=double', '--value=123.99'])
      .it('can create a double', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.double`)
      })

    test
      .command(['create', 'brand.new.double', '--type=double', '--value=hat'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for double: hat`)
      })
      .it('returns an error if the value is not a double')
  })

  describe('type=boolean', () => {
    test
      .stdout()
      .command(['create', 'brand.new.boolean', '--type=boolean', '--value=f'])
      .it('can create a boolean', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.boolean`)
      })

    test
      .command(['create', 'brand.new.boolean', '--type=boolean', '--value=hat'])
      .catch((error) => {
        expect(error.message).to.contain(`Invalid default value for boolean: hat`)
      })
      .it('returns an error if the value is not a boolean')
  })

  describe('type=string-list', () => {
    test
      .stdout()
      .command(['create', 'brand.new.string-list', '--type=string-list', '--value=a,b,c,d'])
      .it('can create a string list', (ctx) => {
        expect(ctx.stdout).to.contain(`Created config: brand.new.string-list`)
      })
  })

  describe('secret', () => {
    describe('when no encryption key can be found', () => {
      test
        .command([
          'create',
          'brand.new.string',
          '--type=string',
          '--value=hello.world',
          '--secret',
          '--secret-key-name=missing.secret.key',
        ])
        .catch((error) => {
          expect(error.message).to.contain(`Failed to create secret: missing.secret.key not found`)
        })
        .it('complains about the missing key')
    })

    describe('type=string', () => {
      test
        .stdout()
        .command(['create', 'brand.new.secret', '--type=string', '--value=hello.world', '--secret'])
        .it('can create a string', (ctx) => {
          expect(ctx.stdout).to.contain(`Created config: brand.new.secret`)
        })
    })

    describe('type=NOT_STRING', () => {
      test
        .stderr()
        .command(['create', 'brand.new.secret', '--type=int', '--value=12', '--secret'])
        .catch((error) => {
          expect(error.message).to.contain(`--secret flag only works with string type`)
        })
        .it('errors')
    })
  })
})
