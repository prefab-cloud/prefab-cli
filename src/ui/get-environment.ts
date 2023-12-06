import type {Client} from '../prefab-common/src/api/client.js'
import type {Environment} from '../prefab-common/src/api/getEnvironmentsFromApi.js'

import {APICommand} from '../index.js'
import {getEnvironmentsFromApi} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import {JsonObj} from '../result.js'
import autocomplete from '../util/autocomplete.js'
import isInteractive from '../util/is-interactive.js'

const defaultEnvironmentName = '[Default]'

const getEnvironment = async ({
  allowDefaultEnvironment = false,
  client,
  command,
  flags,
  message,
  providedEnvironment,
}: {
  allowDefaultEnvironment?: boolean
  client: Client
  command: APICommand
  flags: JsonObj
  message: string
  providedEnvironment: string | undefined
}): Promise<Environment | undefined> => {
  if (!providedEnvironment && !isInteractive(flags)) {
    command.err("'environment' is required when interactive mode isn't available.")
  }

  const environments = await getEnvironmentsFromApi({client, log: command.verboseLog})

  command.verboseLog({environments})

  if (providedEnvironment?.toLowerCase() === defaultEnvironmentName.toLowerCase()) {
    return {
      id: '',
      name: defaultEnvironmentName,
    }
  }

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

  const environmentNames = environments.map((environment) => environment.name)

  if (allowDefaultEnvironment) {
    environmentNames.unshift(defaultEnvironmentName)
  }

  const selectedEnvironment = await autocomplete({
    message,
    source: environmentNames,
  })

  if (selectedEnvironment === defaultEnvironmentName) {
    return {
      id: '',
      name: defaultEnvironmentName,
    }
  }

  return environments.find((environment) => environment.name === selectedEnvironment)
}

export default getEnvironment
