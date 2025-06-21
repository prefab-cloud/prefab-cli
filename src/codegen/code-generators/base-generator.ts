import {z} from 'zod'

import {ZodToTypescriptMapper} from '../language-mappers/zod-to-typescript-mapper.js'
import {SchemaExtractor} from '../schema-extractor.js'
import {type ConfigFile} from '../types.js'

export interface BaseGeneratorArgs {
  configFile: ConfigFile
  log: (category: string | unknown, message?: unknown) => void
}

export abstract class BaseGenerator {
  protected configFile: ConfigFile
  protected log: (category: string | unknown, message?: unknown) => void

  private schemaExtractor: SchemaExtractor

  constructor({configFile, log}: BaseGeneratorArgs) {
    this.configFile = configFile
    this.log = log
    this.schemaExtractor = new SchemaExtractor(log)
  }

  protected configurations() {
    return this.configFile.configs
      .filter((config) => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
      .filter((config) => config.rows.length > 0)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((config) => {
        const schema = this.schemaExtractor.execute({
          config,
          configFile: this.configFile,
          durationTypeMap: this.durationTypeMap,
        })

        return {
          configType: config.configType,
          // We use typescript here, but this will work to detect mustache functions in all languages
          hasFunction: schema && new ZodToTypescriptMapper().resolveType(schema).includes('=>'),
          key: config.key,
          schema,
          sendToClientSdk: config.sendToClientSdk ?? false,
        }
      })
  }

  protected durationTypeMap(): z.ZodTypeAny {
    return z.number()
  }

  abstract get filename(): string
  abstract generate(): string
}
