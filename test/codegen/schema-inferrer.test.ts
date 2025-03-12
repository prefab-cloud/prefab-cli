import {expect} from '@oclif/test'
import {z} from 'zod'

import type {Config, ConfigFile} from '../../src/codegen/types.js'

import {SchemaInferrer} from '../../src/codegen/schema-inferrer.js'
import {ZodUtils} from '../../src/codegen/zod-utils.js'

describe('SchemaInferrer', () => {
  describe('infer', () => {
    it('should infer from a number', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {int: 1}}]}],
        valueType: 'INT',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result).to.be.instanceOf(z.ZodNumber)
      expect(ZodUtils.zodToString(result)).to.equal('z.number().int()')
    })

    it('should infer from a double', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {int: 1}}]}],
        valueType: 'DOUBLE',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result).to.be.instanceOf(z.ZodNumber)
      expect(ZodUtils.zodToString(result)).to.equal('z.number()')
    })

    it('should infer from a simple string', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: 'foo'}}]}],
        valueType: 'STRING',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result).to.be.instanceOf(z.ZodString)
      expect(ZodUtils.zodToString(result)).to.equal('z.string()')
    })

    it('should infer from a template string', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: 'foo {{name}}'}}]}],
        valueType: 'STRING',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodFunction')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.function().args(z.object({name: z.string()})).returns(z.string())',
      )
    })

    it('should infer from a json', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: '{"name": "foo", "age": 10}'}}]}],
        valueType: 'JSON',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result)).to.equal('z.object({name: z.string(), age: z.number()})')
    })

    it('should infer from a json with placeholders', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: '{"name": "foo {{name}}", "age": 10}'}}]}],
        valueType: 'JSON',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.object({name: z.function().args(z.object({name: z.string()})).returns(z.string()), age: z.number()})',
      )
    })

    it('torture test', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [
          {
            values: [
              {
                value: {
                  string:
                    '{"systemMessage": "you {{#user}} {{name}} {{/user}} {{#admin}} {{name}} {{/admin}}", "nested": { "stuff": [{ "name": "foo" }, { "name": "bar" }] }}',
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.object({systemMessage: z.function().args(z.object({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), nested: z.object({stuff: z.array(z.object({name: z.string()}))})})',
      )
    })

    it('should merge from a multiple string', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: 'foo {{name}}'}}]}, {values: [{value: {string: 'bar {{baz}}'}}]}],
        valueType: 'STRING',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodFunction')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.function().args(z.object({name: z.string().optional(), baz: z.string().optional()})).returns(z.string())',
      )
    })

    it('should merge from a multiple JSON', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [
          {values: [{value: {string: '{"name": "foo", "age": 10, "conflict": "string"}'}}]},
          {values: [{value: {string: '{"name": "foo2", "otherNum": 10, "conflict": 42}'}}]},
        ],
        valueType: 'JSON',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.object({name: z.string(), age: z.number().optional(), conflict: z.union([z.string(), z.number()]), otherNum: z.number().optional()})',
      )
    })

    it('multi-row merge with placeholder test', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [
          {
            values: [
              {
                value: {
                  string:
                    '{"systemMessage": "you {{#user}} {{name}} {{/user}} {{#admin}} {{name}} {{/admin}}", "nested": { "stuff": [{ "name": "foo" }, { "name": "bar" }] }}',
                },
              },
            ],
          },
          {
            values: [
              {
                value: {
                  string:
                    '{"systemMessage": "message with {{placeholder}}", "nested": { "otherStuff": "string {{placeholder2}}" }}',
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }
      const schemaInferrer = new SchemaInferrer()
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = schemaInferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.object({systemMessage: z.union([z.function().args(z.object({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), z.function().args(z.object({placeholder: z.string()})).returns(z.string())]), nested: z.object({stuff: z.array(z.object({name: z.string()})).optional(), otherStuff: z.function().args(z.object({placeholder2: z.string()})).returns(z.string()).optional()})})',
      )
    })
  })

  describe('getAllTemplateStrings', () => {
    let inferrer: SchemaInferrer

    beforeEach(() => {
      // Initialize SchemaInferrer
      inferrer = new SchemaInferrer()
    })

    it('should extract strings from direct string values', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test-config',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'Hello {{name}}!',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      const result = inferrer.getAllTemplateStrings(config)

      expect(result).to.have.length(1)
      expect(result).to.contain('Hello {{name}}!')
    })

    it('should extract strings from JSON values', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test-json-config',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: JSON.stringify({
                      farewell: 'Goodbye {{name}}!',
                      greeting: 'Hello {{name}}!',
                      nested: {
                        message: 'Welcome to {{place}}!',
                      },
                    }),
                  },
                },
              },
            ],
          },
        ],
        schemaKey: '',
        valueType: 'JSON',
      }

      const result = inferrer.getAllTemplateStrings(config)

      expect(result).to.have.length(3)
      expect(result).to.contain('Hello {{name}}!')
      expect(result).to.contain('Goodbye {{name}}!')
      expect(result).to.contain('Welcome to {{place}}!')
    })

    it('should handle mixed string and JSON values', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'mixed-config',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'Direct {{variable}}',
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
                      text: 'JSON {{variable}}',
                    }),
                  },
                },
              },
            ],
          },
        ],
        schemaKey: '',
        valueType: 'STRING',
      }

      const result = inferrer.getAllTemplateStrings(config)

      expect(result).to.have.length(2)
      expect(result).to.contain('Direct {{variable}}')
      expect(result).to.contain('JSON {{variable}}')
    })

    it('should handle empty values gracefully', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'empty-config',
        rows: [
          {
            values: [
              {
                value: {}, // Empty value object
              },
            ],
          },
        ],
        schemaKey: '',
        valueType: 'STRING',
      }

      const result = inferrer.getAllTemplateStrings(config)

      expect(result).to.have.length(0)
    })
  })
})
