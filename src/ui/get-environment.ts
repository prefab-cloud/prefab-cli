import type {Client} from '../prefab-common/src/api/client.js'
import type {Environment} from '../prefab-common/src/api/getEnvironmentsFromApi.js'

import {APICommand} from '../index.js'
import {getEnvironmentsFromApi} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import {JsonObj} from '../result.js'
import autocomplete from '../util/autocomplete.js'
import isInteractive from '../util/is-interactive.js'
import {log} from '../util/log.js'

const getEnvironment = async ({
  client,
  command,
  flags,
  message,
  providedEnvironment,
}: {
  client: Client
  command: APICommand
  flags: JsonObj
  message: string
  providedEnvironment: string | undefined
}): Promise<Environment | undefined> => {
  if (!providedEnvironment && !isInteractive(flags)) {
    command.err("'environment' is required when interactive mode isn't available.")
  }

  const environments = await getEnvironmentsFromApi({client, log})

  command.verboseLog({environments})

  if (providedEnvironment) {
    const matchingEnvironment = environments.find(
      (environment) => environment.name.toLowerCase() === providedEnvironment.toLowerCase(),
    )

    if (!matchingEnvironment) {
      command.err(
        `Environment \`${providedEnvironment}\` not found. Valid environments: ${environments
          .map((environment) => environment.name)
          .join(', ')}`,
      )
    }

    return matchingEnvironment
  }

  const selectedEnvironment = await autocomplete({
    message,
    source: () => environments.map((environment) => environment.name),
  })

  return environments.find((environment) => environment.name === selectedEnvironment)
}

export default getEnvironment
