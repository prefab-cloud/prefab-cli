import {Flags} from '@oclif/core'
import {ConfigType} from '@prefab-cloud/prefab-cloud-node'

import {APICommand} from '../index.js'
import {initPrefab} from '../prefab.js'

export default class List extends APICommand {
  static description = `Show keys for your config/feature flags/etc.

  All types are returned by default. If you pass one or more type flags (e.g. --configs), only those types will be returned`

  static examples = ['<%= config.bin %> <%= command.id %>', '<%= config.bin %> <%= command.id %> --feature-flags']

  static flags = {
    configs: Flags.boolean({default: false, description: 'include configs'}),
    'feature-flags': Flags.boolean({default: false, description: 'include flags'}),
    'log-levels': Flags.boolean({default: false, description: 'include log levels'}),
    segments: Flags.boolean({default: false, description: 'include segments'}),
  }

  public async run() {
    const {flags} = await this.parse(List)

    const prefab = await initPrefab(this, flags)

    let keys = prefab.keys()

    const types: ConfigType[] = []

    if (flags.configs) {
      types.push(ConfigType.CONFIG)
    }

    if (flags['feature-flags']) {
      types.push(ConfigType.FEATURE_FLAG)
    }

    if (flags['log-levels']) {
      types.push(ConfigType.LOG_LEVEL)
    }

    if (flags.segments) {
      types.push(ConfigType.SEGMENT)
    }

    if (types.length > 0) {
      keys = keys.filter((key) => types.includes(prefab.raw(key)!.configType))
    }

    return this.ok(keys.join('\n'), {keys})
  }
}
