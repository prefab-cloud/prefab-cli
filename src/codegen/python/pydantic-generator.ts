/**
 * Complete solution for generating Pydantic models and client classes from Zod schemas
 * with fixed duration detection and clean ESLint compliance
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'
import {z} from 'zod'
import {ZodUtils} from '../zod-utils.js'

// Type definitions with all required properties
type ZodTypeDef = {
  typeName?: string
  checks?: Array<{kind: string; value?: unknown; regex?: RegExp}>
  shape?: () => Record<string, z.ZodTypeAny>
  innerType?: z.ZodTypeAny
  options?: z.ZodTypeAny[]
  valueType?: z.ZodTypeAny
  keyType?: z.ZodTypeAny
  element?: z.ZodTypeAny
  type?: z.ZodTypeAny // Added this property
  items?: z.ZodTypeAny[]
  values?: string[]
  description?: string
  meta?: Record<string, unknown>
  validators?: Array<{name: string}>
  value?: unknown
}

type UnifiedGeneratorOptions = {
  outputPath?: string
  className?: string
  prefixName?: string
}

type MethodParam = {
  name: string
  type: string
  default?: string
}

// Utility functions
function isZodType(obj: unknown): obj is z.ZodTypeAny {
  return obj instanceof z.ZodType
}

function getTypeDef(schema: z.ZodTypeAny): ZodTypeDef {
  return (schema as {_def: ZodTypeDef})._def
}

/**
 * Import collector for tracking and organizing imports
 */
class ImportCollector {
  private typingImports: Set<string> = new Set()
  private standardImports: Set<string> = new Set()
  private fromImports: Map<string, Set<string>> = new Map()

  /**
   * Add a typing import
   */
  addTypingImport(name: string): void {
    this.typingImports.add(name)
  }

  /**
   * Add a standard import
   */
  addStandardImport(name: string): void {
    this.standardImports.add(name)
  }

  /**
   * Add a from import (e.g., 'from X import Y')
   */
  addFromImport(from: string, name: string): void {
    if (!this.fromImports.has(from)) {
      this.fromImports.set(from, new Set())
    }

    this.fromImports.get(from)?.add(name)
  }

  /**
   * Get all imports as formatted Python import statements
   */
  getImportStatements(): string[] {
    const statements: string[] = []

    // Add typing imports
    if (this.typingImports.size > 0) {
      statements.push(`from typing import ${Array.from(this.typingImports).sort().join(', ')}`)
    }

    // Add standard imports
    for (const imp of Array.from(this.standardImports).sort()) {
      statements.push(`import ${imp}`)
    }

    // Add from imports
    for (const [from, names] of Array.from(this.fromImports.entries()).sort()) {
      statements.push(`from ${from} import ${Array.from(names).sort().join(', ')}`)
    }

    return statements
  }

  /**
   * Generate the complete import section
   */
  getImportSection(): string {
    return this.getImportStatements().join('\n')
  }
}

/**
 * Improved duration detection logic
 */
function isDurationSchema(schema: z.ZodTypeAny): boolean {
  // Direct check using the schema's isDuration method
  return typeof (schema as any).isDuration === 'function' && (schema as any).isDuration()
}

/**
 * Analyze a schema to determine required imports
 */
