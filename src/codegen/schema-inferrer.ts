import type {ZodObject, ZodRawShape, ZodTypeAny} from 'zod'

import {z} from 'zod'

import type {Config, ConfigFile} from './types.js'

import {MustacheExtractor} from './mustache-extractor.js'
import {secureEvaluateSchema} from './schema-evaluator.js'
import {ZodUtils} from './zod-utils.js'

/* eslint-disable max-depth */

export class SchemaInferrer {
  private jsonToInferredZod = (data: unknown): ZodTypeAny => {
    if (Array.isArray(data)) {
      // If it's an array, infer the type of its first element (assuming homogenous arrays)
      if (data.length > 0) {
        return z.array(this.jsonToInferredZod(data[0]))
      }

      return z.array(z.string()) // Empty arrays default to z.any()
    }

    if (typeof data === 'object' && data !== null) {
      // If it's an object, recursively infer the schema for each key
      const shape: Record<string, ZodTypeAny> = {}
      const dataRecord = data as Record<string, unknown>
      for (const key in dataRecord) {
        if (Object.hasOwn(dataRecord, key)) {
          shape[key] = this.jsonToInferredZod(dataRecord[key]).optional()
        }
      }

      return z.object(shape)
    }

    if (typeof data === 'string') {
      return z.string()
    }

    if (typeof data === 'number') {
      return z.number()
    }

    if (typeof data === 'boolean') {
      return z.boolean()
    }

    if (data === null) {
      return z.null()
    }

    return z.any() // Fallback for unknown types
  }

  private mergeSchemas = (schemaA: ZodObject<ZodRawShape>, schemaB: ZodObject<ZodRawShape>): ZodObject<ZodRawShape> => {
    const shapeA = schemaA.shape
    const shapeB = schemaB.shape
    const mergedShape: Record<string, ZodTypeAny> = {}

    const allKeys = new Set([...Object.keys(shapeA), ...Object.keys(shapeB)])
    for (const key of allKeys) {
      const typeA = shapeA[key]
      const typeB = shapeB[key]

      if (typeA && typeB) {
        // Both schemas have the key
        mergedShape[key] = this.mergeTypes(typeA, typeB)
      } else {
        // Only one schema has the key, make it optional if it isn't already
        const existingType = typeA || typeB
        mergedShape[key] = this.isOptional(existingType) ? existingType : existingType.optional()
      }
    }

    return z.object(mergedShape)
  }

  constructor(private log: (category: string | unknown, message?: unknown) => void) {}

  zodForConfig(config: Config, configFile: ConfigFile): z.ZodTypeAny {
    const {schemaKey} = config
    const schemaConfig = schemaKey
      ? configFile.configs.find((c) => c.key === schemaKey && c.configType === 'SCHEMA')
      : undefined

    const userDefinedSchema = schemaConfig ? this.schemaToZod(config, schemaConfig) : undefined

    const schemaWithoutMustache = userDefinedSchema ?? this.inferFromConfig(config)
    return this.replaceStringsWithMustache(schemaWithoutMustache, config)
  }

  private areArgumentShapesDifferent(argsA: Record<string, ZodTypeAny>, argsB: Record<string, ZodTypeAny>): boolean {
    // Check for structural differences that would make merging inappropriate
    const keysA = Object.keys(argsA)
    const keysB = Object.keys(argsB)

    // If one has section helpers and the other has simple placeholders, they're different
    const hasSectionA = keysA.some((key) => argsA[key] && argsA[key]._def && argsA[key]._def.typeName === 'ZodArray')
    const hasSectionB = keysB.some((key) => argsB[key] && argsB[key]._def && argsB[key]._def.typeName === 'ZodArray')

    if (hasSectionA !== hasSectionB) {
      return true
    }

    // If they have no keys in common, they're different
    return !keysA.some((key) => keysB.includes(key))
  }

  private createZodFunctionFromMustacheStrings(strings: string[]): z.ZodTypeAny {
    if (strings.length === 0) {
      return z.string()
    }

    // If multiple strings, merge their schemas
    if (strings.length > 1) {
      const schemas = strings.map((str) => MustacheExtractor.extractSchema(str, this.log))

      // Replace reduce with a loop
      let mergedSchema: ZodObject<ZodRawShape> | null = null
      for (const schema of schemas) {
        mergedSchema =
          mergedSchema === null
            ? (schema as ZodObject<ZodRawShape>)
            : this.mergeSchemas(mergedSchema, schema as ZodObject<ZodRawShape>)
      }

      // If the schema is empty (no properties), just return basic string
      if (mergedSchema && Object.keys(mergedSchema._def.shape()).length === 0) {
        return z.string()
      }

      return mergedSchema
        ? z.function().args(mergedSchema).returns(z.string())
        : z.function().args(schemas[0]).returns(z.string())
    }

    const schema = MustacheExtractor.extractSchema(strings[0], this.log)

    // If the schema is empty (no properties), just return basic string
    if (Object.keys(schema._def.shape()).length === 0) {
      return z.string()
    }

    return z.function().args(schema).returns(z.string())
  }

