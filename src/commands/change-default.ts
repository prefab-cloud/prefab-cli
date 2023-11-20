import {Flags} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {Environment} from '../prefab-common/src/api/getEnvironmentsFromApi.js'

import {APICommand} from '../index.js'
import getEnvironment from '../pickers/get-environment.js'
import getKey from '../pickers/get-key.js'
import getValue from '../pickers/get-value.js'
import {configValueType} from '../prefab.js'
import nameArg from '../util/name-arg.js'

export default class ChangeDefault extends APICommand {
  static args = {...nameArg}

  static description = 'Change the default value for an environment (other rules still apply)'

  static examples = [
    '<%= config.bin %> <%= command.id %> my.flag.name # will prompt for value and env',
    '<%= config.bin %> <%= command.id %> my.flag.name --value=true --environment=staging',
  ]

  static flags = {
    environment: Flags.string({description: 'environment to change'}),
    value: Flags.string({description: 'new default value'}),
  }

  public async run(): Promise<Record<string, unknown> | void> {
    const {args, flags} = await this.parse(ChangeDefault)

    const {key, prefab} = await getKey({
      args,
      command: this,
      flags,
      message: 'Which item would you like to change the default for?',
    })

    if (!key || !prefab) {
      return
    }

    const environment = await getEnvironment({
      client: this.rawApiClient,
      command: this,
      flags,
      message: 'Which environment would you like to change the default for?',
      providedEnvironment: flags.environment,
    })

    this.verboseLog({environment})

    if (!environment) {
      return
    }

    const value = await getValue({desiredValue: flags.value, environment, flags, key, message: 'Default value', prefab})

    if (value.ok) {
      return this.submitChange(prefab, key, value.value, environment)
    }

    this.resultMessage(value)
  }

  private async submitChange(prefab: Prefab, key: string, value: string, environment: Environment) {
    const type = configValueType(key)

    if (!type) {
      return this.err(`no type found for ${key}`)
    }

    const config = prefab.raw(key)

    if (!config) {
      return this.err(`no config found for ${key}`)
    }

    const payload = {
      configKey: key,
      currentVersionId: config.id.toString(),
      environmentId: environment.id,
      value: {[type]: value},
    }

    const request = await this.apiClient.post('/api/v1/config/set-default/', payload)

    if (request.ok) {
      this.log(`Successfully changed default to \`${value}\`.`)

      return {environment, key, success: true, value}
    }

    this.verboseLog(request.error)

    this.err(`Failed to change default: ${request.status}`, {key, serverError: request.error})
  }
}