function analyzeSchemaImports(schema: z.ZodTypeAny, imports: ImportCollector): void {
  if (!isZodType(schema)) {
    return
  }

  if (schema instanceof z.ZodObject) {
    imports.addFromImport('pydantic', 'BaseModel')

    // Process all fields recursively
    const typeDef = getTypeDef(schema)
    const shape = typeDef.shape ? typeDef.shape() : {}

    for (const fieldSchema of Object.values(shape)) {
      if (isZodType(fieldSchema)) {
        analyzeSchemaImports(fieldSchema, imports)
      }
    }
  } else if (schema instanceof z.ZodArray) {
    imports.addTypingImport('List')

    // Process element type
    const typeDef = getTypeDef(schema)

    if (typeDef.type && isZodType(typeDef.type)) {
      analyzeSchemaImports(typeDef.type, imports)
    }
  } else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    imports.addTypingImport('Optional')

    // Process inner type
    const typeDef = getTypeDef(schema)

    if (typeDef.innerType && isZodType(typeDef.innerType)) {
      analyzeSchemaImports(typeDef.innerType, imports)
    }
  } else if (schema instanceof z.ZodUnion) {
    imports.addTypingImport('Union')

    // Process all union options
    const typeDef = getTypeDef(schema)

    if (typeDef.options) {
      for (const option of typeDef.options) {
        if (isZodType(option)) {
          analyzeSchemaImports(option, imports)
        }
      }
    }
  } else if (schema instanceof z.ZodRecord || schema instanceof z.ZodMap) {
    imports.addTypingImport('Dict')

    // Check key and value types
    const typeDef = getTypeDef(schema)

    if (schema instanceof z.ZodRecord) {
      if (typeDef.valueType && isZodType(typeDef.valueType)) {
        analyzeSchemaImports(typeDef.valueType, imports)
      }
    } else {
      if (typeDef.keyType && isZodType(typeDef.keyType)) {
        analyzeSchemaImports(typeDef.keyType, imports)
      }

      if (typeDef.valueType && isZodType(typeDef.valueType)) {
        analyzeSchemaImports(typeDef.valueType, imports)
      }
    }
  } else if (schema instanceof z.ZodTuple) {
    imports.addTypingImport('Tuple')

    // Process tuple items
    const typeDef = getTypeDef(schema)

    if (typeDef.items) {
      for (const item of typeDef.items) {
        if (isZodType(item)) {
          analyzeSchemaImports(item, imports)
        }
      }
    }
  } else if (schema instanceof z.ZodDate) {
    imports.addStandardImport('datetime')
  } else if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
    imports.addTypingImport('Any')
  }

  // Special case for duration strings with the fixed detection logic
  if (schema instanceof z.ZodString && isDurationSchema(schema)) {
    imports.addFromImport('datetime', 'timedelta')
  }
}

/**
 * Utility to add a type name to a Zod schema
 */
export function withTypeName<T extends z.ZodTypeAny>(schema: T, typeName: string): T {
  return schema.describe(typeName)
}

/**
 * Creates a schema factory function that automatically adds a type name
 */
export function defineType<T extends z.ZodRawShape>(typeName: string) {
  return {
    schema: (properties: T) => withTypeName(z.object(properties), typeName),
  }
}

/**
 * Main class for generating Pydantic models and Python client from Zod schemas
 */
export class UnifiedPythonGenerator {
  // Make these protected instead of private so tests can access them
  protected imports: ImportCollector = new ImportCollector()
  protected models: Map<string, string> = new Map()
  protected methods: Map<
    string,
    {
      returnType: string
      params: MethodParam[]
      docstring: string
      valueType?: string
      hasTemplateParams?: boolean
      paramClassName?: string
    }
  > = new Map()
  protected paramClasses: Map<string, { fields: Array<{ name: string, type: string }> }> = new Map()

  constructor(private options: UnifiedGeneratorOptions = {}) {
    // Add base imports for the client
    this.imports.addStandardImport('os')
    this.imports.addTypingImport('Optional')
  }

