import Mustache from 'mustache'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {generatePythonClientCode} from './python/generator.js'
import {SchemaInferrer, SchemaWithProvidence} from './schema-inferrer.js'
import {type Config, type ConfigFile, SupportedLanguage} from './types.js'
import {ZodUtils} from './zod-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface AccessorMethod {
  isFeatureFlag: boolean
  isFunctionReturn: boolean
  key: string
  methodName: string
  params: string
  returnType: string
  returnValue: string
}

export interface SchemaLine {
  key: string
  schemaName: string
  zodType: string
}

export interface TemplateData {
  accessorMethods: AccessorMethod[]
  schemaLines: SchemaLine[]
}

/**
 * Generates typed code for configs using Zod for validation
 */
export class ZodGenerator {
  private configFile: ConfigFile
  private dependencies: Set<string> = new Set()
  private log: (category: string | unknown, message?: unknown) => void
  private methods: {[key: string]: AccessorMethod} = {}
  private schemaInferrer: SchemaInferrer

  constructor(configFile: ConfigFile, log: (category: string | unknown, message?: unknown) => void) {
    this.configFile = configFile
    this.schemaInferrer = new SchemaInferrer(log)
    this.log = log
  }

  /**
   * Generate code for the specified language
   */
  generate(language: SupportedLanguage = SupportedLanguage.TypeScript, className?: string): string {
    if (language === SupportedLanguage.Python) {
      return generatePythonClientCode(this.configFile, this.schemaInferrer, className || 'PrefabTypedClient')
    }

    // Get base template for the framework
    const templateName = this.getTemplateNameForLanguage(language)
    const templatePath = path.join(__dirname, 'templates', `${templateName}.mustache`)

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template for language '${language}' not found at ${templatePath}`)
    }

    const baseTemplate = fs.readFileSync(templatePath, 'utf8')

    // Filter configs based on type and sendToClientSdk for React
    const filteredConfigs = this.configFile.configs
      .filter((config) => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
      .filter((config) => config.rows.length > 0)
      .filter(
        (config) =>
          language !== SupportedLanguage.React ||
          config.configType === 'FEATURE_FLAG' ||
          config.sendToClientSdk === true,
      )
      .sort((a, b) => a.key.localeCompare(b.key))

    this.log('Exportable configs:', filteredConfigs.length)

    // Generate individual accessor methods
    const accessorMethods = filteredConfigs.map((config) => this.renderAccessorMethod(config, language)).join('\n')

    // Generate individual schema lines
    const schemaLines = filteredConfigs.map((config) => this.renderSchemaLine(config, language)).join(',\n  ')

    // Render the base template with the generated content
    const result = Mustache.render(baseTemplate, {
      accessorMethods,
      dependencies: this.renderDependencies(language),
      schemaLines,
    })

    return result
  }

  /**
   * Generate an accessor method for a single config
   */
  generateAccessorMethod(config: Config, language: SupportedLanguage): AccessorMethod {
    const {schema: schemaObj} = this.schemaInferrer.zodForConfig(config, this.configFile, language)
    const returnValue = ZodUtils.generateReturnValueCode(schemaObj, '', language)

    const paramsSchema = ZodUtils.paramsOf(schemaObj)
    const params = paramsSchema ? ZodUtils.zodTypeToTypescript(paramsSchema) : ''
    // For function return types, they should return a function taking params
    const isFunction = schemaObj._def.typeName === 'ZodFunction'
    this.log(schemaObj)
    this.log(ZodUtils.zodTypeToTypescript(schemaObj))
    const returnType = isFunction
      ? ZodUtils.zodTypeToTypescript(schemaObj._def.returns)
      : ZodUtils.zodTypeToTypescript(schemaObj)

    const accessorMethod = this.massageAccessorMethodForLanguage(language, config, {
      isFeatureFlag: config.configType === 'FEATURE_FLAG',
      isFunctionReturn: isFunction,
      key: config.key,
      methodName: ZodUtils.keyToMethodName(config.key),
      params,
      returnType,
      returnValue,
    })

    if (this.methods[accessorMethod.methodName]) {
      throw new Error(
        `Method '${accessorMethod.methodName}' is already registered. Prefab key ${config.key} conflicts with ${
          this.methods[accessorMethod.methodName].key
        }`,
      )
    }

    this.methods[accessorMethod.methodName] = accessorMethod

    return accessorMethod
  }

  /**
   * Generate a schema line for a single config
   */
  generateSchemaLine(config: Config, language: SupportedLanguage = SupportedLanguage.TypeScript): SchemaLine {
    const {providence, schema: simplified} = this.generateSimplifiedSchema(config, language)
    const zodType = ZodUtils.zodToString(simplified, config.key, providence, language)

    return this.massageSchemaLineForLanguage(language, config, {
      key: config.key,
      schemaName: ZodUtils.keyToMethodName(config.key) + 'Schema',
      zodType,
    })
  }

  /**
   * Generate schema lines for all configs
   */
  generateSchemaLines(language: SupportedLanguage = SupportedLanguage.TypeScript): SchemaLine[] {
    return this.configFile.configs
      .filter((config) => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
      .map((config) => this.generateSchemaLine(config, language))
  }

  generateSimplifiedSchema(
    config: Config,
    language: SupportedLanguage = SupportedLanguage.TypeScript,
  ): SchemaWithProvidence {
    const schemaObj = this.schemaInferrer.zodForConfig(config, this.configFile, language)
    return {
      providence: schemaObj.providence,
      schema: ZodUtils.simplifyFunctions(schemaObj.schema),
    }
  }

  /**
   * Render a single accessor method for the given language
   */
  renderAccessorMethod(config: Config, language: SupportedLanguage = SupportedLanguage.TypeScript): string {
    const templateName = this.getTemplateNameForLanguage(language)
    const templatePath = path.join(__dirname, 'templates', `${templateName}-accessor.mustache`)

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Accessor template for language '${language}' not found at ${templatePath}`)
    }

    const template = fs.readFileSync(templatePath, 'utf8')
    const accessorMethod = this.generateAccessorMethod(config, language)

    return Mustache.render(template, accessorMethod)
  }

  /**
   * Render a single schema line for the given language
   */
  renderSchemaLine(config: Config, language: SupportedLanguage = SupportedLanguage.TypeScript): string {
    const templateName = this.getTemplateNameForLanguage(language)
    const templatePath = path.join(__dirname, 'templates', `${templateName}-schema.mustache`)

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Schema template for language '${language}' not found at ${templatePath}`)
    }

    const template = fs.readFileSync(templatePath, 'utf8')
    const schemaLine = this.generateSchemaLine(config, language)

    return Mustache.render(template, schemaLine)
  }

  /**
   * Get the template file name for the given language
   */
  private getTemplateNameForLanguage(language: SupportedLanguage): string {
    if (language === SupportedLanguage.TypeScript) {
      return 'typescript'
    }

    if (language === SupportedLanguage.Python) {
      return 'python'
    }

    if (language === SupportedLanguage.React) {
      return 'react'
    }

    if (language === SupportedLanguage.Ruby) {
      return 'ruby'
    }

    return 'typescript'
  }

  /**
   * Customize accessor method properties based on language requirements
   */
  private massageAccessorMethodForLanguage(
    language: SupportedLanguage,
    config: Config,
    accessorMethod: AccessorMethod,
  ): AccessorMethod {
    if (accessorMethod.isFunctionReturn) {
      this.dependencies.add('mustache')
    }

    switch (language) {
      case SupportedLanguage.TypeScript: {
        if (config.valueType === 'DURATION') {
          return {
            ...accessorMethod,
            returnType: 'number',
          }
        }

        break
      }

      case SupportedLanguage.React: {
        if (config.valueType === 'DURATION') {
          this.dependencies.add('duration')
          return {
            ...accessorMethod,
            returnType: 'PrefabDuration',
          }
        }

        break
      }
    }

    return accessorMethod
  }

  /**
   * Customize schema line properties based on language requirements
   */
  private massageSchemaLineForLanguage(
    language: SupportedLanguage,
    config: Config,
    schemaLine: SchemaLine,
  ): SchemaLine {
    switch (language) {
      case SupportedLanguage.TypeScript: {
        if (config.valueType === 'DURATION') {
          return {
            ...schemaLine,
            zodType: 'z.number()',
          }
        }

        break
      }

      case SupportedLanguage.React: {
        if (config.valueType === 'DURATION') {
          this.dependencies.add('duration')
          return {
            ...schemaLine,
            zodType: 'PrefabDurationSchema',
          }
        }

        break
      }
    }

    return schemaLine
  }

  private renderDependencies(language: SupportedLanguage): string {
    const templateName = this.getTemplateNameForLanguage(language)
    return [...this.dependencies]
      .map((dep) => {
        const templatePath = path.join(__dirname, 'templates', `dependencies/${templateName}-${dep}.mustache`)
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Dependency template for language '${language}' not found at ${templatePath}`)
        }

        const template = fs.readFileSync(templatePath, 'utf8')
        return Mustache.render(template, {})
      })
      .join('\n')
  }
}
