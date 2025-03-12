import {camelCase} from 'change-case'
import {z} from 'zod'
import {SupportedLanguage} from './zod-generator.js'

export const ZodUtils = {
  /**
   * Generate TypeScript parameter type from Zod schema shape
   */
  generateParamsType(schemaShape: Record<string, z.ZodTypeAny>): string {
    const properties = Object.entries(schemaShape)
      .map(([key, type]) => {
        const typeString = this.zodTypeToTsType(type)
        return `${key}: ${typeString}`
      })
      .join('; ')

    return `{ ${properties} }`
  },

  /**
   * Generate code for transforming raw data based on a Zod schema
   * @param zodType The Zod schema
   * @param propertyPath Current property path for nested properties
   * @returns string representing the code to transform raw data
   */
  generateReturnValueCode(zodType: z.ZodTypeAny, propertyPath: string = '', language: SupportedLanguage): string {
    if (!zodType || !zodType._def) return 'raw'

    switch (zodType._def.typeName) {
      case 'ZodString':
      case 'ZodNumber':
      case 'ZodBoolean':
      case 'ZodNull':
      case 'ZodUndefined': {
        return propertyPath ? `raw${propertyPath}` : 'raw'
      }

      case 'ZodArray': {
        const elementCode = this.generateReturnValueCode(zodType._def.type, propertyPath, language)
        if (elementCode === 'raw') {
          return propertyPath ? `raw${propertyPath}` : 'raw'
        }

        return propertyPath ? `raw${propertyPath}` : 'raw'
      }

      case 'ZodObject': {
        const shape = zodType._def.shape()
        const props = []

        for (const key in shape) {
          if (Object.hasOwn(shape, key)) {
            // Always use bracket notation for consistency and to handle all edge cases
            const newPath = propertyPath ? `${propertyPath}["${key}"]` : `["${key}"]`
            const propCode = this.generateReturnValueCode(shape[key], newPath, language)

            const outputKey = `"${key}"`

            if (shape[key]._def.typeName === 'ZodFunction') {
              // Handle function within object directly
              props.push(`${outputKey}: ${propCode}`)
            } else if (propCode === `raw${newPath}`) {
              // Simple passthrough for primitive types
              props.push(`${outputKey}: raw${newPath}`)
            } else {
              // For complex types that aren't functions
              props.push(`${outputKey}: ${propCode}`)
            }
          }
        }

        if (props.length === 0) {
          return propertyPath ? `raw${propertyPath}` : 'raw'
        }

        return `{ ${props.join(', ')} }`
      }

      case 'ZodOptional': {
        const innerCode = this.generateReturnValueCode(zodType._def.innerType, propertyPath, language)
        if (innerCode === `raw${propertyPath}`) {
          return innerCode
        }

        return `raw${propertyPath} === undefined ? undefined : ${innerCode}`
      }

      case 'ZodFunction': {
        // For functions, we need special handling based on context
        const paramsSchema = this.paramsOf(zodType)
        const paramsType = paramsSchema ? this.zodTypeToTypescript(paramsSchema) : '{}'
        if (language === SupportedLanguage.TypeScript || language === SupportedLanguage.React) {
          return `(params: ${paramsType}) => Mustache.render(raw${propertyPath}, params)`
        } else {
          return `lambda params: pystache.render(raw${propertyPath}, params)`
        }
      }

      case 'ZodUnion': {
        // For union types, we need to examine each option
        const {options} = zodType._def

        // Check if any of the options are functions
        const hasFunctions = options.some((t: z.ZodTypeAny) => t._def.typeName === 'ZodFunction')

        if (hasFunctions) {
          // If we have functions in the union, we need to handle differently
          // For simplicity, use the first function type in the union
          for (const option of options) {
            if (option._def.typeName === 'ZodFunction') {
              return this.generateReturnValueCode(option, propertyPath, language)
            }
          }
        }

        // If no functions or a simpler case, just return raw value
        return propertyPath ? `raw${propertyPath}` : 'raw'
      }

      default: {
        return propertyPath ? `raw${propertyPath}` : 'raw'
      }
    }
  },

  /**
   * Convert config key to a valid method name
   *
   * This function handles several transformations:
   * 1. Replaces special characters with dots for word separation
   * 2. Converts snake_case and kebab-case to camelCase within parts
   * 3. Ensures the first character is valid for identifiers
   * 4. Preserves dot separators as underscores between parts
   */
  keyToMethodName(key: string): string {
    if (!key || key.trim() === '') {
      return '_empty_key'
    }

    // Step 1: Replace spaces with dots for consistent handling
    let processedKey = key.trim().replace(/\s+/g, '.')

    // Step 2: Replace special characters with dots (except underscores and hyphens)
    processedKey = processedKey.replace(/[^a-zA-Z0-9_\-.-]/g, '.')

    // Step 3: Replace consecutive dots with a single dot
    processedKey = processedKey.replace(/\.{2,}/g, '.')

    // Step 4: Split by dots and process each part
    const parts = processedKey.split('.').filter((part) => part.length > 0)

    if (parts.length === 0) {
      return '_empty_key'
    }

    // Step 5: Process each part
    const processedParts = parts.map((part, index) => {
      // Ensure part starts with an underscore if it begins with a digit
      if (/^\d/.test(part)) {
        part = '_' + part
      }

      // Handle uppercase snake case patterns specifically
      if (/^[A-Z_0-9]+$/.test(part)) {
        return part
          .toLowerCase()
          .split('_')
          .filter((word) => word.length > 0)
          .map((word, idx) => {
            // First word lowercase, subsequent words capitalized (camelCase)
            return idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          })
          .join('')
      }

      // Convert kebab-case to camelCase
      part = part.replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase())

      // Convert snake_case to camelCase
      part = part.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase())

      return part
    })

    // Step 6: Join parts with underscores
    const result = processedParts.join('_')

    // Step 7: Ensure the result is a safe identifier
    return this.makeSafeIdentifier(result)
  },

  /**
   * Convert a config key to a schema variable name
   */
  keyToSchemaName(key: string): string {
    // Convert key to method name and append Schema
    return this.keyToMethodName(key) + 'Schema'
  },

  /**
   * Ensure a string is a safe identifier for JavaScript and Python
   */
  makeSafeIdentifier(identifier: string): string {
    // Ensure it starts with a letter or underscore
    let result = identifier
    if (/^[^A-Z_a-z]/.test(result)) {
      result = '_' + result
    }

    // Replace invalid characters with underscores
    // Note: $ is allowed in JavaScript but not in Python, so we explicitly replace it
    result = result.replaceAll(/[^\w]|[$]/g, '_')

    // Avoid Python reserved keywords
    const pythonKeywords = [
      'False',
      'None',
      'True',
      'and',
      'as',
      'assert',
      'async',
      'await',
      'break',
      'class',
      'continue',
      'def',
      'del',
      'elif',
      'else',
      'except',
      'finally',
      'for',
      'from',
      'global',
      'if',
      'import',
      'in',
      'is',
      'lambda',
      'nonlocal',
      'not',
      'or',
      'pass',
      'raise',
      'return',
      'try',
      'while',
      'with',
      'yield',
    ]

    if (pythonKeywords.includes(result)) {
      result = result + '_'
    }

    return result
  },

  /**
   * Extract parameter schema from a Zod function schema
   * @param schema The Zod schema
   * @returns The parameters schema if it's a function, or undefined otherwise
   */
  paramsOf(schema: z.ZodTypeAny): undefined | z.ZodTypeAny {
    if (!schema || !schema._def) return undefined

    // Check if this is a function schema
    if (schema._def.typeName === 'ZodFunction') {
      // Get the args schema (which is actually a ZodTuple)
      const argsSchema = schema._def.args

      // If it's a tuple with a single item, return that item
      if (argsSchema._def.typeName === 'ZodTuple' && argsSchema._def.items && argsSchema._def.items.length === 1) {
        return argsSchema._def.items[0]
      }

      // Otherwise return the args schema as is
      return argsSchema
    }

    // Not a function, return undefined
    return undefined
  },

  /**
   * Simplify a Zod schema by replacing function types with their return types
   */
  simplifyFunctions(schema: z.ZodTypeAny): z.ZodTypeAny {
    if (!schema || !schema._def) return schema

    // Check for ZodFunction type
    if (schema._def.typeName === 'ZodFunction') {
      // Replace function with its return type
      return this.simplifyFunctions(schema._def.returns)
    }

    // Handle ZodObject recursively
    if (schema._def.typeName === 'ZodObject') {
      const shape = schema._def.shape()
      const newShape: Record<string, z.ZodTypeAny> = {}

      // Process each property
      for (const key in shape) {
        if (Object.hasOwn(shape, key)) {
          newShape[key] = this.simplifyFunctions(shape[key])
        }
      }

      return z.object(newShape)
    }

    // Handle ZodArray recursively
    if (schema._def.typeName === 'ZodArray') {
      const elementType = this.simplifyFunctions(schema._def.type)
      return z.array(elementType)
    }

    // Handle ZodOptional recursively
    if (schema._def.typeName === 'ZodOptional') {
      const innerType = this.simplifyFunctions(schema._def.innerType)
      return z.optional(innerType)
    }

    // Handle ZodUnion recursively
    if (schema._def.typeName === 'ZodUnion') {
      const options = schema._def.options.map((option: z.ZodTypeAny) => this.simplifyFunctions(option))
      return z.union(options)
    }

    // For all other types, return as is
    return schema
  },

  /**
   * Convert a Zod schema to its string representation
   */
  zodToString(schema: z.ZodType): string {
    // Keep using any for internal properties that aren't exposed in the type definitions
    const def = schema._def as any

    // Check for primitive types
    if (def.typeName === 'ZodString') {
      return 'z.string()'
    }

    if (def.typeName === 'ZodNumber') {
      // Check if this is an integer by examining the checks array
      if (def.checks && Array.isArray(def.checks)) {
        const hasIntCheck = def.checks.some((check: any) => check.kind === 'int')
        if (hasIntCheck) {
          return 'z.number().int()'
        }
      }

      return 'z.number()'
    }

    if (def.typeName === 'ZodBoolean') {
      return 'z.boolean()'
    }

    if (def.typeName === 'ZodNull') {
      return 'z.null()'
    }

    if (def.typeName === 'ZodUndefined') {
      return 'z.undefined()'
    }

    if (def.typeName === 'ZodArray') {
      const innerType = this.zodToString(def.type)
      return `z.array(${innerType})`
    }

    // Handle ZodOptional
    if (def.typeName === 'ZodOptional') {
      const innerType = this.zodToString(def.innerType)
      return `${innerType}.optional()`
    }

    // Handle ZodUnion
    if (def.typeName === 'ZodUnion') {
      const options = def.options.map((option: z.ZodType) => this.zodToString(option))
      return `z.union([${options.join(', ')}])`
    }

    // Handle ZodFunction
    if (def.typeName === 'ZodFunction') {
      // Handle the arguments
      const argsSchema = def.args
      const returnsSchema = def.returns

      return `z.function().args(${this.zodToString(argsSchema)}).returns(${this.zodToString(returnsSchema)})`
    }

    // Handle ZodTuple (used for function args)
    if (def.typeName === 'ZodTuple') {
      if (def.items && def.items.length === 1) {
        return this.zodToString(def.items[0])
      }

      return this.zodToString(def.items[0]) // Just take the first item for simplicity
    }

    // Handle ZodObject
    if (def.typeName === 'ZodObject') {
      const shape = def.shape()
      const props = Object.entries(shape)
        .map(([key, value]) => `${key}: ${this.zodToString(value as z.ZodTypeAny)}`)
        .join(', ')

      return `z.object({${props}})`
    }

    console.warn('Unknown zod type:', schema)
    return 'z.any()'
  },

  /**
   * Convert Zod types to TypeScript type strings
   */
  zodTypeToTsType(zodType: z.ZodTypeAny): string {
    if (zodType instanceof z.ZodString) {
      return 'string'
    }

    if (zodType instanceof z.ZodNumber) {
      return 'number'
    }

    if (zodType instanceof z.ZodBoolean) {
      return 'boolean'
    }

    if (zodType instanceof z.ZodArray) {
      // Recursively get the type of array elements
      return `Array<${this.zodTypeToTsType(zodType.element)}>`
    }

    if (zodType instanceof z.ZodObject) {
      const shape = zodType._def.shape()
      const innerProps = Object.entries(shape)
        .map(([k, v]) => {
          const isOptional = v instanceof z.ZodOptional
          const typeString = this.zodTypeToTsType(v as z.ZodTypeAny)
          return `${k}${isOptional ? '?' : ''}: ${typeString}`
        })
        .join('; ')
      return `{ ${innerProps} }`
    }

    if (zodType instanceof z.ZodOptional) {
      // Return the unwrapped type without adding the optional marker here
      // The '?' will be added to the property name in the parent context
      return this.zodTypeToTsType(zodType.unwrap())
    }

    if (zodType instanceof z.ZodEnum) {
      // Handle enum types
      const {values} = zodType._def
      return values.map((v: string) => `"${v}"`).join(' | ')
    }

    // Default fallback
    return 'any'
  },

  // Convert a Zod type to its TypeScript equivalent
  zodTypeToTypescript(zodType: z.ZodTypeAny): string {
    if (!zodType || !zodType._def) return 'any'

    switch (zodType._def.typeName) {
      case 'ZodString': {
        return 'string'
      }

      case 'ZodNumber': {
        return 'number'
      }

      case 'ZodBoolean': {
        return 'boolean'
      }

      case 'ZodNull': {
        return 'null'
      }

      case 'ZodUndefined': {
        return 'undefined'
      }

      case 'ZodArray': {
        const innerType = this.zodTypeToTypescript(zodType._def.type)
        return `${innerType}[]`
      }

      case 'ZodObject': {
        const shape = zodType._def.shape()
        const props = []
        for (const key in shape) {
          if (Object.hasOwn(shape, key)) {
            const propType = this.zodTypeToTypescript(shape[key])
            props.push(`${key}: ${propType}`)
          }
        }

        return `{ ${props.join('; ')} }`
      }

      case 'ZodEnum': {
        const options = zodType._def.values
        return options.map((o: string) => `'${o}'`).join(' | ')
      }

      case 'ZodUnion': {
        const unionTypes = zodType._def.options.map((t: z.ZodTypeAny) => {
          const typeString = this.zodTypeToTypescript(t)
          // If it's a function type (contains => notation), wrap it in parentheses
          if (typeString.includes('=>')) {
            return `(${typeString})`
          }

          return typeString
        })
        return unionTypes.join(' | ')
      }

      case 'ZodFunction': {
        const paramsSchema = this.paramsOf(zodType)
        const paramsType = paramsSchema ? this.zodTypeToTypescript(paramsSchema) : '{}'
        const returnType = this.zodTypeToTypescript(zodType._def.returns)
        return `(params: ${paramsType}) => ${returnType}`
      }

      default: {
        return 'any'
      }
    }
  },
}
