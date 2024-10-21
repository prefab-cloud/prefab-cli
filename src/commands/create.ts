// eslint-disable-next-line n/no-extraneous-import
import type Long from 'long'

import {Args, Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import {initPrefab} from '../prefab.js'
import {ConfigType, ConfigValue, ConfigValueType, NewConfig} from '../prefab-common/src/types.js'
import {JsonObj} from '../result.js'
import getValue from '../ui/get-value.js'
import {TYPE_MAPPING, coerceBool, coerceIntoType} from '../util/coerce.js'
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
    '<%= config.bin %> <%= command.id %> my.new.string --type json --value="{\\"key\\": \\"value\\"}"',
  ]

  static flags = {
    confidential: Flags.boolean({default: false, description: 'mark the value as confidential'}),
    'env-var': Flags.string({description: 'environment variable to get value from'}),
    type: Flags.string({
      options: ['boolean-flag', 'boolean', 'string', 'double', 'int', 'string-list', 'json'],
      required: true,
    }),
    value: Flags.string({description: 'default value for your new item', required: false}),
    ...secretFlags('encrypt the value of this item'),
  }

  public async run(): Promise<JsonObj | void> {
    const {args, flags} = await this.parse(Create)

    if (flags.type === 'boolean-flag') {
      return this.createBooleanFlag(args, flags.value)
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
      console.warn("Note: --confidential is implied when using --secret, so you don't need to specify both.")
    }

    if (secret.selected && flags.type !== 'string') {
      return this.err('--secret flag only works with string type')
    }

    let configValue: ConfigValue = {}
    let valueType: ConfigValueType = TYPE_MAPPING[flags.type]

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
        const parsedConfigValue = coerceIntoType(flags.type, rawValue)

        if (!parsedConfigValue) {
          return this.err(`Failed to coerce value into type: ${flags.type}`, {key, phase: 'coercion'})
        }

        configValue = parsedConfigValue[0]
        valueType = parsedConfigValue[1]

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

    if (flags.confidential) {
      configValue.confidential = true
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
      sendToClientSdk: false,
      valueType,
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

  private async createBooleanFlag(args: {name: string}, rawDefault: string | undefined): Promise<JsonObj | void> {
    const key = args.name

    const defaultValue = coerceBool(rawDefault ?? 'false')

    const recipePaylod = {
      defaultValue,
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
