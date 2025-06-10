import {expect, test} from '@oclif/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('generate', () => {
  const fixturePath = path.join(__dirname, '..', 'fixtures')
  const outputPath = path.join(fixturePath, 'output.ts')

  afterEach(() => {
    // Clean up the output file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath)
    }
  })

  test
    .stdout()
    .command(['generate'])
    .it('runs generate without flags', (ctx) => {
      // Updated to match the new default behavior (node-ts is the default target)
      expect(ctx.stdout).to.include('Generating typescript code for configs')
    })

  test
    .stdout()
    .command(['generate', '--target', 'node-ts'])
    .it('generates TypeScript definitions', (ctx) => {
      expect(ctx.stdout).to.include('Generating typescript code for configs')
    })

  test
    .stdout()
    .command(['gen', '--target', 'node-ts'])
    .it('works with gen alias', (ctx) => {
      expect(ctx.stdout).to.include('Generating typescript code for configs')
    })

  test
    .stdout()
    .command(['generate', '--target', 'react-ts'])
    .it('generates React TypeScript definitions', (ctx) => {
      expect(ctx.stdout).to.include('Generating react code for configs')
    })

  test
    .stdout()
    .command(['generate', '--target', 'python-pydantic'])
    .it('generates Python code', (ctx) => {
      expect(ctx.stdout).to.include('Generating python code for configs')
    })

  test
    .stdout()
    .command(['generate', '--target', 'invalid'])
    .catch((error) => {
      expect(error.message).to.include('Expected --target=invalid to be one of:')
    })
    .it('handles invalid targets')

  // Add more tests for output file paths, etc. as needed
})
