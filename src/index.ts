export {run} from '@oclif/core'
import {Command, Flags} from '@oclif/core'

import {Result} from './result.js'
import rawGetClient, {unwrapRequest} from './util/get-client.js'
import {log} from './util/log.js'

const commonFlags = {
  interactive: Flags.boolean({
    allowNo: true,
    default: true,
    description: 'Force interactive mode',
  }),
  verbose: Flags.boolean({
    default: false,
    description: 'Verbose output',
  }),
}

export abstract class BaseCommand extends Command {
  static baseFlags = {
    ...commonFlags,
  }

  public static enableJsonFlag = true

  public err = (error: Error | object | string, json?: Record<string, unknown>): never => {
    if (this.jsonEnabled()) {
      throw json ?? error
    }

    if (typeof error === 'string') {
      this.error(error)
    }

    this.error(this.toErrorJson(error))
  }

  public resultMessage = (result: Result<unknown>): void => {
    if (result.error) {
      this.err(result.message, result.json)
    } else if (result.message) {
      this.log(result.message)
    }
  }

  public verboseLog = (...args: unknown[]): void => {
    log(...args)
  }
}

export abstract class APICommand extends BaseCommand {
  static baseFlags = {
    ...commonFlags,
    'api-key': Flags.string({
      description: 'Prefab API KEY (defaults to ENV var PREFAB_API_KEY)',
      env: 'PREFAB_API_KEY',
      required: true,
    }),
  }

  getApiClient = async () => {
    const {flags} = await this.parse()

    return rawGetClient(flags['api-key'])
  }

  get apiClient() {
    return {
      get: async (path: string) => {
        const client = await this.getApiClient()
        return unwrapRequest(client.get(path))
      },

      post: async (path: string, payload: unknown) => {
        const client = await this.getApiClient()
        return unwrapRequest(client.post(path, payload))
      },
    }
  }
}
