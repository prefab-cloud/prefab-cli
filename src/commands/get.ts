import {APICommand} from '../index.js'
import {type GetValue} from '../prefab.js'
import getKey from '../util/get-key.js'
import nameArg from '../util/name-arg.js'

type Response = Promise<Error | Record<string, GetValue> | Record<string, unknown> | undefined | void>

export default class Get extends APICommand {
  static args = {...nameArg}

  static description = 'Get the value of a config/feature-flag/etc.'

  public static enableJsonFlag = true

  static examples = ['<%= config.bin %> <%= command.id %> my.config.name']

  public async run(): Response {
    const {args, flags} = await this.parse(Get)

    const {key, prefab} = await getKey({args, command: this, flags, message: 'Which item would you like to get?'})

    if (key && prefab) {
      if (!prefab.keys().includes(key)) {
        this.errorForCurrentFormat(`${key} does not exist`)
      }

      const value = prefab.get(key)

      this.log(this.toSuccessJson(value))

      return {[key]: value}
    }
  }
}
