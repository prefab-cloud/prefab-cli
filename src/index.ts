export {run} from '@oclif/core'
import {Command, Flags} from '@oclif/core'

export abstract class APICommand extends Command {
  static baseFlags = {
    'api-key': Flags.string({
      description: 'Prefab API KEY (defaults to ENV var PREFAB_API_KEY)',
      env: 'PREFAB_API_KEY',
      required: true,
    }),
  }
}
