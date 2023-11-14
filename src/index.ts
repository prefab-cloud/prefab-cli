export {run} from '@oclif/core'
import {Command, Flags} from '@oclif/core'

const commonFlags = {
  interactive: Flags.boolean({
    allowNo: true,
    default: true,
    description: 'Force interactive mode',
  }),
}

export abstract class BaseCommand extends Command {
  static baseFlags = {
    ...commonFlags,
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
}
