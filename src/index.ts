export {run} from '@oclif/core'
import {Command, Flags} from '@oclif/core'

import {Client} from './prefab-common/src/api/client.js'
import {ProjectEnvId, getProjectEnvFromApiKey} from './prefab-common/src/getProjectEnvFromApiKey.js'
import {JsonObj, Result} from './result.js'
import rawGetClient, {unwrapRequest} from './util/get-client.js'

const globalFlags = {
  'api-key': Flags.string({
    description: 'Prefab API KEY (defaults to ENV var PREFAB_API_KEY)',
    env: 'PREFAB_API_KEY',
    helpGroup: 'GLOBAL',
    required: true,
  }),
  interactive: Flags.boolean({
    allowNo: true,
    default: true,
    description: 'Force interactive mode',
    helpGroup: 'GLOBAL',
  }),
  'no-color': Flags.boolean({
    default: false,
    description: 'Do not colorize output',
    env: 'NO_COLOR',
    helpGroup: 'GLOBAL',
  }),
  verbose: Flags.boolean({
    default: false,
    description: 'Verbose output',
    helpGroup: 'GLOBAL',
  }),
}

export abstract class APICommand extends Command {
  static baseFlags = {
    ...globalFlags,
  }

  public static enableJsonFlag = true

  public currentEnvironment!: ProjectEnvId
  public err = (error: Error | object | string, json?: JsonObj): never => {
    if (this.jsonEnabled()) {
      throw json ?? error
    }

    if (typeof error === 'string') {
      return this.error(error)
    }

    this.error(this.toErrorJson(error))
  }

  public isVerbose!: boolean

  public ok = (message: object | string, json?: JsonObj) => {
    if (typeof message === 'string') {
      this.log(message)
    } else {
      this.log(this.toSuccessJson(message))
    }

    return json ?? {message}
  }

  public rawApiClient!: Client

  public resultMessage = (result: Result<unknown>) => {
    if (result.error) {
      this.err(result.message, result.json)
    } else if (result.message) {
      this.log(result.message)
      return result.json ?? result.message
    }
  }

  public verboseLog = (category: string | unknown, message?: unknown): void => {
    if (!this.isVerbose) return

    if (message) {
      this.logToStderr(`[${category}] ${typeof message === 'string' ? message : JSON.stringify(message)}`)
    } else {
      this.logToStderr(typeof category === 'string' ? category : JSON.stringify(category))
    }
  }

  get apiClient() {
    return {
      get: async (path: string) => unwrapRequest(this, this.rawApiClient.get(path)),

      post: async (path: string, payload: unknown) => unwrapRequest(this, this.rawApiClient.post(path, payload)),
    }
  }

  public async init(): Promise<void> {
    await super.init()

    const {flags} = await this.parse()

    // We want to handle the api-key being explicitly blank.
    // If it is truly absent then the `required: true` will catch it.
    if (!flags['api-key']) {
      this.error('API key is required', {exit: 401})
    }

    this.isVerbose = flags.verbose
    this.rawApiClient = rawGetClient(this, flags['api-key'])
    this.currentEnvironment = getProjectEnvFromApiKey(flags['api-key'])
  }
}