  /**
   * Register a schema for use as a model
   */
  registerModel(schema: z.ZodTypeAny, baseName: string, valueType?: string): string {
    // If valueType is provided, use it to determine the return type for primitives
    if (valueType) {
      switch (valueType.toUpperCase()) {
        case 'BOOL':
          return 'bool'
        case 'STRING':
          return 'str'
        case 'INT':
          return 'int'
        case 'DOUBLE':
          return 'float'
        case 'STRING_LIST':
          this.imports.addTypingImport('List')
          return 'List[str]'
      }
    }

    // For basic types, return their Python type directly
    if (schema instanceof z.ZodString) {
      return 'str'
    }
    if (schema instanceof z.ZodNumber) {
      const typeDef = getTypeDef(schema)
      return typeDef.checks?.some((check) => check.kind === 'int') ? 'int' : 'float'
    }
    if (schema instanceof z.ZodBoolean) {
      return 'bool'
    }
    if (schema instanceof z.ZodDate) {
      return 'datetime.datetime'
    }

    // Special case for arrays of basic types - return List[elementType] directly
    if (schema instanceof z.ZodArray) {
      const typeDef = getTypeDef(schema)
      if (typeDef.type && isZodType(typeDef.type)) {
        // Check if the element type is a basic type
        if (
          typeDef.type instanceof z.ZodString ||
          typeDef.type instanceof z.ZodNumber ||
          typeDef.type instanceof z.ZodBoolean
        ) {
          const elementType = this.registerModel(typeDef.type, 'Element')
          this.imports.addTypingImport('List')
          return `List[${elementType}]`
        }
      }
    }

    // Extract name from schema if possible
    const extractedName = this.extractSchemaName(schema)
    const className = this.generateClassName(extractedName || baseName)

    // If we already have this model, return the existing name
    for (const [existingName, existingModel] of this.models.entries()) {
      if (this.equivalentSchemas(schema, existingModel)) {
        return existingName
      }
    }

    // Analyze schema for imports
    analyzeSchemaImports(schema, this.imports)

    // Generate model code
    const modelCode = this.generatePydanticModel(schema, className)
    this.models.set(className, modelCode)

    return className
  }

  /**
   * Register a method that returns a Pydantic model
   */
  registerMethod(
    methodName: string,
    returnSchema: z.ZodTypeAny,
    schemaName?: string,
    params: MethodParam[] = [],
    docstring?: string,
    valueType?: string,
  ): void {
    // Register the return type schema, passing along the valueType
    const derivedSchemaName = schemaName || this.deriveSchemaNameFromMethod(methodName)
    const returnType = this.registerModel(returnSchema, derivedSchemaName, valueType)
    
    // Check if this is a template function (has template parameters)
    const templateParams = ZodUtils.paramsOf(returnSchema)
    let hasTemplateParams = false
    let paramClassName: string | undefined = undefined
    
    if (templateParams && isZodType(templateParams)) {
      hasTemplateParams = true
      // Generate a parameter class for the template parameters
      paramClassName = this.generateParamClass(methodName, templateParams)
      
      // Add pystache import for template rendering
      this.imports.addStandardImport('pystache')
    }

    // Store the method spec
    this.methods.set(methodName, {
      returnType,
      params,
      docstring: docstring || `Get ${derivedSchemaName}`,
      valueType,
      hasTemplateParams,
      paramClassName
    })
  }

  /**
   * Generate a parameter class for template parameters
   */
  public generateParamClass(methodName: string, paramsSchema: z.ZodTypeAny): string {
    // Generate a class name based on the method name
    const className = `${this.deriveSchemaNameFromMethod(methodName)}Params`
    
    // Only process object schemas
    if (paramsSchema instanceof z.ZodObject) {
      const typeDef = getTypeDef(paramsSchema)
      const shape = typeDef.shape ? typeDef.shape() : {}
      
      const fields: Array<{ name: string, type: string }> = []
      
      // Process each field in the parameters schema
      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        if (isZodType(fieldSchema)) {
          const fieldType = this.getPydanticType(fieldSchema)
          fields.push({ name: fieldName, type: fieldType })
        }
      }
      
      // Store the parameter class information
      this.paramClasses.set(className, { fields })
      
      return className
    }
    
    // For non-object schemas, create a wrapper class with a single value field
    const singleParamClassName = `${this.deriveSchemaNameFromMethod(methodName)}Param`
    const valueType = this.getPydanticType(paramsSchema)
    this.paramClasses.set(singleParamClassName, { 
      fields: [{ name: 'value', type: valueType }] 
    })
    
