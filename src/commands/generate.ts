import { Flags } from '@oclif/core'
import * as fs from 'node:fs'
import * as path from 'node:path'

import type { JsonObj } from '../result.js'

import { ConfigDownloader } from '../codegen/config-downloader.js'
import { ZodGenerator } from '../codegen/zod-generator.js'
import { APICommand } from '../index.js'

export default class Generate extends APICommand {
    static aliases = ['gen']

    static description = 'Generate type definitions for your Prefab configuration'

    static examples = [
        '<%= config.bin %> <%= command.id %> --typescript',
        '<%= config.bin %> <%= command.id %> --typescript --output-file src/custom/path/types.ts'
    ]

    static flags = {
        'output-file': Flags.string({
            default: 'src/prefab/prefab.ts',
            description: 'output file path for TypeScript definitions',
        }),
        typescript: Flags.boolean({
            default: false,
            description: 'generate TypeScript definitions',
        }),
    }

    public async run(): Promise<JsonObj | void> {
        const { flags } = await this.parse(Generate)

        // Download the configuration using the APICommand's client
        const downloader = new ConfigDownloader(this)
        try {
            const configFile = await downloader.downloadConfig()

            const generator = new ZodGenerator(configFile)
            const generatedCode = generator.generate()

            if (flags.typescript) {
                // Ensure the directory exists
                const dir = path.dirname(flags['output-file'])
                await fs.promises.mkdir(dir, { recursive: true })

                // Write the generated code to the file
                await fs.promises.writeFile(flags['output-file'], generatedCode)
                this.log(`Generated TypeScript definitions at ${flags['output-file']}`)
            } else {
                this.log('use --typescript to generate TypeScript definitions')
            }
        } catch (error) {
            this.error('Failed to generate configuration: ' + error)
        }

        return { success: true }
    }
} 