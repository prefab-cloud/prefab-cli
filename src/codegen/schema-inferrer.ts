import type {ZodObject, ZodRawShape, ZodTypeAny} from 'zod'

import {z} from 'zod'

import type {Config, ConfigFile} from './types.js'

import {MustacheExtractor} from './mustache-extractor.js'
import {secureEvaluateSchema} from './schema-evaluator.js'
import {ZodUtils} from './zod-utils.js'

export class SchemaInferrer {
  constructor(private log: (category: string | unknown, message?: unknown) => void) {}

  private jsonToInferredZod = (data: unknown): ZodTypeAny => {
    if (Array.isArray(data)) {
      // If it's an array, infer the type of its first element (assuming homogenous arrays)
      if (data.length > 0) {
        return z.array(this.jsonToInferredZod(data[0]))
      }

      return z.array(z.any()) // Empty arrays default to z.any()
    }

    if (typeof data === 'object' && data !== null) {
      // If it's an object, recursively infer the schema for each key
      const shape: Record<string, ZodTypeAny> = {}
      const dataRecord = data as Record<string, unknown>
      for (const key in dataRecord) {
        if (Object.hasOwn(dataRecord, key)) {
          shape[key] = this.jsonToInferredZod(dataRecord[key])
        }
      }

      return z.object(shape)
    }

    if (typeof data === 'string') {
      // Check if the string contains mustache templates
      const schema = MustacheExtractor.extractSchema(data, this.log)

      // If the schema has properties, it's a template string
      if (Object.keys(schema._def.shape()).length > 0) {
        return z.function().args(schema).returns(z.string())
      }

      // Otherwise it's a regular string
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
        // If both schemas have the key
        if (typeA instanceof z.ZodObject && typeB instanceof z.ZodObject) {
          // Recursively merge nested objects
          mergedShape[key] = this.mergeSchemas(typeA, typeB)
        } else if (typeA._def.typeName === 'ZodFunction' && typeB._def.typeName === 'ZodFunction') {
          // For functions, we need to check if their argument shapes are significantly different
          try {
            // Safely extract argument shapes
            const argsA = typeA._def.args
            const argsB = typeB._def.args

            let areArgsDifferent = true

            // Only proceed with detailed comparison if both are ZodObject types
            if (argsA instanceof z.ZodObject && argsB instanceof z.ZodObject) {
              areArgsDifferent = this.areArgumentShapesDifferent(argsA.shape, argsB.shape)
            }

            if (areArgsDifferent) {
              // If the argument structures are significantly different, use a union
              mergedShape[key] = z.union([typeA, typeB])
            } else {
              // If the argument structures are similar, merge them
              const mergedArgs = this.mergeSchemas(argsA as ZodObject<ZodRawShape>, argsB as ZodObject<ZodRawShape>)
              mergedShape[key] = z.function().args(mergedArgs).returns(z.string())
            }
          } catch (error) {
            // If there's any error in merging function args, fall back to using a union
            this.log(`Error merging function arguments for key ${key}:`, error)
            mergedShape[key] = z.union([typeA, typeB])
          }
        } else if (typeA._def.typeName === typeB._def.typeName) {
          // If types match, use one of them
          mergedShape[key] = typeA
        } else {
          // If types conflict, use a union
          mergedShape[key] = z.union([typeA, typeB])
        }
      } else {
        // If only one schema has the key, make it optional
        mergedShape[key] = z.optional(typeA || typeB)
      }
    }

