import {Args, Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import {JsonObj} from '../result.js'
import {checkmark} from '../util/color.js'

export default class Create extends APICommand {
  static args = {
    name: Args.string({description: 'name for your new item (e.g. my.new.flag)', required: true}),
  }

  static description = 'Create a new item in Prefab'

  static examples = ['<%= config.bin %> <%= command.id %> my.new.flag --type boolean-flag']

  static flags = {
    type: Flags.string({options: ['boolean-flag'], required: true}),
  }

  public async run(): Promise<JsonObj | void> {
    const {args} = await this.parse(Create)

    const key = args.name

    const recipePaylod = {
      defaultValue: false,
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
