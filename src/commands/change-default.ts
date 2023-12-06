import {Flags} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {Environment} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import type {ConfigValue} from '../prefab-common/src/types.js'

import {APICommand} from '../index.js'
import {valueTypeString} from '../prefab-common/src/valueType.js'
import {JsonObj} from '../result.js'
import getConfirmation, {confirmFlag} from '../ui/get-confirmation.js'
import getEnvironment from '../ui/get-environment.js'
import getKey from '../ui/get-key.js'
import getValue from '../ui/get-value.js'
import {checkmark} from '../util/color.js'
import nameArg from '../util/name-arg.js'
import secretFlags, {Secret, makeConfidentialValue, parsedSecretFlags} from '../util/secret-flags.js'

type ValueOrEnvVar = {envVar: string; value?: never} | {envVar?: never; value: string}

export default class ChangeDefault extends APICommand {
  static args = {...nameArg}

  static description = 'Change the default value for an environment (other rules still apply)'

  static examples = [
    '<%= config.bin %> <%= command.id %> my.flag.name # will prompt for value and env',
    '<%= config.bin %> <%= command.id %> my.flag.name --value=true --environment=staging',
    '<%= config.bin %> <%= command.id %> my.flag.name --value=true --secret',
    '<%= config.bin %> <%= command.id %> my.config.name --env-var=MY_ENV_VAR_NAME --environment=production',
  ]

  static flags = {
    confidential: Flags.boolean({default: false, description: 'mark the value as confidential'}),
    'env-var': Flags.string({description: 'environment variable to use as default value'}),
    environment: Flags.string({description: 'environment to change (specify "[default]" for the default environment)'}),
    value: Flags.string({description: 'new default value'}),
    ...confirmFlag,
    ...secretFlags('encrypt the value of this item'),
  }

  public async run(): Promise<JsonObj | void> {
    const {args, flags} = await this.parse(ChangeDefault)

    const secret = parsedSecretFlags(flags)

    if (flags['env-var'] && flags.value) {
      return this.err('cannot specify both --env-var and --value')
    }

    if (flags['env-var'] && secret.selected) {
      return this.err('cannot specify both --env-var and --secret')
    }

    if (flags.confidential && secret.selected) {
      return this.err('cannot specify both --confidential and --secret')
    }

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
      allowDefaultEnvironment: true,
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

    const {confidential} = flags

    if (flags['env-var']) {
      if (
        !(await getConfirmation({
          flags,
          message: `Confirm: change the default for ${key} in ${environment.name} to be provided by \`${flags['env-var']}\`? yes/no`,
        }))
      ) {
        return
      }

      return this.submitChange({confidential, envVar: flags['env-var'], environment, key, prefab, secret})
    }

    const value = await getValue({desiredValue: flags.value, environment, flags, key, message: 'Default value', prefab})

    if (value.ok) {
      const secretMaybe = secret.selected ? ' (encrypted)' : ''
      const message = `Confirm: change the default for ${key} in ${environment.name} to \`${value.value}\`${secretMaybe}? yes/no`

      if (!(await getConfirmation({flags, message}))) {
        return
      }

      return this.submitChange({confidential, environment, key, prefab, secret, value: value.value})
    }

    this.resultMessage(value)
  }

  private async submitChange({
    confidential,
    envVar,
    environment,
    key,
    prefab,
    secret,
    value,
  }: {
    confidential: boolean
    environment: Environment
    key: string
    prefab: Prefab
    secret: Secret
  } & ValueOrEnvVar) {
    const config = prefab.raw(key)

    if (!config) {
      return this.err(`no config found for ${key}`)
    }

    const type = valueTypeString(config.valueType)

    if (!type) {
      return this.err(`unknown value type for ${key}: ${config.valueType}`)
    }

    let configValue: ConfigValue = {}
    let successMessage

    if (envVar === undefined) {
      successMessage = `Successfully changed default to \`${value}\``
      if (secret.selected) {
        const confidentialValueResult = await makeConfidentialValue(this, value, secret, environment.id)

        if (!confidentialValueResult.ok) {
          this.resultMessage(confidentialValueResult)
          return
        }

        configValue = confidentialValueResult.value

        successMessage += ' (encrypted)'
      } else {
        configValue = {[type]: value}
      }
    } else {
      configValue = {
        provided: {
          lookup: envVar,
          source: 1,
        },
      }
      successMessage = `Successfully changed default to be provided by \`${envVar}\``
    }

    if (confidential) {
      configValue.confidential = true
      successMessage += ' (confidential)'
    }

    const payload: Record<string, unknown> = {
      configKey: key,
      currentVersionId: config.id.toString(),
      value: configValue,
    }

    if (environment.id) {
      payload.environmentId = environment.id
    }

    const request = await this.apiClient.post('/api/v1/config/set-default/', payload)

    if (request.ok) {
      this.log(`${checkmark} ${successMessage}`)

      return {environment, key, success: true, value}
    }

    this.verboseLog(request.error)

    this.err(`Failed to change default: ${request.status}`, {key, serverError: request.error})
  }
}