    return singleParamClassName
  }

  /**
   * Generate a single Python file with both models and methods
   */
  generatePythonFile(): string {
    // Calculate imports
    const {imports, typingImports, needsJson} = this.calculateNeededImports()

    // Add json import only if needed
    if (needsJson) {
      imports.push('import json')
    }
    
    // Always add typing imports for proper method signatures
    imports.push(`from typing import ${typingImports.sort().join(', ')}`)

    // Generate the imports section
    let pythonCode = imports.sort().join('\n') + '\n\n'
    pythonCode += 'logger = logging.getLogger(__name__)\n\n'

    // Add the import collector's imports
    pythonCode += this.imports.getImportSection() + '\n\n'
    
    // Add parameter classes if we have any
    if (this.paramClasses.size > 0) {
      pythonCode += this.generateParamClasses() + '\n'
    }

    // Add all models
    for (const modelCode of this.models.values()) {
      pythonCode += modelCode + '\n\n'
    }

    // Add the client class
    pythonCode += this.generateClientClass()

    return pythonCode
  }
  
  /**
   * Generate parameter classes for template parameters
   */
  public generateParamClasses(): string {
    let result = ''
    
    for (const [className, classInfo] of this.paramClasses.entries()) {
      result += `@dataclass\nclass ${className}:\n`
      
      if (classInfo.fields.length === 0) {
        result += '    pass\n\n'
        continue
      }
      
      for (const field of classInfo.fields) {
        result += `    ${field.name}: ${field.type}\n`
      }
      
      result += '\n'
    }
    
    return result
  }

  /**
   * Generate the client class with all methods
   */
  public generateClientClass(): string {
    const className = this.options.className || 'ConfigClient'

    let code = `class ${className}(Client):
    """Client for accessing Prefab configuration with type-safe methods"""
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        Initialize the Prefab config client
        
        Args:
            api_key: API key for authentication (defaults to env var PREFAB_API_KEY)
            base_url: Base URL for the API (defaults to production)
        """
        super().__init__(api_key=api_key, base_url=base_url)
`

    // Add all methods
    for (const [methodName, methodSpec] of this.methods.entries()) {
      code += this.generateMethodCode(methodName, methodSpec)
    }

    return code
  }

  /**
   * Generate code for a single method
   */
  public generateMethodCode(
    methodName: string,
    spec: {
      returnType: string
      params: MethodParam[]
      docstring: string
      valueType?: string
      hasTemplateParams?: boolean
      paramClassName?: string
    },
  ): string {
    // Build the parameter definition with properly typed context and default
    const paramsList = ['self']
    if (spec.params.length > 0) {
      paramsList.push(
        ...spec.params.map((p) =>
          p.default !== undefined ? `${p.name}: ${p.type} = ${p.default}` : `${p.name}: ${p.type}`,
        ),
      )
    }
    
    // Add template parameters if needed
    if (spec.hasTemplateParams && spec.paramClassName) {
      paramsList.push(`params: Optional[${spec.paramClassName}] = None`)
    }
    
    // Use proper type annotations for context and default
    paramsList.push('context: Optional[Union[dict, Context]] = None')
    paramsList.push(`default: Optional[${spec.returnType}] = None`)
    const paramsDef = paramsList.join(', ')

    // Build parameter documentation
    let paramsDoc = [
      ...spec.params.map((p) => `            ${p.name}: Description of ${p.name}`),
    ]
    
    if (spec.hasTemplateParams) {
      paramsDoc.push(`            params: Parameters for template rendering`)
    }
    
    paramsDoc = [
      ...paramsDoc,
      '            context: Optional context for the config lookup',
      `            default: Optional default value to return if config lookup fails or doesn\'t match expected type`,
    ]
    
    const paramsDocStr = paramsDoc.join('\n')

    // Create additional return value documentation for template methods
    let returnTypeDocStr = `${spec.returnType}: The configuration value`
    if (spec.hasTemplateParams) {
      returnTypeDocStr = `${spec.returnType}: If 'params' is provided, returns the template rendered with those parameters.
            If 'params' is None, returns the raw template string without rendering.`
    }

    // Determine if return type is a basic type
    const isBasicType = ['str', 'int', 'float', 'bool', 'datetime.datetime', 'List[str]'].includes(spec.returnType)
    
    // Generate value extraction with template support
    const valueExtraction = this.generateValueExtraction(
      spec.returnType, 
      isBasicType, 
      spec.valueType, 
      spec.hasTemplateParams
    )

    // Generate the method code
    return `
    def ${methodName}(${paramsDef}) -> ${spec.returnType}:
        """
        ${spec.docstring}

        Args:
${paramsDocStr}
        
        Returns:
            ${returnTypeDocStr}
        """
        try:
            config_value = self.get("${methodName}", context=context)
            if config_value is None:
                return default
${valueExtraction}
            return default
        except Exception as e:
            logger.warning(f"Error getting config '${methodName}': {e}")
            return default
`
  }

  /**
   * Generate value extraction code based on return type and value type
   */
  public generateValueExtraction(
    returnType: string, 
    isBasicType: boolean, 
    valueType?: string,
    hasTemplateParams?: boolean
  ): string {
    // String extraction with template support
    if (returnType === 'str' || (valueType && valueType.toUpperCase() === 'STRING')) {
      const extraction = `            if config_value.HasField('string'):
                raw = config_value.string`
      
      if (hasTemplateParams) {
        return `${extraction}
                return pystache.render(raw, params.__dict__) if params else raw`
      }
      return `${extraction}
                return raw`
    }
    
    // For other basic types, use the existing extraction logic
    if (isBasicType) {
      // Use valueType to determine which field to extract, then fall back to type-based inference
      if (valueType) {
        switch (valueType.toUpperCase()) {
          case 'INT':
            return `            if config_value.HasField('int'):
                return config_value.int`
          case 'DOUBLE':
            return `            if config_value.HasField('double'):
                return config_value.double`
          case 'BOOL':
            return `            if config_value.HasField('bool'):
                return config_value.bool`
          case 'STRING_LIST':
            return `            if config_value.HasField('string_list'):
                return config_value.string_list.values`
          case 'JSON':
            return `            if config_value.HasField('json'):
                return json.loads(config_value.json.json) if returnType == 'dict' else config_value.json.json`
          case 'DURATION':
            if (returnType === 'datetime.timedelta') {
              return `            if config_value.HasField('duration'):
                return parse_duration(config_value.duration.definition)`
            } else {
              return `            if config_value.HasField('duration'):
                return config_value.duration.definition`
            }
        }
      }

      // Fall back to type-based inference if valueType is not provided or not recognized
      switch (returnType) {
        case 'int':
          return `            if config_value.HasField('int'):
                return config_value.int`
        case 'float':
          return `            if config_value.HasField('double'):
                return config_value.double`
        case 'bool':
          return `            if config_value.HasField('bool'):
                return config_value.bool`
        case 'List[str]':
          return `            if config_value.HasField('string_list'):
                return config_value.string_list.values`
        case 'datetime.datetime':
          return `            if config_value.HasField('string'):
                try:
                    return datetime.datetime.fromisoformat(config_value.string)
                except ValueError:
                    pass`
        case 'datetime.timedelta':
          return `            if config_value.HasField('duration'):
                return parse_duration(config_value.duration.definition)`
        default:
          return ''
      }
    } else {
      // For complex types, use valueType if available to determine the field
      if (valueType && valueType.toUpperCase() === 'JSON') {
        return `            if config_value.HasField('json'):
                try:
                    data = json.loads(config_value.json.json)
                    return ${returnType}(**data)
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.warning(f"Failed to parse JSON config value as {${returnType}.__name__}: {e}")`
      }

      // Default to checking JSON field
      return `            if config_value.HasField('json'):
                try:
                    data = json.loads(config_value.json.json)
                    return ${returnType}(**data)
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.warning(f"Failed to parse JSON config value as {${returnType}.__name__}: {e}")`
    }
  }

  /**
   * Generate Pydantic model code for a schema
   */
  public generatePydanticModel(schema: z.ZodTypeAny, className: string): string {
    let modelCode = `class ${className}(BaseModel):\n`

    if (schema instanceof z.ZodObject) {
      const typeDef = getTypeDef(schema)
      const shape = typeDef.shape ? typeDef.shape() : {}
      const fields = Object.entries(shape)

      if (fields.length === 0) {
        modelCode += '    pass\n'
        return modelCode
      }

      for (const [fieldName, fieldSchema] of fields) {
        if (isZodType(fieldSchema)) {
          const fieldType = this.getPydanticType(fieldSchema)
          modelCode += `    ${fieldName}: ${fieldType}\n`
        }
      }
    } else {
      // For non-object schemas, create a wrapper
      modelCode += `    value: ${this.getPydanticType(schema)}\n`
    }

    return modelCode
  }

  /**
   * Get the Pydantic type for a Zod schema
   */
  private getPydanticType(schema: z.ZodTypeAny): string {
    if (schema instanceof z.ZodString) {
      // Check for duration with the fixed detection
      if (isDurationSchema(schema)) {
        return 'timedelta'
      }

      return 'str'
    }

    if (schema instanceof z.ZodNumber) {
      // Check if it's an integer
      const typeDef = getTypeDef(schema)

      if (typeDef.checks?.some((check) => check.kind === 'int')) {
        return 'int'
      }

      return 'float'
    }

    if (schema instanceof z.ZodBoolean) {
      return 'bool'
    }

    if (schema instanceof z.ZodArray) {
      const typeDef = getTypeDef(schema)

      if (typeDef.type && isZodType(typeDef.type)) {
        const elementType = this.getPydanticType(typeDef.type)
        return `List[${elementType}]`
      }

      return 'List[Any]'
    }

    if (schema instanceof z.ZodObject) {
      // For nested objects, we register them as models
      const className = this.registerModel(schema, 'NestedModel')
      return className
    }

    if (schema instanceof z.ZodOptional) {
      const typeDef = getTypeDef(schema)

      if (typeDef.innerType && isZodType(typeDef.innerType)) {
        const innerType = this.getPydanticType(typeDef.innerType)
        return `Optional[${innerType}]`
      }

      return 'Optional[Any]'
    }

    if (schema instanceof z.ZodUnion) {
      const typeDef = getTypeDef(schema)

      if (typeDef.options) {
        const options = typeDef.options.filter(isZodType).map((option) => this.getPydanticType(option))

        return `Union[${options.join(', ')}]`
      }

      return 'Any'
    }

    if (schema instanceof z.ZodRecord) {
      const typeDef = getTypeDef(schema)

      if (typeDef.valueType && isZodType(typeDef.valueType)) {
        const valueType = this.getPydanticType(typeDef.valueType)
        return `Dict[str, ${valueType}]`
      }

      return 'Dict[str, Any]'
    }

    if (schema instanceof z.ZodDate) {
      return 'datetime.datetime'
    }

    // Default fallback
    return 'Any'
  }

  /**
   * Extract a type name from a Zod schema
   */
  private extractSchemaName(schema: z.ZodTypeAny): string | undefined {
    if (!isZodType(schema)) {
      return undefined
    }

    const typeDef = getTypeDef(schema)

    // Check for explicit type name in description
    if (typeDef.description) {
      // If description is a valid type name, use it
      if (/^[A-Z][a-zA-Z0-9]*$/.test(typeDef.description)) {
        return typeDef.description
      }
    }

    // Check for metadata with explicit type name
    if (typeDef.meta && typeof typeDef.meta.typeName === 'string') {
      return typeDef.meta.typeName as string
    }

    // For object types, check if we have a TypeName property
    if (schema instanceof z.ZodObject && typeDef.shape) {
      const shape = typeDef.shape()

      // Check for typeName property
      if ('typeName' in shape && isZodType(shape.typeName) && shape.typeName instanceof z.ZodString) {
        const stringTypeDef = getTypeDef(shape.typeName)
        return stringTypeDef.description
      }

      // Check for type literal field
      if ('type' in shape && isZodType(shape.type) && shape.type instanceof z.ZodLiteral) {
        const literalTypeDef = getTypeDef(shape.type)

        if (typeof literalTypeDef.value === 'string' && /^[A-Z][a-zA-Z0-9]*$/.test(literalTypeDef.value as string)) {
          return literalTypeDef.value as string
        }
      }
    }

    // Default case - no explicit name found
    return undefined
  }

  /**
   * Generate a unique class name
   */
  private generateClassName(baseName: string): string {
    // Clean the base name
    const cleanName = baseName
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/(^[a-z])|(_[a-z])/g, (match) => match.toUpperCase())
      .replace(/_/g, '')

    // Add the prefix if specified
    const prefix = this.options.prefixName || ''
    let candidateName = `${prefix}${cleanName}Model`

    // Ensure uniqueness
    let counter = 1

    while (this.models.has(candidateName)) {
      candidateName = `${prefix}${cleanName}Model${counter}`
      counter++
    }

    return candidateName
  }

  /**
   * Check if two schemas are equivalent
   * This is a simplistic approach - production code would be more thorough
   */
  private equivalentSchemas(schema1: z.ZodTypeAny, schema2: string | z.ZodTypeAny): boolean {
    // This is a simple check - real implementation would be more comprehensive
    if (typeof schema2 === 'string') {
      return false // Can't compare a schema to a string directly
    }

    // For object schemas, compare their shape
    if (schema1 instanceof z.ZodObject && schema2 instanceof z.ZodObject) {
      const shape1 = JSON.stringify((schema1 as any)._def.shape())
      const shape2 = JSON.stringify((schema2 as any)._def.shape())

      return shape1 === shape2
    }

    return false
  }

  /**
   * Derive a schema name from a method name
   * For example: getResourceConfig -> Resource
   */
  private deriveSchemaNameFromMethod(methodName: string): string {
    // Try to extract a meaningful name from common prefixes
    const prefixMatches = methodName.match(
      /^(?:get|fetch|retrieve|load)([A-Z][a-zA-Z0-9]*)(?:Config|Schema|Data|Info)?$/,
    )

    if (prefixMatches && prefixMatches[1]) {
      return prefixMatches[1] // Return the extracted resource name
    }

    // For methods like userProfile, extract "User"
    const camelCaseMatch = methodName.match(/^([a-z]+)([A-Z][a-zA-Z0-9]*)$/)

    if (camelCaseMatch && camelCaseMatch[2]) {
      return camelCaseMatch[2]
    }

    // Fallback: convert method name to PascalCase
    return methodName
      .replace(/^[a-z]/, (match) => match.toUpperCase())
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  /**
   * Determines if a return type is a basic type
   */
  public isBasicType(returnType: string): boolean {
    return ['str', 'int', 'float', 'bool', 'datetime.datetime', 'List[str]'].includes(returnType)
  }

  /**
   * Calculate needed imports based on methods and models
   * @returns An object with needed imports information
   */
  public calculateNeededImports(): {
    imports: string[]
    typingImports: string[]
    needsJson: boolean
  } {
    const neededImports = new Set<string>()

    // Add base imports that are always needed
    neededImports.add('import logging')
    neededImports.add('from prefab_cloud_python import Client, Context')
    neededImports.add('from prefab_cloud_python.client import ConfigValue')
    
    // Add dataclasses if we have parameter classes
    if (this.paramClasses.size > 0) {
      neededImports.add('from dataclasses import dataclass')
    }

    // Track required typing imports - we will need these for proper method signatures
    const typingImports = new Set<string>(['Optional', 'Union'])

    // Check if we have any complex models that require Pydantic
    const hasPydanticModels = this.models.size > 0
    let needsJson = false
    let needsDatetime = false

    if (hasPydanticModels) {
      neededImports.add('from pydantic import BaseModel, ValidationError')
      needsJson = true // Complex models will need JSON parsing
    }

    // Check types used in methods and add required imports
    for (const method of this.methods.values()) {
      // Check for timestamp handling methods - force datetime import
      if (
        method.docstring &&
        (method.docstring.toLowerCase().includes('timestamp') ||
          method.docstring.toLowerCase().includes('date') ||
          method.docstring.toLowerCase().includes('time'))
      ) {
        needsDatetime = true
      }

      // Check for datetime types
      if (method.returnType === 'datetime.datetime' || method.returnType.includes('datetime.datetime')) {
        needsDatetime = true
      }
      if (method.returnType === 'datetime.timedelta' || method.returnType.includes('datetime.timedelta')) {
        neededImports.add('from datetime import timedelta')
        neededImports.add('from prefab_cloud_python.utils import parse_duration')
      }

      // Check for List types
      if (method.returnType === 'List[str]' || method.returnType.includes('List[')) {
        typingImports.add('List')
      }

      // Check for Dict types
      if (method.returnType.includes('Dict[') || method.returnType === 'Dict') {
        typingImports.add('Dict')
        needsJson = true // Dictionary handling likely needs JSON
      }

      // Check for Any usage
      if (method.returnType === 'Any' || method.returnType.includes('Any')) {
        typingImports.add('Any')
      }

      // Check for JSON field extraction
      if (method.valueType && method.valueType.toUpperCase() === 'JSON') {
        needsJson = true
        // We need ValidationError for JSON parsing
        if (!hasPydanticModels) {
          neededImports.add('from pydantic import ValidationError')
        }
      }

      // Check for STRING_LIST which needs List import
      if (method.valueType && method.valueType === 'STRING_LIST') {
        typingImports.add('List')
      }
    }

    // Add datetime import if needed
    if (needsDatetime) {
      neededImports.add('from datetime import datetime')
    }

    return {
      imports: Array.from(neededImports),
      typingImports: Array.from(typingImports),
      needsJson,
    }
  }

  /**
   * Write the combined output to a file
   */
  writeToFile(outputPath?: string): string {
    const filePath = outputPath || this.options.outputPath || './generated/config_client.py'
    const dirPath = path.dirname(filePath)

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {recursive: true})
    }

    // Generate and write the file
    const pythonCode = this.generatePythonFile()
    fs.writeFileSync(filePath, pythonCode)

    console.log(`Generated Python client written to ${filePath}`)

    return filePath
  }
}

