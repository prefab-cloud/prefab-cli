import {Flags} from '@oclif/core'

import type {JsonObj} from '../result.js'

import {BaseGenerator} from '../codegen/code-generators/base-generator.js'
import {NodeTypeScriptGenerator} from '../codegen/code-generators/node-typescript-generator.js'
import {PythonGenerator} from '../codegen/code-generators/python-generator.js'
import {ReactTypeScriptGenerator} from '../codegen/code-generators/react-typescript-generator.js'
import {ConfigDownloader} from '../codegen/config-downloader.js'
import {type ConfigFile, SupportedLanguage} from '../codegen/types.js'
import {APICommand} from '../index.js'
import {createFileManager} from '../util/file-manager.js'

export default class Generate extends APICommand {
  static aliases = ['gen']

  static description = 'Generate type definitions for your Prefab configuration'

  static examples = [
    '<%= config.bin %> <%= command.id %> --target node-ts',
    '<%= config.bin %> <%= command.id %> --target react-ts --output-dir custom/path',
  ]

  static flags = {
    'output-dir': Flags.string({
      default: 'generated-sources',
      description: 'output directory for generated code',
    }),
    target: Flags.string({
      default: 'node-ts',
      description: 'language/framework to generate code for',
      options: ['node-ts', 'react-ts', 'python-pydantic'],
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

      this.verboseLog('Resolving generator...')
      const generator = this.resolveGenerator(language, configFile)
      console.log(`Generating ${language} code for configs...`)

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

  private resolveGenerator(language: SupportedLanguage, configFile: ConfigFile): BaseGenerator {
    switch (language) {
      case SupportedLanguage.Node:
        return new NodeTypeScriptGenerator({configFile, log: this.verboseLog})
      case SupportedLanguage.React:
        return new ReactTypeScriptGenerator({configFile, log: this.verboseLog})
      case SupportedLanguage.Python:
        return new PythonGenerator({configFile, log: this.verboseLog})
    }
  }

  private resolveLanguage(languageTarget: string | undefined): SupportedLanguage {
    switch (languageTarget?.toLowerCase()) {
      case 'react-ts':
        return SupportedLanguage.React
      case 'node-ts':
        return SupportedLanguage.Node
      case 'python-pydantic':
        return SupportedLanguage.Python

      default: {
        throw new Error(`Unsupported target: ${languageTarget}`)
      }
    }
  }
}
