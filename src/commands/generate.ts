import {Flags} from '@oclif/core'
import * as fs from 'node:fs'
import * as path from 'node:path'

import type {JsonObj} from '../result.js'

import {ConfigDownloader} from '../codegen/config-downloader.js'
import {SupportedLanguage, ZodGenerator} from '../codegen/zod-generator.js'
import {APICommand} from '../index.js'

export default class Generate extends APICommand {
  static aliases = ['gen']

  static description = 'Generate type definitions for your Prefab configuration'

  static examples = [
    '<%= config.bin %> <%= command.id %> --target node-ts',
    '<%= config.bin %> <%= command.id %> --target react-ts --output-dir custom/path',
    '<%= config.bin %> <%= command.id %> --target python',
  ]

  static flags = {
    'output-dir': Flags.string({
      default: 'generated-sources',
      description: 'output directory for generated code',
    }),
    target: Flags.string({
      default: 'node-ts',
      description: 'language/framework to generate code for',
      options: ['node-ts', 'react-ts', 'python-pydantic', 'ruby'],
    }),
  }

  public async run(): Promise<JsonObj | void> {
    const {flags} = await this.parse(Generate)

    this.verboseLog('=== GENERATE COMMAND START ===')
    this.verboseLog('API Key:', this.rawApiClient ? 'Set (hidden)' : 'Not set')
    this.verboseLog('Environment:', this.currentEnvironment)
    this.verboseLog('Base API URL:', process.env.PREFAB_API_URL || 'Default')
    this.verboseLog('Language:', flags.target)
    this.verboseLog('Output directory:', flags['output-dir'])

    // Get the target from the flag, using lowercase to ensure consistency
    const langInput = flags.target?.toLowerCase()

    // Map the input string to the appropriate enum value
    let language: SupportedLanguage

    switch (langInput) {
      case 'python-pydantic': {
        language = SupportedLanguage.Python

        break
      }

      case 'react-ts': {
        language = SupportedLanguage.React

        break
      }

      case 'node-ts': {
        language = SupportedLanguage.TypeScript

        break
      }

      case 'ruby': {
        language = SupportedLanguage.Ruby

        break
      }

      default: {
        throw new Error(`Unsupported target: ${langInput}`)
      }
    }

    // Download the configuration using the APICommand's client
    const downloader = new ConfigDownloader(this)
    try {
      this.verboseLog('Downloading config...')
      const configFile = await downloader.downloadConfig()
      this.verboseLog('Config download complete.')

      this.verboseLog('Creating generator...')
      const generator = new ZodGenerator(configFile, this.verboseLog.bind(this))
      console.log(`Generating ${flags.target} code for configs...`)

      // Determine the class name based on the language
      const className = language === SupportedLanguage.Python ? 'PrefabTypedClient' : undefined

      const generatedCode = generator.generate(language, className)
      this.verboseLog('Code generation complete. Size:', generatedCode.length)

      // Set filename based on language
      const filename =
        language === SupportedLanguage.Python
          ? 'prefab.py'
          : language === SupportedLanguage.Ruby
          ? 'prefab.rb'
          : 'prefab.ts'
      const outputDir = flags['output-dir']

      // Ensure the directory exists
      this.verboseLog('Creating directory:', outputDir)
      await fs.promises.mkdir(outputDir, {recursive: true})

      // Write the generated code to the file
      const outputFile = path.join(outputDir, filename)
      this.verboseLog('Writing file:', outputFile)
      await fs.promises.writeFile(outputFile, generatedCode)
      this.verboseLog(`Generated ${langInput} code at ${outputFile}`)
    } catch (error) {
      console.error('ERROR:', error)
      this.error(error as Error)
    }

    this.verboseLog('=== GENERATE COMMAND END ===')
    return {success: true}
  }
}
