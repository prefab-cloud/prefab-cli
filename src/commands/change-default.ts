import {Flags} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {Environment} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import type {GetValue} from '../prefab-common/src/types.js'

import {APICommand} from '../index.js'
import getEnvironment from '../pickers/get-environment.js'
import getKey from '../pickers/get-key.js'
import {configValueType, defaultValueFor} from '../prefab.js'
import {valueOfToString} from '../prefab-common/src/valueOf.js'
import autocomplete from '../util/autocomplete.js'
import nameArg from '../util/name-arg.js'
import doValidateVariant from '../validations/variant.js'

export default class ChangeDefault extends APICommand {
  static args = {...nameArg}

  static description = 'change the default value for an environment (other rules still apply)'

  static examples = [
    '<%= config.bin %> <%= command.id %> my.flag.name # will prompt for variant and env',
    '<%= config.bin %> <%= command.id %> my.flag.name --variant=true --environment=staging',
  ]

  static flags = {
    environment: Flags.string({description: 'environment to change'}),
    variant: Flags.string({description: 'new default variant'}),
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
      client: await this.getApiClient(),
      command: this,
      flags,
      message: 'Which environment would you like to change the default for?',
      providedEnvironment: flags.environment,
    })

    this.verboseLog({environment})

    if (!environment) {
      return
    }

    const currentDefault = defaultValueFor(key, environment.id)

    const variant = flags.variant || (await this.promptForVariant(prefab, key, currentDefault))

    if (!variant) {
      return
    }

    if (variant.toString() === currentDefault?.toString()) {
      this.log(`The default is already \`${variant}\``)
      return
    }

    this.validateVariant(prefab, key, variant)

    this.log(this.toSuccessJson({environment, key, variant}))

    return this.submitChange(prefab, key, variant, environment)
  }

  private async promptForVariant(
    prefab: Prefab,
    key: string,
    currentDefault?: GetValue | undefined,
  ): Promise<string | undefined> {
    const config = prefab.raw(key)

    if (!config) {
      return this.errorForCurrentFormat(`no config found for ${key}`)
    }

    const variants = config.allowableValues.map((v) => valueOfToString(v))

    if (variants.length > 0) {
      const message =
        currentDefault === undefined
          ? `Choose your new default.`
          : `The current default is \`${currentDefault}\`. Choose your new default.`

      return autocomplete({
        message,
        source: variants.filter((v) => v.toString() !== currentDefault?.toString()),
      })
    }

    this.error('variant is required for non-flag items')
  }

  private async submitChange(prefab: Prefab, key: string, variant: string, environment: Environment) {
    const type = configValueType(key)

    if (!type) {
      return this.errorForCurrentFormat(`no type found for ${key}`)
    }

    const config = prefab.raw(key)

    if (!config) {
      return this.errorForCurrentFormat(`no config found for ${key}`)
    }

    const payload = {
      configKey: key,
      currentVersionId: config.id.toString(),
      environmentId: environment.id,
      value: {[type]: variant},
    }

    const request = await this.apiClient.post('/api/v1/config/set-default/', payload)

    if (request.success) {
      this.log(`Successfully changed default to \`${variant}\`.`)

      return {environment, key, success: true, variant}
    }

    if (this.jsonEnabled()) {
      throw {key, serverError: request.error}
    }

    this.verboseLog(request.error)

    this.error(`Failed to change default: ${request.status}`)
  }

  private validateVariant(prefab: Prefab, key: string, variant: string) {
    return doValidateVariant(this, prefab, key, variant)
  }
}
