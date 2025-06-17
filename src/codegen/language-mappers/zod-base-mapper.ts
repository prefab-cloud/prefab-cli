import {z} from 'zod'

import {ZodTypeSupported} from '../types.js'

export abstract class ZodBaseMapper {
  resolveType(type: ZodTypeSupported): string {
    const def = type._def

    switch (def.typeName) {
      case 'ZodAny':
        return this.any()
      case 'ZodArray': {
        const internalType = this.resolveType(def.type)
        return this.array(internalType)
      }
      case 'ZodBoolean':
        return this.boolean()
      case 'ZodEnum': {
        const values = def.values.map((v) => v)
        return this.enum(values)
      }
      case 'ZodFunction': {
        const args = this.functionArguments(def.args)
        const returns = this.functionReturns(def.returns)

        return this.function(args, returns)
      }
      case 'ZodNull':
        return this.null()
      case 'ZodNumber': {
        const isInteger = def.checks.some((check) => check.kind === 'int')
        return this.number(isInteger)
      }
      case 'ZodObject': {
        const shape = def.shape()
        const props = Object.entries(shape)
        return this.object(props)
      }
      case 'ZodOptional': {
        const internalType = this.resolveType(def.innerType)
        return this.optional(internalType)
      }
      case 'ZodString':
        return this.string()
      case 'ZodTuple': {
        const items = def.items.map((item) => this.resolveType(item))

        return this.tuple(items)
      }
      case 'ZodUndefined':
        return this.undefined()
      case 'ZodUnion': {
        const options = def.options.map((option) => this.resolveType(option))
        return this.union(options)
      }
      case 'ZodUnknown':
        return this.unknown()
      default:
        console.warn(`Unknown zod type:`, type)

        // If the type is not recognized, default to 'any'
        return this.any()
    }
  }

  protected abstract any(): string
  protected abstract array(wrappedType: string): string
  protected abstract boolean(): string
  protected abstract enum(values: string[]): string
  protected abstract function(args: string, returns: string): string
  protected abstract functionArguments(value?: z.ZodTuple): string
  protected abstract functionReturns(value: z.ZodTypeAny): string
  protected abstract null(): string
  protected abstract number(isInteger: boolean): string
  protected abstract object(properties: [string, z.ZodTypeAny][]): string
  protected abstract optional(wrappedType: string): string
  protected abstract string(): string
  protected abstract tuple(wrappedTypes: string[]): string
  protected abstract undefined(): string
  protected abstract union(wrappedTypes: string[]): string
  protected abstract unknown(): string
}
