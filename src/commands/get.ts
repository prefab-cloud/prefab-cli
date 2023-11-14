import {Args} from '@oclif/core'

import {APICommand} from '../index.js'
import {type GetValue, initPrefab} from '../prefab.js'
import autocomplete from '../util/autocomplete.js'
import isInteractive from '../util/is-interactive.js'

type Response = Promise<Error | Record<string, GetValue> | undefined>

export default class Get extends APICommand {
  static args = {
    name: Args.string({description: 'config/feature-flag/etc. name'}),
  }

  static description = 'Get the value of a config/feature-flag/etc.'

  public static enableJsonFlag = true

  static examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Response {
    const {args, flags} = await this.parse(Get)

    if (!args.name && !isInteractive(flags)) {
      this.logToStderr("Error: 'name' argument is required when interactive mode isn't available.")
      return
    }

    const prefab = await initPrefab(this, flags)

    let key = args.name

    if (!key && isInteractive(flags)) {
      key = await autocomplete({
        message: 'Select your key',
        source: () => prefab.keys(),
      })
    }

    if (key) {
      try {
        const value = prefab.get(key)

        if (!flags.json) {
          console.log(value)
        }

        return {[key]: value}
      } catch (error_) {
        const error = error_ as Error

        if ('message' in error && error.message.startsWith('No value found for ')) {
          this.logToStderr(`Error: Key not found: ${args.name}`)
        } else {
          this.logToStderr(error.message)
        }

        return error
      }
    }
  }
}