  /**
   * Extract schema from a schema config
   */
  private extractSchemaFromConfig(config: Config): undefined | z.ZodTypeAny {
    for (const row of config.rows) {
      for (const valueObj of row.values) {
        if (valueObj.value.schema?.schema) {
          const schemaStr = valueObj.value.schema.schema
          const result = secureEvaluateSchema(schemaStr)

          if (result.success && result.schema) {
            this.log(`Successfully parsed schema from schema config: ${config.key}`)
            return result.schema
          }

          if (result.error) {
            console.warn(`Failed to parse schema from schema config ${config.key}: ${result.error}`)
          }
        }
      }
    }

    return undefined
  }

  // Get all JSON values from the config
  private getAllJsonValues(config: Config): unknown[] {
    return config.rows.flatMap((row) =>
      row.values.flatMap((valueObj) => {
        if (config.valueType === 'JSON') {
          // Try to parse JSON from json field
          if (valueObj.value.json?.json) {
            try {
              return [JSON.parse(valueObj.value.json.json)]
            } catch (error) {
              console.warn(`Failed to parse JSON for ${config.key}:`, error)
            }
          }
          // Try to parse JSON from string field
          else if (valueObj.value.string) {
            try {
              return [JSON.parse(valueObj.value.string)]
            } catch (error) {
              console.warn(`Failed to parse JSON string for ${config.key}:`, error)
            }
          }
        }

        return []
      }),
    )
  }

  /**
   * Get all string values at a specific location in the config
   * @param config The configuration to extract strings from
   * @param location Array of keys representing the path to look for strings. Empty array for direct string values.
   * @returns Array of strings found at the specified location
   */
  private getAllStringsAtLocation(config: Config, location: string[]): string[] {
    if (location.length === 0) {
      // For empty location, just get direct string values
      return config.rows.flatMap((row) =>
        row.values.flatMap((valueObj) => (valueObj.value.string ? [valueObj.value.string] : [])),
      )
    }

    // For JSON values, we need to traverse the object
    return config.rows.flatMap((row) =>
      row.values.flatMap((valueObj) => {
        let jsonContent: unknown = null

        // Try to parse JSON from either json field or string field
        if (valueObj.value.json?.json) {
          try {
            jsonContent = JSON.parse(valueObj.value.json.json)
          } catch (error) {
            console.warn(`Failed to parse JSON for ${config.key}:`, error)
            return []
          }
        } else if (valueObj.value.string && config.valueType === 'JSON') {
          try {
            jsonContent = JSON.parse(valueObj.value.string)
          } catch (error) {
            console.warn(`Failed to parse JSON string for ${config.key}:`, error)
            return []
          }
        }

        if (!jsonContent) return []

        // Traverse the JSON object to the specified location
        let current: unknown = jsonContent
        for (const key of location) {
          if (current && typeof current === 'object' && key in current) {
            current = (current as Record<string, unknown>)[key]
          } else {
            return []
          }
        }

        // If we found a string at the location, return it
        return typeof current === 'string' ? [current] : []
      }),
    )
  }

  private getInnerType(type: ZodTypeAny): ZodTypeAny {
    return type instanceof z.ZodOptional ? type._def.innerType : type
  }

  private handleEnum(type: ZodTypeAny): ZodTypeAny {
    const {typeName, values} = type._def
    return typeName === 'ZodEnum' ? z.enum(values) : type
  }

  private inferFromConfig(config: Config): z.ZodTypeAny {
    const {key, valueType} = config
    switch (valueType) {
      case 'STRING': {
        return z.string()
      }

      case 'BOOL': {
        return z.boolean()
      }

      case 'INT': {
        return z.number().int()
      }

      case 'DOUBLE': {
        return z.number()
      }

      case 'STRING_LIST': {
        return z.array(z.string())
      }

      case 'DURATION': {
        return z.string().duration()
      }

      case 'JSON': {
        const jsonValues = this.getAllJsonValues(config)
        this.log('JSON values:', JSON.stringify(jsonValues, null, 2))

        if (jsonValues.length > 0) {
          try {
            // Infer schemas for all JSON values
            const schemas = jsonValues.map((json) => {
              const schema = this.jsonToInferredZod(json)
              this.log('Inferred schema for:', JSON.stringify(json))
              this.log('Schema:', ZodUtils.zodToString(schema, key))
              return schema
            })

            // Process each schema
            let mergedSchema: ZodTypeAny | null = null
            for (const [i, schema] of schemas.entries()) {
              this.log(`Processing schema ${i}:`, ZodUtils.zodToString(schema, key))

              if (mergedSchema === null) {
                mergedSchema = schema
              } else if (mergedSchema instanceof z.ZodObject && schema instanceof z.ZodObject) {
                mergedSchema = this.mergeSchemas(mergedSchema, schema)
                this.log('Merged result:', ZodUtils.zodToString(mergedSchema, key))
              }
            }

            if (mergedSchema) {
              this.log('Final merged schema:', ZodUtils.zodToString(mergedSchema, key))
              return mergedSchema
            }
          } catch (error) {
            console.warn(`Error inferring JSON schema for ${key}:`, error)
          }
        }

        return z.union([z.array(z.any()), z.record(z.any())])
      }

      case 'LOG_LEVEL': {
        return z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'])
      }

      default: {
        return z.any()
      }
    }
  }

