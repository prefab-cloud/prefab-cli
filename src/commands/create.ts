import {Args, Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import jsonMaybe from '../util/json-maybe.js'

export default class Create extends APICommand {
  static args = {
    name: Args.string({description: 'name for your new item (e.g. my.new.flag)', required: true}),
  }

  static description = 'Create a new item in Prefab'

  static examples = ['<%= config.bin %> <%= command.id %> my.new.flag --type boolean-flag']

  static flags = {
    type: Flags.string({options: ['boolean-flag'], required: true}),
  }

  public async run(): Promise<Record<string, unknown> | void> {
    const {args} = await this.parse(Create)

    const key = args.name

    const recipePaylod = {
      defaultValue: false,
      key,
    }

    const client = await this.getApiClient()

    const recipeRequest = await client.post('/api/v1/config-recipes/feature-flag/boolean', recipePaylod)

    if (recipeRequest.status !== 200) {
      const error = jsonMaybe(await recipeRequest.text())

      if (this.jsonEnabled()) {
        throw {key, phase: 'recipe', serverError: error}
      }

      this.error(`Failed to create boolean flag recipe: ${recipeRequest.status} | ${error}`)
    }

    const payload = (await recipeRequest.json()) as Record<string, unknown>

    const request = await client.post('/api/v1/config/', payload)

    if (request.status !== 200) {
      const error = jsonMaybe(await request.text())

      if (this.jsonEnabled()) {
        throw {key, phase: 'creation', serverError: error}
      }

      if (request.status === 409) {
        this.error(`Failed to create boolean flag: ${key} already exists`)
      } else {
        this.error(`Failed to create boolean flag: ${request.status} | ${JSON.stringify(error)}`)
      }
    }

    const response = await request.json()

    if (this.jsonEnabled()) {
      return {key, ...response}
    }

    this.log(`Created boolean flag: ${key}`)
  }
}
