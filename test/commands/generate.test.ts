import { expect, test } from '@oclif/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

describe('generate', () => {
  // Clean up test output file after tests
  const testOutputPath = 'src/prefab/test-prefab.ts'
  afterEach(async () => {
    try {
      await fs.promises.unlink(testOutputPath)
      await fs.promises.rmdir(path.dirname(testOutputPath))
    } catch {
      // Ignore errors if files don't exist
    }
  })

  test
    .stdout()
    .command(['generate'])
    .it('runs generate without flags', ctx => {
      expect(ctx.stdout).to.contain('use --typescript to generate TypeScript definitions')
    })

  test
    .stdout()
    .command(['generate', '--typescript', '--output-file', testOutputPath])
    .it('generates TypeScript definitions', async ctx => {
      expect(ctx.stdout).to.contain(`Generated TypeScript definitions at ${testOutputPath}`)

      // Verify file was created
      const fileExists = await fs.promises.access(testOutputPath)
        .then(() => true)
        .catch(() => false)
      expect(fileExists).to.be.true

      // Verify file contains expected content
      const content = await fs.promises.readFile(testOutputPath, 'utf8')
      expect(content).to.include('import { z } from "zod"')
    })

  test
    .stdout()
    .command(['gen', '--typescript', '--output-file', testOutputPath])
    .it('works with gen alias', ctx => {
      expect(ctx.stdout).to.contain(`Generated TypeScript definitions at ${testOutputPath}`)
    })

})
