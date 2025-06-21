import camelCase from 'lodash.camelcase'
import {z} from 'zod'

import pascalCase from '../../util/pascal-case.js'
import {PythonTyping, ZodTypeSupported} from '../types.js'
import {ZodBaseMapper} from './zod-base-mapper.js'

export class ZodToPythonClassMapper extends ZodBaseMapper {
  private _classes: Record<string, string> = {}
  private _fieldName: string | undefined
  private _forFunctionArgs: boolean
  private _hasAny: boolean = false
  private _hasEnum: boolean = false
  private _hasOptional: boolean = false
  private _hasTuple: boolean = false
  private _hasTypedDict: boolean = false
  private _hasUnion: boolean = false

  constructor({fieldName, forFunctionArgs}: {fieldName?: string; forFunctionArgs?: boolean} = {}) {
    super()
    this._fieldName = fieldName
    this._forFunctionArgs = forFunctionArgs ?? false
  }

  static deriveClassName(key: string) {
    let className = pascalCase(key)

    // If the method name starts with a digit, prefix it with an underscore to ensure method name is valid
    if (/^\d/.test(className)) {
      className = `_${className}`
    }

    return className
  }

  static objectFieldName(key: string) {
    let propertyName = camelCase(key)

    // If the method name starts with a digit, prefix it with an underscore to ensure method name is valid
    if (/^\d/.test(propertyName)) {
      propertyName = `_${propertyName}`
    }

    return propertyName
  }

  get classes() {
    return this._classes
  }

  get hasAny() {
    return this._hasAny
  }

  get hasEnum() {
    return this._hasEnum
  }

  get hasOptional() {
    return this._hasOptional
  }

  get hasTuple() {
    return this._hasTuple
  }

  get hasTypedDict() {
    return this._hasTypedDict
  }

  get hasUnion() {
    return this._hasUnion
  }

  any() {
    this._hasAny = true

    return PythonTyping.Any
  }

  array(wrappedType: string) {
    return `list[${wrappedType}]`
  }

  boolean() {
    return 'bool'
  }

  enum(values: string[]) {
    this._hasEnum = true

    if (!this._fieldName) {
      throw new Error('Enum requires a field name')
    }

    // Enum postfix to help prevent collisions with object types
    const className = ZodToPythonClassMapper.deriveClassName(this._fieldName) + 'Enum'
    const uniqueValues: Record<string, string> = {}
    const valueDefinitions = values.map((value) => {
      let safeValueName = camelCase(value)

      // If the method name starts with a digit, prefix it with an underscore to ensure method name is valid
      if (/^\d/.test(safeValueName)) {
        safeValueName = `_${safeValueName}`
      }

      if (uniqueValues[safeValueName]) {
        throw new Error(`Duplicate enum value ${value} with ${uniqueValues[value]}`)
      }

      uniqueValues[safeValueName] = value

      return `${safeValueName} = "${value}"`
    })

    const classDefinition = `
    class ${className}(StrEnum):
        ${valueDefinitions.join('\n        ')}
    `

    // If it's a duplicate definition and it's not identical, bomb out
    if (this._classes[className] && this._classes[className] !== classDefinition) {
      throw new Error(`Different definition with identical enum name ${className}:\n\n${classDefinition}`)
    }

    this._classes[className] = classDefinition

    // When used as a value, we want the classname
    return className
  }

  function(args: string) {
    // All we care about are the arguments
    return args
  }

  functionArguments(value?: z.ZodTuple): string {
    if (!value) {
      return ''
    }

    this._forFunctionArgs = true

    const mapper = new ZodToPythonClassMapper({fieldName: this._fieldName})
    const generatedTypes = mapper.renderClasses(value.items[0])

    // propogate flags
    this._hasAny ||= mapper.hasAny
    this._hasEnum ||= mapper.hasEnum
    this._hasOptional ||= mapper.hasOptional
    this._hasTuple ||= mapper.hasTuple
    this._hasTypedDict ||= mapper.hasTypedDict
    this._hasUnion ||= mapper.hasUnion

    generatedTypes.forEach(([internalClassName, internalClassDefinition]) => {
      if (this._classes[internalClassName] && this._classes[internalClassName] !== internalClassDefinition) {
        throw new Error(`Duplicate class definition for ${internalClassName}`)
      }

      this._classes[internalClassName] = internalClassDefinition
    })

    return mapper.resolveType(value.items[0])
  }