  private isOptional(type: ZodTypeAny): boolean {
    return type instanceof z.ZodOptional
  }

  private mergeTypes(typeA: ZodTypeAny, typeB: ZodTypeAny): ZodTypeAny {
    const shouldBeOptional = this.isOptional(typeA) || this.isOptional(typeB)
    const innerA = this.getInnerType(typeA)
    const innerB = this.getInnerType(typeB)
    const {typeName: typeNameA, values: valuesA} = innerA._def
    const {typeName: typeNameB, values: valuesB} = innerB._def

    let mergedType: ZodTypeAny

    if (innerA instanceof z.ZodObject && innerB instanceof z.ZodObject) {
      // Recursively merge nested objects
      mergedType = this.mergeSchemas(innerA, innerB)
    } else if (typeNameA === 'ZodFunction' && typeNameB === 'ZodFunction') {
      try {
        const {args: argsA} = innerA._def
        const {args: argsB} = innerB._def

        if (argsA instanceof z.ZodObject && argsB instanceof z.ZodObject) {
          const {shape: shapeA} = argsA
          const {shape: shapeB} = argsB
          const areArgsDifferent = this.areArgumentShapesDifferent(shapeA, shapeB)
          mergedType = areArgsDifferent
            ? z.union([innerA, innerB])
            : z.function().args(this.mergeSchemas(argsA, argsB)).returns(z.string())
        } else {
          mergedType = z.union([innerA, innerB])
        }
      } catch (error) {
        this.log(`Error merging function arguments:`, error)
        mergedType = z.union([innerA, innerB])
      }
    } else if (typeNameA === 'ZodEnum' && typeNameB === 'ZodEnum') {
      // For enums, if they're the same, use one of them
      mergedType = JSON.stringify(valuesA) === JSON.stringify(valuesB) ? innerA : z.union([innerA, innerB])
    } else if (this.typesMatch(innerA, innerB)) {
      mergedType = this.handleEnum(innerA)
    } else {
      mergedType = z.union([innerA, innerB])
    }

    return shouldBeOptional ? mergedType.optional() : mergedType
  }

  private replaceStringsWithMustache(
    schema: z.ZodTypeAny,
    config: Config,
    schemaLocation: string[] = [],
  ): z.ZodTypeAny {
    const {typeName} = schema._def

    // Handle enums explicitly
    if (typeName === 'ZodEnum') {
      return schema
    }

    // Check for both direct string and optional string
    if (
      schema instanceof z.ZodString ||
      (schema instanceof z.ZodOptional && schema._def.innerType instanceof z.ZodString)
    ) {
      const stringsAtLocation = this.getAllStringsAtLocation(config, schemaLocation)
      if (schema instanceof z.ZodOptional) {
        return this.createZodFunctionFromMustacheStrings(stringsAtLocation).optional()
      }

      return this.createZodFunctionFromMustacheStrings(stringsAtLocation)
    }

    if (schema instanceof z.ZodObject) {
      const {shape} = schema
      const newShape: Record<string, z.ZodTypeAny> = {}

      for (const [key, value] of Object.entries(shape)) {
        newShape[key] = this.replaceStringsWithMustache(value as z.ZodTypeAny, config, [...schemaLocation, key])
      }

      return z.object(newShape)
    }

    // NOTE: no support for Mustache in Arrays or Unions

    // For all other types, just return as is
    return schema
  }

  private schemaToZod(config: Config, schemaConfig: Config): undefined | z.ZodTypeAny {
    // Extract the schema from the schema config
    for (const row of schemaConfig.rows) {
      for (const valueObj of row.values) {
        if (valueObj.value.schema?.schema) {
          const schemaStr = valueObj.value.schema.schema
          const result = secureEvaluateSchema(schemaStr)

          if (result.success && result.schema) {
            this.log(`Successfully parsed schema from schema config: ${schemaConfig.key}`)
            return result.schema
          }

          console.warn(`Failed to parse schema from schema config ${schemaConfig.key}: ${result.error}`)
        }
      }
    }

    return undefined
  }

  private typesMatch(typeA: ZodTypeAny, typeB: ZodTypeAny): boolean {
    const innerA = this.getInnerType(typeA)
    const innerB = this.getInnerType(typeB)
    const {typeName: typeNameA} = innerA._def
    const {typeName: typeNameB} = innerB._def
    return typeNameA === typeNameB
  }
}
