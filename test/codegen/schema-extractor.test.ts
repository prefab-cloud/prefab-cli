import {expect} from 'chai'
import {z} from 'zod'

import {SchemaExtractor} from '../../src/codegen/schema-extractor.js'
import {type Config, type ConfigFile} from '../../src/codegen/types.js'

// Custom duration type map returning a string
const durationTypeMap = () => z.string()

describe('SchemaExtractor', () => {
  let mockLog: (category: string | unknown, message?: unknown) => void
  let schemaExtractor: SchemaExtractor

  beforeEach(() => {
    mockLog = () => {}
    schemaExtractor = new SchemaExtractor(mockLog)
  })

  describe('execute', () => {
    it('should use user-defined schema when available', () => {
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'user_schema',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: 'z.object({ name: z.string(), age: z.number().int() })',
                    schemaType: 'zod',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      // Configuration is empty, so we know user-defined schema will be used in our assertion
      const config: Config = {
        configType: 'CONFIG',
        key: 'user_config',
        rows: [],
        schemaKey: 'user_schema',
        valueType: 'JSON',
      }

      // Create the config file containing both configs
      const configFile: ConfigFile = {
        configs: [config, schemaConfig],
      }

      const result = schemaExtractor.execute({config, configFile})

      expect(result._def.typeName).equal('ZodObject')
      expect(Object.keys(result._def.shape()).sort()).to.deep.equal(['age', 'name'])
      expect(result._def.shape().age._def.typeName).equal('ZodNumber')
      expect(result._def.shape().name._def.typeName).equal('ZodString')
    })

    it('should infer schema when no user-defined schema is available', () => {
      // Create a config without a schema reference
      const config: Config = {
        configType: 'CONFIG',
        key: 'string_config',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'test value',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaExtractor.execute({config, configFile})

      // Verify the result is a string schema
      expect(result._def.typeName).to.equal('ZodString')
    })

    it('should infer a union of schema when multiple schemas are found', () => {
      // Create a config without a schema reference
      const config: Config = {
        configType: 'CONFIG',
        key: 'json_config',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: JSON.stringify({
                      enterprise: 5000,
                      premium: 500,
                      standard: 100,
                    }),
                  },
                },
              },
            ],
          },
          {
            values: [
              {
                value: {
                  json: {
                    json: JSON.stringify({
                      freemium: 0,
                      premium: 500,
                      standard: 100,
                    }),
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaExtractor.execute({config, configFile})

      expect(result._def.typeName).to.equal('ZodUnion')
      expect(result._def.options.length).to.equal(2)
      expect(result._def.options[0]._def.typeName).to.equal('ZodObject')
      expect(Object.keys(result._def.options[0]._def.shape()).sort()).to.deep.equal([
        'enterprise',
        'premium',
        'standard',
      ])
      expect(result._def.options[1]._def.typeName).to.equal('ZodObject')
      expect(Object.keys(result._def.options[1]._def.shape()).sort()).to.deep.equal(['freemium', 'premium', 'standard'])
    })

    it('should use custom duration type map when provided', () => {
      // Create a config with DURATION type
      const config: Config = {
        configType: 'CONFIG',
        key: 'duration_config',
        rows: [
          {
            values: [
              {
                value: {
                  int: 5000, // 5 seconds in ms
                },
              },
            ],
          },
        ],
        valueType: 'DURATION',
      }

      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaExtractor.execute({config, configFile, durationTypeMap})

      // Verify the result uses our custom duration type
      expect(result._def.typeName).to.equal('ZodString')
    })

    it('should replace strings with Mustache templates when found', () => {
      // Create a config with a Mustache template
      const config: Config = {
        configType: 'CONFIG',
        key: 'template_config',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'Hello, {{name}}!',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaExtractor.execute({config, configFile})

      // Verify the result is a function schema that takes a name string param and returns a string
      expect(result._def.typeName).to.equal('ZodFunction')
      expect(result._def.args._def.typeName).to.equal('ZodTuple')
      expect(result._def.args._def.items.length).to.equal(1)
      expect(result._def.args._def.items[0]._def.typeName).to.equal('ZodObject')
      expect(Object.keys(result._def.args._def.items[0]._def.shape())).to.deep.equal(['name'])
      expect(result._def.args._def.items[0]._def.shape().name._def.typeName).to.equal('ZodString')
      expect(result._def.returns._def.typeName).to.equal('ZodString')
    })

    it('should replace strings with a union of Mustache templates when found', () => {
      // Create a config with a Mustache template
      const config: Config = {
        configType: 'CONFIG',
        key: 'template_config',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'Hello, {{name}}!',
                },
              },
              {
                value: {
                  string: 'Hello, {{differentName}}!',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaExtractor.execute({config, configFile})

      // Verify the result is a function schema that takes a name string param and returns a string
      expect(result._def.typeName).to.equal('ZodFunction')
      expect(result._def.args._def.typeName).to.equal('ZodTuple')
      expect(result._def.args._def.items.length).to.equal(1)
      expect(result._def.args._def.items[0]._def.typeName).to.equal('ZodUnion')
      expect(result._def.args._def.items[0].options.length).to.equal(2)
      expect(result._def.args._def.items[0].options[1]._def.typeName).to.equal('ZodObject')
      expect(Object.keys(result._def.args._def.items[0].options[0]._def.shape()).sort()).to.deep.equal(['name'])
      expect(result._def.args._def.items[0]._def.options[0]._def.shape().name._def.typeName).to.equal('ZodString')
      expect(Object.keys(result._def.args._def.items[0].options[1]._def.shape()).sort()).to.deep.equal([
        'differentName',
      ])
      expect(result._def.args._def.items[0]._def.options[1]._def.shape().differentName._def.typeName).to.equal(
        'ZodString',
      )
      expect(result._def.returns._def.typeName).to.equal('ZodString')
    })
  })
})
