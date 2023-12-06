import {Flags} from '@oclif/core'
import {Prefab, encryption} from '@prefab-cloud/prefab-cloud-node'

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

export const makeConfidentialValue = (prefab: Prefab, value: string, secret: Secret): Result<ConfigValue> => {
  const rawSecretKey = prefab.raw(secret.keyName)

  if (rawSecretKey === undefined) {
    return failure(`Failed to create secret flag: ${secret.keyName} not found`, {
      phase: 'finding-secret',
    })
  }

  const secretKey = prefab.get(secret.keyName)

  if (typeof secretKey !== 'string') {
    return failure(`Failed to create secret flag: ${secret.keyName} is not a string`, {
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