  functionReturns(): string {
    // We don't care about return values when mapping parameter classes
    return ''
  }

  null() {
    return 'None'
  }

  number(isInteger: boolean) {
    return isInteger ? 'int' : 'float'
  }

  object(properties: [string, z.ZodTypeAny][]) {
    this._hasTypedDict = true

    if (!this._fieldName) {
      throw new Error('Object requires a field name')
    }

    // Enum postfix to help prevent collisions with object types
    let className = ZodToPythonClassMapper.deriveClassName(this._fieldName)

    const uniqueFields: Record<string, string> = {}
    const fieldDefinitions = properties.map(([fieldName, fieldSchema]) => {
      let safeFieldName = camelCase(fieldName)

      // If the method name starts with a digit, prefix it with an underscore to ensure method name is valid
      if (/^\d/.test(safeFieldName)) {
        safeFieldName = `_${safeFieldName}`
      }

      if (uniqueFields[safeFieldName]) {
        throw new Error(`Duplicate field ${fieldName} with ${uniqueFields[safeFieldName]}`)
      }

      uniqueFields[safeFieldName] = fieldName

      const mapper = new ZodToPythonClassMapper({fieldName: `${this._fieldName}_${fieldName}`})

      // Resolve nested classes
      const generatedFieldTypes = mapper.renderClasses(fieldSchema)
      generatedFieldTypes.forEach(([internalClassName, internalClassDefinition]) => {
        if (this._classes[internalClassName] && this._classes[internalClassName] !== internalClassDefinition) {
          throw new Error(`Duplicate class definition for ${internalClassName}`)
        }

        this._classes[internalClassName] = internalClassDefinition
      })

      const fieldType = mapper.resolveType(fieldSchema)

      // propogate flags
      this._hasAny ||= mapper.hasAny
      this._hasEnum ||= mapper.hasEnum
      this._hasOptional ||= mapper.hasOptional
      this._hasTuple ||= mapper.hasTuple
      this._hasTypedDict ||= mapper.hasTypedDict
      this._hasUnion ||= mapper.hasUnion

      return `${safeFieldName}: ${fieldType}`
    })

    // If it's an object with no properties, define it as an empty class
    if (fieldDefinitions.length === 0) {
      fieldDefinitions.push('pass')
    }

    let classDefinition = `
    class ${className}(TypedDict):
        ${fieldDefinitions.join('\n        ')}
    `

    // If it's a duplicate definition and it's not identical, adjust the class name + definition
    // This only happens when objects are used in union types
    if (this._classes[className] && this._classes[className] !== classDefinition) {
      const original = className
      let attempt = 1
      while (this.classes[className] && this._classes[className] !== classDefinition) {
        attempt++
        className = `${original}_v${attempt}`
        classDefinition = `
    class ${className}(TypedDict):
        ${fieldDefinitions.join('\n        ')}
      `
      }
    }

    this._classes[className] = classDefinition

    // When used as a value, we want the classname
    return className
  }

  optional(wrappedType: string) {
    this._hasOptional = true

    return `Optional[${wrappedType}]`
  }

  renderClasses(type: ZodTypeSupported): [className: string, classDefinition: string][] {
    // Trigger AST crawling to capture and extract all classes
    this.resolveType(type)

    return Object.entries(this._classes)
  }

  string() {
    return 'str'
  }

  tuple(wrappedTypes: string[]) {
    this._hasTuple = true

    return `Tuple[${wrappedTypes.join(', ')}]`
  }

  undefined() {
    // There is no equivalent to `undefined` in Python, so we use `None`
    return 'None'
  }

  union(wrappedTypes: string[]) {
    this._hasUnion = true

    return `Union[${wrappedTypes.join(', ')}]`
  }

  unknown() {
    // There is no equivalent to `unknown` in Python, so we use `Any`
    return PythonTyping.Any
  }
}
