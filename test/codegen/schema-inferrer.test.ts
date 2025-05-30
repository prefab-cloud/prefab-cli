import {expect} from '@oclif/test'
import {z} from 'zod'

import type {Config, ConfigFile} from '../../src/codegen/types.js'

import {SchemaInferrer} from '../../src/codegen/schema-inferrer.js'
import {SupportedLanguage} from '../../src/codegen/types'
import {ZodUtils} from '../../src/codegen/zod-utils.js'

const logger = (category: string | unknown, message?: unknown) => {
  console.log(category, message)
}

describe('SchemaInferrer', () => {
  const inferrer = new SchemaInferrer(logger)

  describe('zodForConfig', () => {
    it('should infer from a number', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {int: 1}}]}],
        valueType: 'INT',
      }
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'z.number().int()',
      )
    })

    it('should infer from a double', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {int: 1}}]}],
        valueType: 'DOUBLE',
      }
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal('z.number()')
    })

    it('should infer from a simple string', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: 'foo'}}]}],
        valueType: 'STRING',
      }
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal('z.string()')
    })

    it('should infer from a template string', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: 'foo {{name}}'}}]}],
        valueType: 'STRING',
      }
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'z.function().args(optionalRequiredAccess({name: z.string()})).returns(z.string())',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({name: z.string(), age: z.number()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        'z.object({name: z.string(), age: z.number()})',
      )
    })

    it('should infer from a json with placeholders', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: '{"name": "foo {{name}}", "age": 10}'}}]}],
        valueType: 'JSON',
      }
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({name: z.function().args(optionalRequiredAccess({name: z.string()})).returns(z.string()), age: z.number()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        'z.object({name: z.function().args(z.object({name: z.string()})).returns(z.string()), age: z.number()})',
      )
    })

    it('should infer non-optionals from a json with schema', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [{values: [{value: {string: '{"name": "foo", "age": 10}'}}]}],
        schemaKey: 'schemaConfig',
        valueType: 'JSON',
      }
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemaConfig',
        rows: [
          {values: [{value: {schema: {schema: 'z.object({name: z.string(), age: z.number()})', schemaType: 'ZOD'}}}]},
        ],
        valueType: 'JSON',
      }
      const configFile: ConfigFile = {
        configs: [config, schemaConfig],
      }

      const {providence, schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(providence).to.equal('user')
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result, 'test', 'user', SupportedLanguage.TypeScript)).to.equal(
        'z.object({name: z.string(), age: z.number()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'user', SupportedLanguage.Python)).to.equal(
        'z.object({name: z.string(), age: z.number()})',
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({systemMessage: z.function().args(optionalRequiredAccess({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), nested: optionalRequiredAccess({stuff: z.array(z.object({name: z.string()}))})})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        'z.object({systemMessage: z.function().args(z.object({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), nested: z.object({stuff: z.array(z.object({name: z.string()}))})})',
      )
    })

    it('should merge from a multiple string', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test',
        rows: [
          {values: [{value: {string: 'foo {{name}}'}}]},
          {values: [{value: {string: 'bar {{baz}}'}}]},
          {values: [{value: {string: 'fizz {{buzz}}'}}]},
        ],
        valueType: 'STRING',
      }
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        'z.function().args(z.object({name: z.string().optional(), baz: z.string().optional(), buzz: z.string().optional()})).returns(z.string())',
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({name: z.string(), age: z.number().optional(), conflict: z.union([z.string(), z.number()]), otherNum: z.number().optional()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const {schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({systemMessage: z.function().args(optionalRequiredAccess({user: z.array(z.object({name: z.string()})).optional(), admin: z.array(z.object({name: z.string()})).optional(), placeholder: z.string().optional()})).returns(z.string()), nested: optionalRequiredAccess({stuff: z.array(z.object({name: z.string()})).optional(), otherStuff: z.function().args(optionalRequiredAccess({placeholder2: z.string()})).returns(z.string()).optional()})})',
      )
    })

    it('should infer a string schema', () => {
      const config: Config = {
        configType: 'CONFIG',
        key: 'test.string',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'test',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      const {schema: result} = inferrer.zodForConfig(config, {configs: []}, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal('z.string()')
    })

    it('should use schema from referenced schema config', () => {
      // Create a schema config that defines a person object with name and age
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemas.person',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: 'z.object({ name: z.string(), age: z.number() })',
                    schemaType: 'ZOD',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      // Create a JSON config that references the schema
      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.person',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"name":"John", "age": 30}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'schemas.person', // Reference to the schema config
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const {schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)

      // Verify it's an object schema with the expected properties
      expect(result._def.typeName).to.equal('ZodObject')
      const {shape} = result as z.ZodObject<any>
      expect((shape.name as any)._def.typeName).to.equal('ZodString')
      expect((shape.age as any)._def.typeName).to.equal('ZodNumber')
    })

    it('should have optional template params when not all strings are templates when inferred', () => {
      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.person',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"name":"string with {{placeholder}}"}',
                  },
                },
              },
              {
                value: {
                  json: {
                    json: '{"name":"string without"}',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [jsonConfig],
      }

      const {schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)

      expect(ZodUtils.zodToString(result, 'test', 'user', SupportedLanguage.TypeScript)).to.equal(
        'z.object({name: z.function().args(z.object({placeholder: z.string().optional()})).returns(z.string())})',
      )
    })

    it('should have optional template params when not all strings are templates with Schemas', () => {
      // Create a schema config that defines a person object with name and age
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemas.person',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: 'z.object({ name: z.string()})',
                    schemaType: 'ZOD',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      // Create a JSON config that references the schema
      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.person',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"name":"string with {{placeholder}}"}',
                  },
                },
              },
              {
                value: {
                  json: {
                    json: '{"name":"string without"}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'schemas.person', // Reference to the schema config
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const {schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)

      expect(ZodUtils.zodToString(result, 'test', 'user', SupportedLanguage.TypeScript)).to.equal(
        'z.object({name: z.function().args(z.object({placeholder: z.string().optional()})).returns(z.string())})',
      )
    })

    it('should handle optional properties in schema', () => {
      // Create a schema config with optional properties
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemas.user',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema:
                      'z.object({ username: z.string(), email: z.string().optional(), age: z.number().optional() })',
                    schemaType: 'ZOD',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.user',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"username":"johndoe", "email": "foo"}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'schemas.user',
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const {providence, schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)
      expect(providence).to.equal('user')
      // we do inference on the json config, then trust server to have the non-optional
      // optional doesn't carry over to the zod
      expect(ZodUtils.zodToString(result, 'test', 'user', SupportedLanguage.TypeScript)).to.equal(
        'z.object({username: z.string(), email: z.string().optional(), age: z.number().optional()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'user', SupportedLanguage.Python)).to.equal(
        'z.object({username: z.string(), email: z.string().optional(), age: z.number().optional()})',
      )
    })

    it('should fall back to inference when schema config is not found', () => {
      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.product',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"name":"Product", "price": 99.99}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'non.existent.schema', // This schema key doesn't exist
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [jsonConfig], // No schema config exists
      }

      const {schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)

      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({name: z.string(), price: z.number()})',
      )
    })

    it('should fall back to inference when schema cannot be evaluated', () => {
      // Invalid schema that can't be parsed
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemas.invalid',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: 'z.object({ invalidSyntax: z.string( })', // Syntax error
                    schemaType: 'ZOD',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.invalid',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"value":"test"}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'schemas.invalid',
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const {schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({value: z.string()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        'z.object({value: z.string()})',
      )
    })

    it('should handle complex schemas with nested objects and arrays', () => {
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemas.complex',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: `z.object({
                      name: z.string(),
                      tags: z.array(z.string()),
                      metadata: z.object({
                        created: z.string(),
                        modified: z.string().optional()
                      }),
                      status: z.enum(["active","inactive","pending"])
                    })`,
                    schemaType: 'ZOD',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.complex',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"name":"Complex", "tags":["test"], "metadata":{"created":"2023-01-01"}, "status":"active"}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'schemas.complex',
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const {schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        "z.object({name: z.string(), tags: z.array(z.string()), metadata: z.object({created: z.string(), modified: z.string().optional()}), status: z.enum(['active','inactive','pending'])})",
      )
    })

    it('should combine schema with template processing', () => {
      // Create a schema config with a basic definition
      const schemaConfig: Config = {
        configType: 'SCHEMA',
        key: 'schemas.template',
        rows: [
          {
            values: [
              {
                value: {
                  schema: {
                    schema: 'z.object({ greeting: z.string(), data: z.object({ title: z.string() }) })',
                    schemaType: 'ZOD',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      // Create a JSON config that references the schema but has template strings
      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.template',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"greeting":"Hello {{name}}!", "data": {"title": "Welcome to {{place}}"}}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'schemas.template',
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const {providence, schema: result} = inferrer.zodForConfig(jsonConfig, configFile, SupportedLanguage.TypeScript)

      expect(providence).to.equal('user')

      // Verify the hybrid approach - structure from schema with template processing
      expect(result._def.typeName).to.equal('ZodObject')
      const {shape} = result as z.ZodObject<any>

      // The greeting should now be a function type because of the template
      expect((shape.greeting as any)._def.typeName).to.equal('ZodFunction')

      // Check that the function has the expected argument structure
      const greetingArgs = (shape.greeting as any)._def.args
      expect(greetingArgs).to.exist
      expect(greetingArgs._def.typeName).to.equal('ZodTuple')
      expect(greetingArgs._def.items).to.exist
      expect(greetingArgs._def.items.length).to.be.at.least(1)

      // Check that the first item in the tuple is an object with the expected shape
      const firstArg = greetingArgs._def.items[0]
      expect(firstArg._def.typeName).to.equal('ZodObject')
      expect(firstArg.shape.name).to.exist

      // data should remain an object
      expect((shape.data as any)._def.typeName).to.equal('ZodObject')

      // but its title should now be a function
      const dataShape = (shape.data as z.ZodObject<any>).shape
      expect((dataShape.title as any)._def.typeName).to.equal('ZodFunction')

      // Check that the function has the expected argument structure
      const titleArgs = (dataShape.title as any)._def.args
      expect(titleArgs).to.exist
      expect(titleArgs._def.typeName).to.equal('ZodTuple')
      expect(titleArgs._def.items).to.exist
      expect(titleArgs._def.items.length).to.be.at.least(1)

      // Check that the first item in the tuple is an object with the expected shape
      const firstTitleArg = titleArgs._def.items[0]
      expect(firstTitleArg._def.typeName).to.equal('ZodObject')
      expect(firstTitleArg.shape.place).to.exist
    })

    it('should correctly process JSON with nested Mustache templates', () => {
      // Create a JSON config with a template in a nested property
      const config: Config = {
        configType: 'CONFIG',
        key: 'url.with.mustache',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"url": "url is {{scheme}}://{{host}}", "timeout": 10, "retries": 10}',
                  },
                },
              },
            ],
          },
        ],
        schemaKey: 'url-schema',
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [config],
      }

      const {providence, schema: result} = inferrer.zodForConfig(config, configFile, SupportedLanguage.TypeScript)
      expect(providence).to.equal('inferred')
      expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'optionalRequiredAccess({url: z.function().args(optionalRequiredAccess({scheme: z.string(), host: z.string()})).returns(z.string()), timeout: z.number(), retries: z.number()})',
      )

      const {schema: resultPython} = inferrer.zodForConfig(config, configFile, SupportedLanguage.Python)
      expect(ZodUtils.zodToString(resultPython, 'test', 'inferred', SupportedLanguage.Python)).to.equal(
        'z.object({url: z.function().args(z.object({scheme: z.string(), host: z.string()})).returns(z.string()), timeout: z.number(), retries: z.number()})',
      )
    })
  })

  // describe('getAllTemplateStrings', () => {
  //   let inferrer: SchemaInferrer

  //   beforeEach(() => {
  //     // Initialize SchemaInferrer
  //     inferrer = new SchemaInferrer(logger)
  //   })

  //   it('should extract strings from direct string values', () => {
  //     const config: Config = {
  //       configType: 'CONFIG',
  //       key: 'test-config',
  //       rows: [
  //         {
  //           values: [
  //             {
  //               value: {
  //                 string: 'Hello {{name}}!',
  //               },
  //             },
  //           ],
  //         },
  //       ],
  //       valueType: 'STRING',
  //     }

  //     const result = inferrer.getAllTemplateStrings(config)

  //     expect(result).to.have.length(1)
  //     expect(result).to.contain('Hello {{name}}!')
  //   })

  //   it('should extract strings from JSON values', () => {
  //     const config: Config = {
  //       configType: 'CONFIG',
  //       key: 'test-json-config',
  //       rows: [
  //         {
  //           values: [
  //             {
  //               value: {
  //                 json: {
  //                   json: JSON.stringify({
  //                     farewell: 'Goodbye {{name}}!',
  //                     greeting: 'Hello {{name}}!',
  //                     nested: {
  //                       message: 'Welcome to {{place}}!',
  //                     },
  //                   }),
  //                 },
  //               },
  //             },
  //           ],
  //         },
  //       ],
  //       schemaKey: '',
  //       valueType: 'JSON',
  //     }

  //     const result = inferrer.getAllTemplateStrings(config)

  //     expect(result).to.have.length(3)
  //     expect(result).to.contain('Hello {{name}}!')
  //     expect(result).to.contain('Goodbye {{name}}!')
  //     expect(result).to.contain('Welcome to {{place}}!')
  //   })

  //   it('should handle mixed string and JSON values', () => {
  //     const config: Config = {
  //       configType: 'CONFIG',
  //       key: 'mixed-config',
  //       rows: [
  //         {
  //           values: [
  //             {
  //               value: {
  //                 string: 'Direct {{variable}}',
  //               },
  //             },
  //           ],
  //         },
  //         {
  //           values: [
  //             {
  //               value: {
  //                 json: {
  //                   json: JSON.stringify({
  //                     text: 'JSON {{variable}}',
  //                   }),
  //                 },
  //               },
  //             },
  //           ],
  //         },
  //       ],
  //       schemaKey: '',
  //       valueType: 'STRING',
  //     }

  //     const result = inferrer.getAllTemplateStrings(config)

  //     expect(result).to.have.length(2)
  //     expect(result).to.contain('Direct {{variable}}')
  //     expect(result).to.contain('JSON {{variable}}')
  //   })

  //   it('should handle empty values gracefully', () => {
  //     const config: Config = {
  //       configType: 'CONFIG',
  //       key: 'empty-config',
  //       rows: [
  //         {
  //           values: [
  //             {
  //               value: {}, // Empty value object
  //             },
  //           ],
  //         },
  //       ],
  //       schemaKey: '',
  //       valueType: 'STRING',
  //     }

  //     const result = inferrer.getAllTemplateStrings(config)

  //     expect(result).to.have.length(0)
  //   })
  // })

  describe('getAllStringsAtLocation', () => {
    let inferrer: SchemaInferrer

    beforeEach(() => {
      inferrer = new SchemaInferrer(logger)
    })

    it('should get direct string values when location is empty', () => {
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
          {
            values: [
              {
                value: {
                  string: 'Goodbye {{name}}!',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      // Using TypeScript's type system to access private method for testing
      const result = (inferrer as any).getAllStringsAtLocation(config, [])

      expect(result).to.have.length(2)
      expect(result).to.contain('Hello {{name}}!')
      expect(result).to.contain('Goodbye {{name}}!')
    })

    it('should get nested string values from JSON when location is provided', () => {
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
                      nested: {
                        deeply: {
                          message: 'Hello from deep inside!',
                        },
                      },
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
                      nested: {
                        deeply: {
                          message: 'Another deep message!',
                        },
                      },
                    }),
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      // Using TypeScript's type system to access private method for testing
      const result = (inferrer as any).getAllStringsAtLocation(config, ['nested', 'deeply', 'message'])

      expect(result).to.have.length(2)
      expect(result).to.contain('Hello from deep inside!')
      expect(result).to.contain('Another deep message!')
    })
  })

  it('should merge two schemas with the same string property', () => {
    const inferrer = new SchemaInferrer(logger)
    // @ts-expect-error accessing private method for testing
    const mergeSchemas = inferrer.mergeSchemas.bind(inferrer)

    const schemaA = z.object({
      name: z.string().optional(),
    })

    const schemaB = z.object({
      name: z.string().optional(),
    })

    const result = mergeSchemas(schemaA, schemaB)
    expect(result._def.typeName).to.equal('ZodObject')
    expect(ZodUtils.zodToString(result, 'test', 'user', SupportedLanguage.TypeScript)).to.equal(
      'z.object({name: z.string().optional()})',
    )
  })

  it('should merge two schemas with the same string property that are not optional', () => {
    const inferrer = new SchemaInferrer(logger)
    // @ts-expect-error accessing private method for testing
    const mergeSchemas = inferrer.mergeSchemas.bind(inferrer)

    const schemaA = z.object({
      name: z.string(),
    })

    const schemaB = z.object({
      name: z.string(),
    })

    const result = mergeSchemas(schemaA, schemaB)
    expect(result._def.typeName).to.equal('ZodObject')
    expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
      'optionalRequiredAccess({name: z.string()})',
    )
  })

  it('should merge two schemas with conflict', () => {
    const inferrer = new SchemaInferrer(logger)
    // @ts-expect-error accessing private method for testing
    const mergeSchemas = inferrer.mergeSchemas.bind(inferrer)

    const schemaA = z.object({
      conflict: z.string(),
    })

    const schemaB = z.object({
      conflict: z.number(),
    })

    const result = mergeSchemas(schemaA, schemaB)
    expect(result._def.typeName).to.equal('ZodObject')
    expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
      'optionalRequiredAccess({conflict: z.union([z.string(), z.number()])})',
    )
  })
  it('should merge two schemas with conflict and optional', () => {
    const inferrer = new SchemaInferrer(logger)
    // @ts-expect-error accessing private method for testing
    const mergeSchemas = inferrer.mergeSchemas.bind(inferrer)

    const schemaA = z.object({
      conflict: z.string().optional(),
    })

    const schemaB = z.object({
      conflict: z.number().optional(),
    })

    const result = mergeSchemas(schemaA, schemaB)
    expect(result._def.typeName).to.equal('ZodObject')
    expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
      'optionalRequiredAccess({conflict: z.union([z.string(), z.number()]).optional()})',
    )
  })
  it('should merge two schemas with a missing key to make other optional', () => {
    const inferrer = new SchemaInferrer(logger)
    // @ts-expect-error accessing private method for testing
    const mergeSchemas = inferrer.mergeSchemas.bind(inferrer)

    const schemaA = z.object({})

    const schemaB = z.object({
      placeholder: z.string(),
    })

    const result = mergeSchemas(schemaA, schemaB)
    expect(result._def.typeName).to.equal('ZodObject')
    expect(ZodUtils.zodToString(result, 'test', 'inferred', SupportedLanguage.React)).to.equal(
      'z.object({placeholder: z.string().optional()})',
    )
  })
})