    return z.object(mergedShape)
  }

  // return every template string. eg ["hello {{name}}", "goodbye {{person}}"]
  getAllTemplateStrings(config: Config): string[] {
    return config.rows.flatMap((row) =>
      row.values.flatMap((valueObj) => {
        if (valueObj.value.string) {
          return [valueObj.value.string]
        }

        // Handle JSON values that might contain templates
        if (valueObj.value.json?.json) {
          try {
            const jsonObj = JSON.parse(valueObj.value.json.json)
            // Recursively find all string values in the JSON object
            const jsonStrings: string[] = []

            JSON.stringify(jsonObj, (_, value) => {
              if (typeof value === 'string') {
                jsonStrings.push(value)
              }

              return value
            })

            return jsonStrings
          } catch (error) {
            console.warn(`Failed to parse JSON for ${config.key}:`, error)
            return []
          }
        }

        return []
      }),
    )
  }

  /**
   * Find a schema config by key
   */
  private findSchemaConfig(configFile: ConfigFile, schemaKey: string): Config | undefined {
    return configFile.configs.find((config) => config.configType === 'SCHEMA' && config.key === schemaKey)
  }

  /**
   * Extract schema from a schema config
   */
  private extractSchemaFromConfig(config: Config): z.ZodTypeAny | undefined {
    for (const row of config.rows) {
      for (const valueObj of row.values) {
        if (valueObj.value.schema?.schema) {
          const schemaStr = valueObj.value.schema.schema
          const result = secureEvaluateSchema(schemaStr)

          if (result.success && result.schema) {
            this.log(`Successfully parsed schema from schema config: ${config.key}`)
            return result.schema
          } else if (result.error) {
            console.warn(`Failed to parse schema from schema config ${config.key}: ${result.error}`)
          }
        }
      }
    }

    return undefined
  }

  /**
   * Process a schema to handle template strings within its structure
   * @param schema - The original schema from the schema config
   * @param config - The config to analyze for templates
   * @returns A schema with template strings converted to function types
   */
  private processSchemaForTemplates(schema: z.ZodTypeAny, config: Config): z.ZodTypeAny {
    // Get all template strings from the config
    const templateStrings = this.getAllTemplateStrings(config)

    if (templateStrings.length === 0) {
      // No templates to process, return the original schema
      return schema
    }

    // Create a map of template strings to their extracted schemas
    const templateSchemas = new Map<string, z.ZodObject<any>>()
    templateStrings.forEach((str) => {
      templateSchemas.set(str, MustacheExtractor.extractSchema(str, this.log))
    })

    // Process the schema recursively to transform string fields with templates
    return this.transformSchemaWithTemplates(schema, templateSchemas)
  }

  /**
   * Recursively transform a schema to handle template strings
   * @param schema - The schema to transform
   * @param templateSchemas - Map of template strings to their extracted schemas
   * @returns Transformed schema with template functions
   */
  private transformSchemaWithTemplates(
    schema: z.ZodTypeAny,
    templateSchemas: Map<string, z.ZodObject<any>>,
  ): z.ZodTypeAny {
    // This method is no longer used in our implementation
    // We're keeping it for now to avoid breaking existing code
    return schema
  }

  // For all values and recursively for all strings in json,
  infer(config: Config, configFile: ConfigFile): z.ZodTypeAny {
    const {schemaKey} = config
    const schemaConfig = schemaKey
      ? configFile.configs.find((c) => c.key === schemaKey && c.configType === 'SCHEMA')
      : undefined

    // If we have a schema config, try to extract and use the schema
    if (schemaConfig) {
      // Extract the schema from the schema config
      for (const row of schemaConfig.rows) {
        for (const valueObj of row.values) {
          if (valueObj.value.schema?.schema) {
            const schemaStr = valueObj.value.schema.schema
            const result = secureEvaluateSchema(schemaStr)

            if (result.success && result.schema) {
              this.log(`Successfully parsed schema from schema config: ${schemaConfig.key}`)

              // Get template strings from the config if any
              const templateStrings = this.getAllTemplateStrings(config)

              // If no templates, just return the schema as is
              if (templateStrings.length === 0) {
                return result.schema
              }

              // Otherwise do basic template processing
              this.log(`Processing schema with ${templateStrings.length} template strings`)

              // Parse the JSON config
              const jsonValues = this.getAllJsonValues(config)
              if (jsonValues.length === 0) {
                return result.schema
              }

              const jsonConfig = jsonValues[0] as Record<string, unknown>

              // Create a function schema for each template string found in the config
              if (result.schema instanceof z.ZodObject) {
                const shape = result.schema.shape
                const newShape: Record<string, z.ZodTypeAny> = {}

                // Process each property in the schema
                for (const key in shape) {
                  const value = shape[key]

                  // If the property is a string in schema and contains a template in the config
                  if (
                    value instanceof z.ZodString &&
                    jsonConfig &&
                    key in jsonConfig &&
                    typeof jsonConfig[key] === 'string' &&
                    (jsonConfig[key] as string).includes('{{')
                  ) {
                    // Extract template parameters and create a function schema
                    const templateStr = jsonConfig[key] as string
                    const schema = MustacheExtractor.extractSchema(templateStr, this.log)

                    // Only create a function if we found template parameters
                    if (Object.keys(schema.shape).length > 0) {
                      newShape[key] = z.function().args(schema).returns(z.string())
                    } else {
                      newShape[key] = value
                    }
                  }
                  // Handle nested objects recursively
                  else if (
                    value instanceof z.ZodObject &&
                    jsonConfig &&
                    key in jsonConfig &&
                    typeof jsonConfig[key] === 'object' &&
                    jsonConfig[key] !== null
                  ) {
                    const nestedShape = value.shape
                    const nestedConfig = jsonConfig[key] as Record<string, unknown>
                    const newNestedShape: Record<string, z.ZodTypeAny> = {}

                    for (const nestedKey in nestedShape) {
                      const nestedValue = nestedShape[nestedKey]

                      if (
                        nestedValue instanceof z.ZodString &&
                        nestedConfig &&
                        nestedKey in nestedConfig &&
                        typeof nestedConfig[nestedKey] === 'string' &&
                        (nestedConfig[nestedKey] as string).includes('{{')
                      ) {
                        const templateStr = nestedConfig[nestedKey] as string
                        const schema = MustacheExtractor.extractSchema(templateStr, this.log)

                        if (Object.keys(schema.shape).length > 0) {
                          newNestedShape[nestedKey] = z.function().args(schema).returns(z.string())
                        } else {
                          newNestedShape[nestedKey] = nestedValue
                        }
                      } else {
                        newNestedShape[nestedKey] = nestedValue
                      }
                    }

                    newShape[key] = z.object(newNestedShape)
                  } else {
                    newShape[key] = value
                  }
                }

                return z.object(newShape)
              }

              return result.schema
            } else if (result.error) {
              console.warn(`Failed to parse schema from schema config ${schemaConfig.key}: ${result.error}`)
            }
          }
        }
      }
    }

    // Fall back to normal inference if no schema or schema parsing failed
    switch (config.valueType) {
      case 'STRING': {
        const templateStrings = this.getAllTemplateStrings(config)

        if (templateStrings.length === 0) {
          return z.string()
        }

        // If multiple template strings, merge their schemas
        if (templateStrings.length > 1) {
          const schemas = templateStrings.map((str) => MustacheExtractor.extractSchema(str, this.log))

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

        const schema = MustacheExtractor.extractSchema(templateStrings[0], this.log)

        // If the schema is empty (no properties), just return basic string
        if (Object.keys(schema._def.shape()).length === 0) {
          return z.string()
        }

        return z.function().args(schema).returns(z.string())
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
        // Get all JSON values
        const jsonValues = this.getAllJsonValues(config)
        this.log('JSON values:', JSON.stringify(jsonValues, null, 2))

        if (jsonValues.length > 0) {
          try {
            // Infer schemas for all JSON values
            const schemas = jsonValues.map((json) => {
              const schema = this.jsonToInferredZod(json)
              this.log('Inferred schema for:', JSON.stringify(json))
              this.log('Schema:', ZodUtils.zodToString(schema, config.key))
              return schema
            })

            // Process each schema
            let mergedSchema: ZodTypeAny | null = null
            for (const [i, schema] of schemas.entries()) {
              this.log(`Processing schema ${i}:`, ZodUtils.zodToString(schema, config.key))

              if (mergedSchema === null) {
                mergedSchema = schema
              } else if (mergedSchema instanceof z.ZodObject && schema instanceof z.ZodObject) {
                mergedSchema = this.mergeSchemas(mergedSchema, schema)
                this.log('Merged result:', ZodUtils.zodToString(mergedSchema, config.key))
              }
            }

            if (mergedSchema) {
              this.log('Final merged schema:', ZodUtils.zodToString(mergedSchema, config.key))
              return mergedSchema
            }
          } catch (error) {
            console.warn(`Error inferring JSON schema for ${config.key}:`, error)
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
   * Extract the configuration data from a Config object
   * @param config The configuration to extract data from
   * @returns The extracted configuration data or undefined if not found
   */
  private extractConfig(config: Config): any {
    if (!config || !config.rows || config.rows.length === 0) {
      return undefined
    }

    // Get the first row's value
    const firstRow = config.rows[0]
    if (!firstRow || !firstRow.values || firstRow.values.length === 0) {
      return undefined
    }

    const firstValue = firstRow.values[0]

    if (!firstValue || !firstValue.value) {
      return undefined
    }

    // Extract JSON or string content based on value type
    if (config.valueType === 'JSON' && firstValue.value.json) {
      try {
        return JSON.parse(firstValue.value.json.json)
      } catch (error) {
        console.warn(`Failed to parse JSON from config ${config.key}:`, error)
        return undefined
      }
    } else if (config.valueType === 'STRING' && firstValue.value.string) {
      return firstValue.value.string
    }

    return undefined
  }
}
