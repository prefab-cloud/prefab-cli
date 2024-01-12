// eslint-disable-next-line node/no-extraneous-import
import type Long from 'long'

import {ConfigValue, ConfigValueType} from '../prefab-common/src/types.js'

export const TRUE_VALUES = new Set(['true', '1', 't', 'yes'])

type ConfigValueWithConfigValueType = [ConfigValue, ConfigValueType]

export const coerceIntoType = (type: string, value: string): ConfigValueWithConfigValueType | undefined => {
  switch (type) {
    case 'string': {
      return [{string: value}, ConfigValueType.STRING]
    }

    case 'int': {
      // This unknown as Long is annoying but Long doesn't serialize to JSON correctly ATM
      return [{int: Number.parseInt(value, 10) as unknown as Long}, ConfigValueType.INT]
    }

    case 'double': {
      return [{double: Number.parseFloat(value)}, ConfigValueType.DOUBLE]
    }

    case 'boolean': {
      return [{bool: TRUE_VALUES.has(value.toLowerCase())}, ConfigValueType.BOOL]
    }

    case 'string-list': {
      return [{stringList: {values: value.split(/\s*,\s*/)}}, ConfigValueType.STRING_LIST]
    }

    default: {
      return undefined
    }
  }
}
