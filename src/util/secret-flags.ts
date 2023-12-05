import {Flags} from '@oclif/core'

const secretFlags = (secretDescription: string) => ({
  secret: Flags.boolean({default: false, description: secretDescription}),
  'secret-key-name': Flags.string({
    default: 'prefab.secrets.encryption.key',
    description: 'name of the secret key to use for encryption/decryption',
  }),
})

export default secretFlags
