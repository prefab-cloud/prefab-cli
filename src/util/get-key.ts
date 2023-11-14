import {Command} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import {initPrefab} from '../prefab.js'
import autocomplete from '../util/autocomplete.js'
import isInteractive from '../util/is-interactive.js'

const getKey = async (
  command: Command,
  args: {name?: string},
  flags: Record<string, unknown>,
): Promise<{key: string | undefined; prefab: Prefab | undefined}> => {
  if (!args.name && !isInteractive(flags)) {
    command.logToStderr("Error: 'name' argument is required when interactive mode isn't available.")
    return {key: undefined, prefab: undefined}
  }

  const prefab = await initPrefab(command, flags)

  let key = args.name

  if (!key && isInteractive(flags)) {
    key = await autocomplete({
      message: 'Select your key',
      source: () => prefab.keys(),
    })
  }

  return {key, prefab}
}

export default getKey
