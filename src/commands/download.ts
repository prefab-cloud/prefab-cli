import {Flags} from '@oclif/core'
import * as fs from 'node:fs'
import * as path from 'node:path'

import type {JsonObj} from '../result.js'

import {APICommand} from '../index.js'
import getEnvironment from '../ui/get-environment.js'

// need an environment or picker
// api/v1/configs/download?envId=12345

export default class Download extends APICommand {
  static description = 'Download a Datafile for a given environment'

  static examples = ['<%= config.bin %> <%= command.id %> --environment=test']

  static flags = {
    environment: Flags.string({description: 'environment to download'}),
  }

  public async run(): Promise<JsonObj | void> {
    const {flags} = await this.parse(Download)

    const environment = await getEnvironment({
      client: this.rawApiClient,
      command: this,
      flags,
      message: 'Which environment would you like to change the default for?',
      providedEnvironment: flags.environment,
    })

    if (!environment) {
      return
    }

    this.verboseLog({environment})

    const result = await this.apiClient.get(`/api/v1/configs/download?envId=${environment.id}`)

    if (result.ok) {
      return this.writeFile(result, environment)
    }

    this.verboseLog({result})
    return this.err(`Failed to download file. Status=${result.status}`, result.error)
  }

  private writeFile(result: JsonObj, environment: {id: string; name: string}) {
    const fileName = `.prefab.${environment.name}.${environment.id}.config.json`
    const filePath = path.join(process.cwd(), fileName)

    fs.writeFileSync(filePath, JSON.stringify(result.json, null, 2))

    this.log(`Successfully downloaded ${fileName}`)
    return {filePath, succes: true}
  }
}