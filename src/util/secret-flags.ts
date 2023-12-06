import {Flags} from '@oclif/core'
import {encryption} from '@prefab-cloud/prefab-cloud-node'

import {APICommand} from '../index.js'
import {getConfigFromApi} from '../prefab-common/src/api/getConfigFromApi.js'
import {ConfigValue} from '../prefab-common/src/types.js'
import {Result, failure, success} from '../result.js'

const secretFlags = (secretDescription: string) => ({
  secret: Flags.boolean({default: false, description: secretDescription}),
  'secret-key-name': Flags.string({
    default: 'prefab.secrets.encryption.key',
    description: 'name of the secret key to use for encryption/decryption',
  }),
})

export type Secret = {
  keyName: string
  selected: boolean
}

export const parsedSecretFlags = (flags: {secret: boolean; 'secret-key-name': string}): Secret => ({
  keyName: flags['secret-key-name'],
  selected: flags.secret,
})

export const makeConfidentialValue = async (
  command: APICommand,
  value: string,
  secret: Secret,
  environmentId: string,
): Promise<Result<ConfigValue>> => {
  const rawConfig = await getConfigFromApi({
    client: command.rawApiClient,
    errorLog: command.verboseLog,
    key: secret.keyName,
  })

  if (!rawConfig) {
    return failure(`Failed to create secret: ${secret.keyName} not found`, {
      phase: 'finding-secret',
    })
  }

  if (!rawConfig.rows) {
    return failure(`Failed to create secret: ${secret.keyName} has no rows`, {
      phase: 'finding-secret',
    })
  }

  const secretKeyRow =
    rawConfig.rows.find((row) => (row.projectEnvId ?? '') === environmentId) ??
    rawConfig.rows.find((row) => (row.projectEnvId ?? '') === '')

  const envVar = secretKeyRow?.values[0]?.value?.provided?.lookup

  if (!envVar) {
    return failure(
      `Failed to create secret: ${secret.keyName} not found for environmentId ${environmentId} or default env`,
      {
        phase: 'finding-secret',
      },
    )
  }

  const secretKey = process.env[envVar]

  command.verboseLog(`Using env var ${envVar} to encrypt secret`)

  if (typeof secretKey !== 'string') {
    return failure(`Failed to create secret: env var ${envVar} is not present`, {
      phase: 'finding-secret',
    })
  }

  if (secretKey.length !== 64) {
    return failure(`Secret key is too short. ${secret.keyName} must be 64 characters.`, {
      phase: 'finding-secret',
    })
  }

  return success({
    confidential: true,
    decryptWith: secret.keyName,
    string: encryption.encrypt(value, secretKey),
  })
}

export default secretFlags
