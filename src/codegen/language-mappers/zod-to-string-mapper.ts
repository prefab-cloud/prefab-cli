import {z} from 'zod'

import {ZodTypeSupported} from '../types.js'
import {ZodBaseMapper} from './zod-base-mapper.js'

export class ZodToStringMapper extends ZodBaseMapper {
  any() {
    return 'z.any()'
  }

  array(wrappedType: string) {
    return `z.array(${wrappedType})`
  }

  boolean() {
    return 'z.boolean()'
  }

  enum(values: string[]) {
    return `z.enum([${values.map((v) => `'${v}'`).join(',')}])`
  }

  function(args: string, returns: string) {
    return `z.function().args(${args}).returns(${returns})`
  }

  functionArguments(value?: z.ZodTuple): string {
    if (!value) {
      return ''
    }

    const args = value._def.items.map((item) => {
      const mapper = new ZodToStringMapper()
      return mapper.resolveType(item)
    })

    return args.join(', ')
  }

  functionReturns(value: z.ZodTypeAny): string {
    const mapper = new ZodToStringMapper()
    return mapper.resolveType(value)
  }

  null() {
    return 'z.null()'
  }

  number(isInteger: boolean = false) {
    const base = 'z.number()'

    if (isInteger) {
      return `${base}.int()`
    }

    return base
  }

  object(properties: [string, z.ZodTypeAny][]) {
    const props = properties
      .map(([key, type]) => {
        const mapper = new ZodToStringMapper()
        return mapper.renderField(type, key)
      })
      .join('; ')

    return `z.object({${props}})`
  }

  optional(wrappedType: string) {
    return `${wrappedType}.optional()`
  }

  renderField(type: ZodTypeSupported, key?: string): string {
    const resolved = this.resolveType(type)

    if (key) {
      return `${key}: ${resolved}`
    }

    return resolved
  }

  string() {
    return 'z.string()'
  }

  tuple(wrappedTypes: string[]) {
    return `z.tuple([${wrappedTypes.join(', ')}])`
  }

  undefined() {
    return 'z.undefined()'
  }

  union(wrappedTypes: string[]) {
    return `z.union([${wrappedTypes.join(', ')}])`
  }

  unknown() {
    return 'z.unknown()'
  }
}
