import {Flags} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import {APICommand} from '../index.js'
import getKey from '../pickers/get-key.js'
import {configValueType, overrideFor} from '../prefab.js'
import {valueOfToString} from '../prefab-common/src/valueOf.js'
import autocomplete from '../util/autocomplete.js'
import nameArg from '../util/name-arg.js'
import doValidateVariant from '../validations/variant.js'

export default class Override extends APICommand {
  static args = {...nameArg}

  static description = 'Override the value of an item for your user/API key combo'

  static examples = [
    '<%= config.bin %> <%= command.id %> my.flag.name # will prompt for variant',
    '<%= config.bin %> <%= command.id %> my.flag.name --variant=true',
    '<%= config.bin %> <%= command.id %> my.flag.name --remove',
    '<%= config.bin %> <%= command.id %> my.double.config --variant=3.14159',
  ]

  static flags = {
    remove: Flags.boolean({default: false, description: 'remove your override (if present)'}),
    variant: Flags.string({description: 'variant to use for your override'}),
  }

  public async run(): Promise<Record<string, unknown> | void> {
    const {args, flags} = await this.parse(Override)

    if (flags.remove && flags.variant) {
      this.errorForCurrentFormat('remove and variant flags are mutually exclusive')
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

    const variant = flags.variant || (await this.promptForVariant(prefab, key))

    if (!variant) {
      return
    }

    this.validateVariant(prefab, key, variant)

    return this.setOverride(key, variant)
  }

  private async promptForVariant(prefab: Prefab, key: string): Promise<string | undefined> {
    const config = prefab.raw(key)

    if (!config) {
      return this.errorForCurrentFormat(`No config found for ${key}`)
    }

    const variants = config.allowableValues.map((v) => valueOfToString(v))

    if (variants.length > 0) {
      return autocomplete({
        message: 'Which variant would you like for your override?',
        source: variants,
      })
    }

    this.error('variant is required for non-flag items')
  }

  private async removeOverride(key: string): Promise<void> {
    const override = overrideFor(key)

    if (!override) {
      this.log(`No override found for ${key}`)
      return
    }

    const request = await this.apiClient.post('/api/v1/config/remove-variant', {
      configKey: key,
      variant: override,
    })

    if (request.success) {
      this.log('Override removed')
      return
    }

    if (this.jsonEnabled()) {
      throw {key, serverError: request.error}
    }

    this.verboseLog(request.error)

    this.error(`Failed to remove override: ${request.status}`)
  }

  private async setOverride(key: string, variant: string): Promise<Record<string, unknown> | void> {
    const type = configValueType(key)

    if (!type) {
      return this.errorForCurrentFormat(`Could not find type for config named ${key}`)
    }

    const request = await this.apiClient.post('/api/v1/config/assign-variant', {
      configKey: key,
      variant: {[type]: type === 'stringList' ? variant.split(',') : variant},
    })

    if (request.success) {
      this.log('Override set')

      return {key, success: true}
    }

    if (this.jsonEnabled()) {
      throw {key, serverError: request.error}
    }

    this.verboseLog(request.error)

    if (request.status === 400) {
      this.error(`Failed to override variant: ${request.status} -- is ${variant} a valid ${type}?`)
    }

    this.error(`Failed to override variant: ${request.status}`)
  }

  private validateVariant(prefab: Prefab, key: string, variant: string) {
    return doValidateVariant(this, prefab, key, variant)
  }
}