// Example usage
export function example(): void {
  // Create the unified generator
  const generator = new UnifiedPythonGenerator({
    outputPath: './generated/prefab_config_client.py',
    className: 'PrefabConfigClient',
    prefixName: 'Prefab',
  })

  // Register schemas and methods
  const connectionSchema = z
    .object({
      host: z.string(),
      port: z.number().int().positive(),
      secure: z.boolean().default(true),
      timeout: z.string().refine((val) => /^PT\d+[HMS]$/.test(val), {
        message: 'Must be an ISO 8601 duration',
      }),
      retryCount: z.number().int().min(0).max(10),
    })
    .describe('Connection')

  // Register a method using the schema
  generator.registerMethod(
    'getConnection',
    connectionSchema,
    undefined,
    [{name: 'environment', type: 'str', default: '"production"'}],
    'Get connection configuration for the specified environment',
  )
  
  // Generate the file
  generator.writeToFile()
}

// Example with Mustache template
export function exampleWithTemplate(): void {
  // Create the unified generator
  const generator = new UnifiedPythonGenerator({
    outputPath: './generated/prefab_config_client_with_template.py',
    className: 'PrefabConfigClient',
    prefixName: 'Prefab',
  })

  // Register schemas and methods
  const connectionSchema = z
    .object({
      host: z.string(),
      port: z.number().int().positive(),
      secure: z.boolean().default(true),
      timeout: z.string().refine((val) => /^PT\d+[HMS]$/.test(val), {
        message: 'Must be an ISO 8601 duration',
      }),
      retryCount: z.number().int().min(0).max(10),
    })
    .describe('Connection')

  // Register a method using the schema
  generator.registerMethod(
    'getConnection',
    connectionSchema,
    undefined,
    [{name: 'environment', type: 'str', default: '"production"'}],
    'Get connection configuration for the specified environment',
  )
  
  // Register a template method using Mustache
  const templateSchema = z.function()
    .args(z.object({
      name: z.string(),
      company: z.string(),
    }))
    .returns(z.string())
    .describe('GreetingTemplate')
    
  // Register the template method
  generator.registerMethod(
    'getGreetingTemplate',
    templateSchema,
    undefined,
    [],
    'Get a greeting template that can be rendered with a name and company',
    'STRING' // Set the valueType to STRING
  )

  // Generate the file
  generator.writeToFile()
}

// Run the example
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running example without templates...')
  example()
  
  console.log('Running example with templates...')
  exampleWithTemplate()
}
