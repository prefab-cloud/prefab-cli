import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import {valueOfToString} from '../prefab-common/src/valueOf.js'
import {Result, failure, success} from '../result.js'

const validateValue = (prefab: Prefab, key: string, value: string): Result<string> => {
  const config = prefab.raw(key)

  if (!config) {
    return failure(`Could not find config named ${key}`)
  }

  const values = config.allowableValues.map((v) => valueOfToString(v))

  if (values.length > 0 && !values.includes(value)) {
    return failure(`'${value}' is not a valid value for ${key}`)
  }

  return success(value)
}

export default validateValue
