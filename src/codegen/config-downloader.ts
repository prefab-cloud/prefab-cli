import type {RequestResult} from '../result.js'
import type {ConfigFile} from './types.js'

import {APICommand} from '../index.js'

export class ConfigDownloader {
  constructor(private command: APICommand) {}

  async downloadConfig(): Promise<ConfigFile> {
    try {
      const response = (await this.command.apiClient.get('/api/v1/configs/download')) as RequestResult

      if (!response.ok) {
        throw new Error(`Failed to download config: ${response.status}`)
      }

      // Parse the response data - configs are nested in response.data.json
      const configData = response.json as unknown as ConfigFile

      // Print out each config key
      console.log('\nFound configurations:', configData.configs?.length || 0)

      if (!configData.configs) {
        throw new Error('Invalid response format')
      }

      return configData
    } catch (error) {
      console.error('Error downloading config:', error)
      throw error
    }
  }
}
