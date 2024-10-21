// eslint-disable-next-line n/no-extraneous-import
import type Long from 'long'

import {ConfigValue, ConfigValueType} from '../prefab-common/src/types.js'

const TRUE_VALUES = new Set(['true', '1', 't'])
const BOOLEAN_VALUES = new Set([...TRUE_VALUES, 'false', '0', 'f'])

type ConfigValueWithConfigValueType = [ConfigValue, ConfigValueType]

export const TYPE_MAPPING: Record<string, ConfigValueType> = {
  bool: ConfigValueType.BOOL,
  boolean: ConfigValueType.BOOL,
  double: ConfigValueType.DOUBLE,
  int: ConfigValueType.INT,
  string: ConfigValueType.STRING,
  'string-list': ConfigValueType.STRING_LIST,
  stringList: ConfigValueType.STRING_LIST,
}

export const coerceIntoType = (type: string, value: string): ConfigValueWithConfigValueType | undefined => {
  switch (type) {
    case 'string': {
      return [{string: value}, TYPE_MAPPING[type]]
    }

    case 'int': {
      const int = Number.parseInt(value, 10)

      if (Number.isNaN(int)) {
        throw new TypeError(`Invalid default value for int: ${value}`)
      }

      // This unknown as Long is annoying but Long doesn't serialize to JSON correctly ATM
      return [{int: int as unknown as Long}, TYPE_MAPPING[type]]
    }

    case 'double': {
      const double = Number.parseFloat(value)

      if (Number.isNaN(double)) {
        throw new TypeError(`Invalid default value for double: ${value}`)
      }

      return [{double}, TYPE_MAPPING[type]]
    }

    case 'bool':
    case 'boolean': {
      return [{bool: coerceBool(value)}, TYPE_MAPPING[type]]
    }

    case 'stringList':
    case 'string-list': {
      return [{stringList: {values: value.split(/\s*,\s*/)}}, TYPE_MAPPING[type]]
    }

    case 'json': {
      try {
        // ensure the value is valid JSON
        JSON.parse(value)
        return [{json: {json: value}}, ConfigValueType.JSON]
      } catch {
        throw new TypeError(`Invalid default value for JSON: ${value}`)
      }
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
