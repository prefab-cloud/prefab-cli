import { Flags } from '@oclif/core'
import type { JsonObj } from '../result.js'
import { APICommand } from '../index.js'

export default class Generate extends APICommand {
    static description = 'Generate type definitions for your Prefab configuration'

    static examples = ['<%= config.bin %> <%= command.id %> --typescript']

    static flags = {
        typescript: Flags.boolean({
            description: 'generate TypeScript definitions',
            default: false,
        }),
    }

    public async run(): Promise<JsonObj | void> {
        const { flags } = await this.parse(Generate)

        if (flags.typescript) {
            this.log('generated your typescript')
        } else {
            this.log('use --typescript to generate TypeScript definitions')
        }

        return { success: true }
    }
} 