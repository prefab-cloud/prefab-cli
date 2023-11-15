import {APICommand} from '../index.js'
import {type GetValue} from '../prefab.js'
import getKey from '../util/get-key.js'
import nameArg from '../util/name-arg.js'

type Response = Promise<Error | Record<string, GetValue> | undefined>

export default class Get extends APICommand {
  static args = {...nameArg}

  static description = 'Get the value of a config/feature-flag/etc.'

  public static enableJsonFlag = true

  static examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Response {
    const {args, flags} = await this.parse(Get)

    const {key, prefab} = await getKey(this, args, flags)

    if (key && prefab) {
      try {
        const value = prefab.get(key)

        if (flags.json) {
          return {[key]: value}
        }

        this.log(this.toSuccessJson(value))
      } catch (error_) {
        const error = error_ as Error

        if (flags.json) {
          throw {key, serverError: error}
        }

        if ('message' in error && error.message.startsWith('No value found for ')) {
          this.error(`Error: Key not found: ${args.name}`)
        } else {
          this.error(error.message)
        }
      }
    }
  }
}
