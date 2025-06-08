import {Flags} from '@oclif/core'

import type {JsonObj} from '../result.js'

import {ConfigDownloader} from '../codegen/config-downloader.js'
import {SupportedLanguage} from '../codegen/types.js'
import {ZodGenerator} from '../codegen/zod-generator.js'
import {APICommand} from '../index.js'
import {createFileManager} from '../util/file-manager.js'

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

    // Resolve the language input
    const language = this.resolveLanguage(flags.target)

    // Download the configuration using the APICommand's client
    const downloader = new ConfigDownloader(this)
    try {
      this.verboseLog('Downloading config...')
      const configFile = await downloader.downloadConfig()
      this.verboseLog('Config download complete.')

      this.verboseLog('Creating generator...')
      const generator = new ZodGenerator(language, configFile, this.verboseLog.bind(this))
      console.log(`Generating ${flags.target} code for configs...`)

      const generatedCode = generator.generate()
      this.verboseLog('Code generation complete. Size:', generatedCode.length)

      const filename = generator.filename
      const outputDirectory = flags['output-dir']

      const fileManager = createFileManager({outputDirectory, verboseLog: this.verboseLog.bind(this)})
      await fileManager.writeFile({data: generatedCode, filename})
    } catch (error) {
      console.error('ERROR:', error)
      this.error(error as Error)
    }

    this.verboseLog('=== GENERATE COMMAND END ===')
    return {success: true}
  }

  private resolveLanguage(languageTarget: string | undefined): SupportedLanguage {
    switch (languageTarget?.toLowerCase()) {
      case 'python-pydantic': {
        return SupportedLanguage.Python
      }

      case 'react-ts': {
        return SupportedLanguage.React
      }

      case 'node-ts': {
        return SupportedLanguage.TypeScript
      }

      case 'ruby': {
        return SupportedLanguage.Ruby
      }

      default: {
        throw new Error(`Unsupported target: ${languageTarget}`)
      }
    }
  }
}
