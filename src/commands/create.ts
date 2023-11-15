import {Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import getClient from '../util/get-client.js'
import jsonMaybe from '../util/json-maybe.js'

export default class Create extends APICommand {
  static description = 'Create a new item in Prefab'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    name: Flags.string({description: 'name for your new item (e.g. my.new.flag)', required: true}),
    type: Flags.string({options: ['boolean-flag'], required: true}),
  }

  public async run(): Promise<Record<string, unknown> | void> {
    const {flags} = await this.parse(Create)

    const key = flags.name

    const recipePaylod = {
      defaultValue: false,
      key,
    }

    const client = getClient()

    const recipeRequest = await client.post('/api/v1/config-recipes/feature-flag/boolean', recipePaylod)

    if (recipeRequest.status !== 200) {
      const error = jsonMaybe(await recipeRequest.text())

      if (flags.json) {
        throw {key, phase: 'recipe', serverError: error}
      }

      this.error(`Prefab: Failed to create boolean flag recipe: ${recipeRequest.status} | ${error}`)
    }

    const payload = (await recipeRequest.json()) as Record<string, unknown>

    const request = await client.post('/api/v1/config/', payload)

    if (request.status !== 200) {
      const error = jsonMaybe(await request.text())

      if (flags.json) {
        throw {key, phase: 'creation', serverError: error}
      }

      if (request.status === 409) {
        this.error(`Prefab: Failed to create boolean flag: ${key} already exists`)
      } else {
        this.error(`Prefab: Failed to create boolean flag: ${request.status} | ${JSON.stringify(error)}`)
      }
    }

    const response = await request.json()

    if (flags.json) {
      return {key, ...response}
    }

    this.log(`Prefab: Created boolean flag: ${key}`)
  }
}
