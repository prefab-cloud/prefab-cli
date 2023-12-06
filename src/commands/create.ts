// eslint-disable-next-line node/no-extraneous-import
import type Long from 'long'

import {Args, Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import {initPrefab} from '../prefab.js'
import {ConfigType, ConfigValue, ConfigValueType, NewConfig} from '../prefab-common/src/types.js'
import {JsonObj} from '../result.js'
import getValue from '../ui/get-value.js'
import {checkmark} from '../util/color.js'
import secretFlags, {makeConfidentialValue, parsedSecretFlags} from '../util/secret-flags.js'

export default class Create extends APICommand {
  static args = {
    name: Args.string({description: 'name for your new item (e.g. my.new.flag)', required: true}),
  }

  static description = 'Create a new item in Prefab'

  static examples = [
    '<%= config.bin %> <%= command.id %> my.new.flag --type boolean-flag',
    '<%= config.bin %> <%= command.id %> my.new.flag --type boolean-flag --value=true',
    '<%= config.bin %> <%= command.id %> my.new.string --type string --value="hello world"',
    '<%= config.bin %> <%= command.id %> my.new.string --type string --value="hello world" --secret',
    '<%= config.bin %> <%= command.id %> my.new.string --type string --env-var=MY_ENV_VAR_NAME',
  ]

  static flags = {
    confidential: Flags.boolean({default: false, description: 'mark the value as confidential'}),
    'env-var': Flags.string({description: 'environment variable to get value from'}),
    type: Flags.string({options: ['boolean-flag', 'string'], required: true}),
    value: Flags.string({description: 'default value for your new item', required: false}),
    ...secretFlags('encrypt the value of this item'),
  }

  public async run(): Promise<JsonObj | void> {
    const {args, flags} = await this.parse(Create)

    if (flags.type === 'boolean-flag') {
      return this.createBooleanFlag(args, {default: flags.value === 'true'})
    }

    const key = args.name

    const prefab = await initPrefab(this, flags)

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

    let configValue: ConfigValue = {}

    if (flags['env-var']) {
      configValue = {
        provided: {
          lookup: flags['env-var'],
          source: 1,
        },
      }
    } else {
      const valueInput = await getValue({desiredValue: flags.value, flags, message: 'Default value', prefab})

      if (valueInput.ok) {
        const rawValue = valueInput.value
        configValue = {string: rawValue}

        if (flags.confidential) {
          configValue.confidential = true
        }

        if (secret.selected) {
          const confidentialValueResult = await makeConfidentialValue(this, rawValue, secret, '')

          if (!confidentialValueResult.ok) {
            this.resultMessage(confidentialValueResult)
            return
          }

          configValue = confidentialValueResult.value
        }
      } else {
        return
      }
    }

    const newConfig: Omit<NewConfig, 'allowableValues'> = {
      configType: ConfigType.CONFIG,
      key: args.name,
      projectId: this.currentEnvironment.projectId as unknown as Long,
      rows: [
        {
          properties: {},
          values: [{criteria: [], value: configValue}],
        },
      ],
      valueType: ConfigValueType.STRING,
    }

    const request = await this.apiClient.post('/api/v1/config/', newConfig)

    if (!request.ok) {
      const errMsg =
        request.status === 409
          ? `Failed to create config: ${key} already exists`
          : `Failed to create config: ${request.status} | ${JSON.stringify(request.error)}`

      return this.err(errMsg, {key, phase: 'creation', serverError: request.error})
    }

    const response = request.json

    const confidentialMaybe = flags.confidential ? '(confidential) ' : ''

    return this.ok(`${checkmark} Created ${confidentialMaybe}config: ${key}`, {key, ...response})
  }

  private async createBooleanFlag(args: {name: string}, flags: {default: boolean}): Promise<JsonObj | void> {
    const key = args.name

    const recipePaylod = {
      defaultValue: flags.default,
      key,
    }

    const recipeRequest = await this.apiClient.post('/api/v1/config-recipes/feature-flag/boolean', recipePaylod)

    if (!recipeRequest.ok) {
      return this.err(`Failed to create boolean flag recipe: ${recipeRequest.status}`, {
        key,
        phase: 'recipe',
        serverError: recipeRequest.error,
      })
    }

    const payload = recipeRequest.json

    const request = await this.apiClient.post('/api/v1/config/', payload)

    if (!request.ok) {
      const errMsg =
        request.status === 409
          ? `Failed to create boolean flag: ${key} already exists`
          : `Failed to create boolean flag: ${request.status} | ${JSON.stringify(request.error)}`

      return this.err(errMsg, {key, phase: 'creation', serverError: request.error})
    }

    const response = request.json

    return this.ok(`${checkmark} Created boolean flag: ${key}`, {key, ...response})
  }
}
