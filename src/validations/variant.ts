import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import {APICommand} from '../index.js'
import {valueOfToString} from '../prefab-common/src/valueOf.js'

const validateVariant = (cmd: APICommand, prefab: Prefab, key: string, variant: string) => {
  const config = prefab.raw(key)

  if (!config) {
    return cmd.errorForCurrentFormat(`Could not find config named ${key}`)
  }

  const variants = config.allowableValues.map((v) => valueOfToString(v))

  if (variants.length > 0 && !variants.includes(variant)) {
    cmd.errorForCurrentFormat(`'${variant}' is not a valid variant for ${key}`)
  }
}

export default validateVariant
