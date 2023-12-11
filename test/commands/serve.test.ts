import {expect, test} from '@oclif/test'
import * as path from 'node:path'

import type {JsonObj} from '../../src/result.js'

const validJSONFile = path.resolve('./test/fixtures/example.data.file.json')
const doesNotExist = './this-does-not-exist.json'
const emptyJSONFile = path.resolve('./test/fixtures/empty.json.data.file.json')
const invalidJSONFile = path.resolve('./test/fixtures/invalid.data.file.json')

const mkContext = (json: JsonObj) => encodeURIComponent(Buffer.from(JSON.stringify(json)).toString('base64'))

describe('serve', () => {
  describe('success', () => {
    describe('when the context matches a rule', () => {
      test
        .stdout()
        .command(['serve', validJSONFile, '--port=3097'])
        .it('succeeds with a valid JSON file an uses the provided context to determine flag state', async (ctx) => {
          expect(ctx.stdout).to.contain('Server is listening on 3097')

          const context = mkContext({
            contexts: [
              {
                type: 'user',
                values: {key: {string: '5905ecd1-9bbf-4711-a663-4f713628a78c'}},
              },
            ],
          })

          const request = await fetch(`http://127.0.0.1:3097/configs/eval-with-context/${context}`)

          const response = await request.json()

          expect(response).to.deep.equal({
            values: {'flag.list.environments': {bool: true}, intprop: {int: 8}},
          })
        })
    })

    describe('when the context does not match a rule', () => {
      test
        .stdout()
        .command(['serve', validJSONFile, '--port=3098'])
        .it('succeeds with a valid JSON file an uses the provided context to determine flag state', async (ctx) => {
          expect(ctx.stdout).to.contain('Server is listening on 3098')

          const context = mkContext({
            contexts: [
              {
                type: 'user',
                values: {key: {string: 'this.does.not.match'}},
              },
            ],
          })

          const request = await fetch(`http://127.0.0.1:3098/configs/eval-with-context/${context}`)

          const response = await request.json()

          expect(response).to.deep.equal({
            values: {'flag.list.environments': {bool: false}, intprop: {int: 8}},
          })
        })
    })
    // Success with context that doesn't match
    // Success with context that does match
  })

  describe('file issues', () => {
    test
      .stderr()
      .command(['serve', doesNotExist])
      .catch((error) => {
        expect(error.message).to.contain(`File not found: ${doesNotExist}`)
      })
      .it('shows an error when the file does not exist')

    test
      .stderr()
      .command(['serve', emptyJSONFile])
      .catch((error) => {
        expect(error.message).to.contain(`No projectEnvId found in config`)
        expect(error.message).to.contain(
          `Your download file seems invalid or corrupt. Please redownload your datafile.`,
        )
      })
      .it('shows an error when the file is invalid')

    test
      .stderr()
      .command(['serve', invalidJSONFile])
      .catch((error) => {
        expect(error.message).to.contain(`Unexpected end of JSON input`)
        expect(error.message).to.contain(
          `Your download file seems invalid or corrupt. Please redownload your datafile.`,
        )
      })
      .it('shows an error when the file is invalid')
  })
})
