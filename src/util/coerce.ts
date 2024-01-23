// eslint-disable-next-line node/no-extraneous-import
import type Long from 'long'

import {ConfigValue, ConfigValueType} from '../prefab-common/src/types.js'

const TRUE_VALUES = new Set(['true', '1', 't'])
const BOOLEAN_VALUES = new Set([...TRUE_VALUES, 'false', '0', 'f'])

type ConfigValueWithConfigValueType = [ConfigValue, ConfigValueType]

export const coerceIntoType = (type: string, value: string): ConfigValueWithConfigValueType | undefined => {
  switch (type) {
    case 'string': {
      return [{string: value}, ConfigValueType.STRING]
    }

    case 'int': {
      const int = Number.parseInt(value, 10)

      if (Number.isNaN(int)) {
        throw new TypeError(`Invalid default value for int: ${value}`)
      }

      // This unknown as Long is annoying but Long doesn't serialize to JSON correctly ATM
      return [{int: int as unknown as Long}, ConfigValueType.INT]
    }

    case 'double': {
      const double = Number.parseFloat(value)

      if (Number.isNaN(double)) {
        throw new TypeError(`Invalid default value for double: ${value}`)
      }

      return [{double}, ConfigValueType.DOUBLE]
    }

    case 'bool':
    case 'boolean': {
      return [{bool: coerceBool(value)}, ConfigValueType.BOOL]
    }

    case 'stringList':
    case 'string-list': {
      return [{stringList: {values: value.split(/\s*,\s*/)}}, ConfigValueType.STRING_LIST]
    }

    default: {
      return undefined
    }
  }
}

export const coerceBool = (value: string): boolean => {
  if (!BOOLEAN_VALUES.has(value.toLowerCase())) {
    throw new TypeError(`Invalid default value for boolean: ${value}`)
  }

  return TRUE_VALUES.has(value.toLowerCase())
}
