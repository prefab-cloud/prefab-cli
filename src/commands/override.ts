import {Flags} from '@oclif/core'

import type {Config} from '../prefab-common/src/types.js'

import {APICommand} from '../index.js'
import {overrideFor} from '../prefab.js'
import {valueTypeStringForConfig} from '../prefab-common/src/valueType.js'
import {JsonObj} from '../result.js'
import getKey from '../ui/get-key.js'
import getValue from '../ui/get-value.js'
import {checkmark} from '../util/color.js'
import nameArg from '../util/name-arg.js'

export default class Override extends APICommand {
  static args = {...nameArg}

  static description = 'Override the value of an item for your user/API key combo'

  static examples = [
    '<%= config.bin %> <%= command.id %> # will prompt for name and value',
    '<%= config.bin %> <%= command.id %> my.flag.name --value=true',
    '<%= config.bin %> <%= command.id %> my.flag.name --remove',
    '<%= config.bin %> <%= command.id %> my.double.config --value=3.14159',
  ]

  static flags = {
    remove: Flags.boolean({default: false, description: 'remove your override (if present)'}),
    value: Flags.string({description: 'value to use for your override'}),
  }

  public async run(): Promise<JsonObj | void> {
    const {args, flags} = await this.parse(Override)

    if (flags.remove && flags.value) {
      this.err('remove and value flags are mutually exclusive')
    }

    const {key, prefab} = await getKey({
      args,
      command: this,
      flags,
      message: 'Which item would you like to override?',
    })

    if (!key || !prefab) {
      return
    }

    if (flags.remove) {
      return this.removeOverride(key)
    }

    const config = prefab.raw(key)

    if (!config) {
      return this.err(`Could not find config named ${key}`)
    }

    const value = await getValue({desiredValue: flags.value, flags, key, message: 'Override value', prefab})

    if (value.ok) {
      return this.setOverride(config, value.value)
    }

    this.resultMessage(value)
  }

  private async removeOverride(key: string): Promise<void> {
    const override = overrideFor({currentEnvironmentId: this.currentEnvironment.id, key})

    if (!override) {
      this.log(`No override found for ${key}`)
      return
    }

    const request = await this.apiClient.post('/api/v1/config/remove-variant', {
      configKey: key,
      variant: override,
    })

    if (request.ok) {
      this.log('Override removed')
      return
    }

    this.err(`Failed to remove override: ${request.status}`, {key, serverError: request.error})
  }

  private async setOverride(config: Config, value: string): Promise<JsonObj | void> {
    const {key} = config

    const type = valueTypeStringForConfig(config)

    if (!type) {
      return this.err(`Could not find type for config named ${key}`)
    }

    const request = await this.apiClient.post('/api/v1/config/assign-variant', {
      configKey: key,
      variant: {[type]: type === 'stringList' ? {values: value.split(',')} : value},
    })

    if (request.ok) {
      this.log(`${checkmark} Override set`)

      return {key, success: true}
    }

    const errMsg =
      request.status === 400
        ? `Failed to override value: ${request.status} -- is ${value} a valid ${type}?`
        : `Failed to override value: ${request.status}`

    this.err(errMsg, {key, serverError: request.error})
  }
}
