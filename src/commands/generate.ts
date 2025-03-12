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
    '<%= config.bin %> <%= command.id %> --lang typescript',
    '<%= config.bin %> <%= command.id %> --lang typescript --output-file src/custom/path/types.ts',
    '<%= config.bin %> <%= command.id %> --lang python',
  ]

  static flags = {
    lang: Flags.string({
      default: 'typescript',
      description: 'language to generate code for (typescript or python)',
    }),
    'output-file': Flags.string({
      default: 'src/prefab/prefab.ts',
      description: 'output file path for generated code',
    }),
  }

  public async run(): Promise<JsonObj | void> {
    const {flags} = await this.parse(Generate)

    // Get the language from the flag
    const langInput = flags.lang?.toLowerCase()
    let language: SupportedLanguage

    // Map the input string to the appropriate enum value
    if (langInput === 'python') {
      language = SupportedLanguage.Python
    } else if (langInput === 'typescript') {
      language = SupportedLanguage.TypeScript
    } else {
      throw new Error(`Unsupported language: ${langInput}. Supported languages are: typescript, python`)
    }

    // Download the configuration using the APICommand's client
    const downloader = new ConfigDownloader(this)
    try {
      const configFile = await downloader.downloadConfig()

      const generator = new ZodGenerator(configFile)
      const generatedCode = generator.generate(language)

      // Set default file extension based on language
      const fileExtension = language === SupportedLanguage.Python ? '.py' : '.ts'

      // Ensure the directory exists
      const outputFile = flags['output-file'] || `src/prefab/prefab${fileExtension}`
      const dir = path.dirname(outputFile)
      await fs.promises.mkdir(dir, {recursive: true})

      // Write the generated code to the file
      await fs.promises.writeFile(outputFile, generatedCode)
      this.log(`Generated ${langInput} code at ${outputFile}`)
    } catch (error) {
      this.error(error as Error)
    }

    return {success: true}
  }
}
