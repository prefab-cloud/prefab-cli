import {expect} from '@oclif/test'
import {z} from 'zod'

import type {Config, ConfigFile} from '../../src/codegen/types.js'

import {SchemaInferrer} from '../../src/codegen/schema-inferrer.js'
import {ZodUtils} from '../../src/codegen/zod-utils.js'

describe('SchemaInferrer', () => {
  let inferrer: SchemaInferrer

  beforeEach(() => {
    inferrer = new SchemaInferrer()
  })

  describe('infer', () => {
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

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
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
      const configFile: ConfigFile = {
        configs: [config],
      }

      const result = inferrer.infer(config, configFile)
      expect(result._def.typeName).to.equal('ZodObject')
      expect(ZodUtils.zodToString(result)).to.equal(
        'z.object({systemMessage: z.union([z.function().args(z.object({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), z.function().args(z.object({placeholder: z.string()})).returns(z.string())]), nested: z.object({stuff: z.array(z.object({name: z.string()})).optional(), otherStuff: z.function().args(z.object({placeholder2: z.string()})).returns(z.string()).optional()})})',
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

      const schema = inferrer.infer(config, {configs: []})
      expect((schema as any)._def.typeName).to.equal('ZodString')
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
        schemaKey: 'schemas.person', // Reference to the schema config
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
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const schema = inferrer.infer(jsonConfig, configFile)
      
      // Verify it's an object schema with the expected properties
      expect((schema as any)._def.typeName).to.equal('ZodObject')
      const shape = (schema as z.ZodObject<any>).shape
      expect((shape.name as any)._def.typeName).to.equal('ZodString')
      expect((shape.age as any)._def.typeName).to.equal('ZodNumber')
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
                    schema: 'z.object({ username: z.string(), email: z.string().optional(), age: z.number().optional() })',
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
        schemaKey: 'schemas.user',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"username":"johndoe"}',
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const schema = inferrer.infer(jsonConfig, configFile)
      
      // Verify the schema structure
      expect((schema as any)._def.typeName).to.equal('ZodObject')
      const shape = (schema as z.ZodObject<any>).shape
      
      // Required property
      expect((shape.username as any)._def.typeName).to.equal('ZodString')
      
      // Optional properties
      expect((shape.email as any)._def.typeName).to.equal('ZodOptional')
      expect((shape.email as any)._def.innerType._def.typeName).to.equal('ZodString')
      
      expect((shape.age as any)._def.typeName).to.equal('ZodOptional')
      expect((shape.age as any)._def.innerType._def.typeName).to.equal('ZodNumber')
    })

    it('should fall back to inference when schema config is not found', () => {
      const jsonConfig: Config = {
        configType: 'CONFIG',
        key: 'test.product',
        schemaKey: 'non.existent.schema', // This schema key doesn't exist
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
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [jsonConfig], // No schema config exists
      }

      const schema = inferrer.infer(jsonConfig, configFile)
      
      // Should fall back to inference
      expect((schema as any)._def.typeName).to.equal('ZodObject')
      const shape = (schema as z.ZodObject<any>).shape
      expect((shape.name as any)._def.typeName).to.equal('ZodString')
      expect((shape.price as any)._def.typeName).to.equal('ZodNumber')
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
        schemaKey: 'schemas.invalid',
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
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const schema = inferrer.infer(jsonConfig, configFile)
      
      // Should fall back to inference
      expect((schema as any)._def.typeName).to.equal('ZodObject')
      const shape = (schema as z.ZodObject<any>).shape
      expect((shape.value as any)._def.typeName).to.equal('ZodString')
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
                      status: z.enum(["active", "inactive", "pending"])
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
        schemaKey: 'schemas.complex',
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
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const schema = inferrer.infer(jsonConfig, configFile)
      
      // Verify the complex schema structure
      expect((schema as any)._def.typeName).to.equal('ZodObject')
      const shape = (schema as z.ZodObject<any>).shape
      
      expect((shape.name as any)._def.typeName).to.equal('ZodString')
      
      expect((shape.tags as any)._def.typeName).to.equal('ZodArray')
      expect((shape.tags as any)._def.type._def.typeName).to.equal('ZodString')
      
      expect((shape.metadata as any)._def.typeName).to.equal('ZodObject')
      const metadataShape = (shape.metadata as z.ZodObject<any>).shape
      expect((metadataShape.created as any)._def.typeName).to.equal('ZodString')
      expect((metadataShape.modified as any)._def.typeName).to.equal('ZodOptional')
      
      expect((shape.status as any)._def.typeName).to.equal('ZodEnum')
      expect((shape.status as any)._def.values).to.deep.equal(['active', 'inactive', 'pending'])
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
        schemaKey: 'schemas.template',
        rows: [
          {
            values: [
              {
                value: {
                  json: {
                    json: '{"greeting":"Hello {{name}}!", "data": {"title": "Welcome to {{place}}"}}'
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
      }

      const configFile: ConfigFile = {
        configs: [schemaConfig, jsonConfig],
      }

      const schema = inferrer.infer(jsonConfig, configFile)
      
      // Verify the hybrid approach - structure from schema with template processing
      expect((schema as any)._def.typeName).to.equal('ZodObject')
      const shape = (schema as z.ZodObject<any>).shape
      
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
                    json: '{"url": "url is {{scheme}}://{{host}}", "timeout": 10, "retries": 10}'
                  },
                },
              },
            ],
          },
        ],
        valueType: 'JSON',
        schemaKey: 'url-schema',
      };

      const configFile: ConfigFile = {
        configs: [config],
      };

      const schema = inferrer.infer(config, configFile);
      
      // Verify the schema is an object
      expect((schema as any)._def.typeName).to.equal('ZodObject');
      const shape = (schema as z.ZodObject<any>).shape;
      
      // Verify the url property is a function schema
      expect((shape.url as any)._def.typeName).to.equal('ZodFunction');
      
      // Verify the function schema has the expected arguments
      const urlArgs = (shape.url as any)._def.args;
      expect(urlArgs).to.exist;
      expect(urlArgs._def.typeName).to.equal('ZodTuple');
      expect(urlArgs._def.items).to.exist;
      expect(urlArgs._def.items.length).to.be.at.least(1);
      
      // Check that the first item in the tuple is an object with the expected shape
      const firstArg = urlArgs._def.items[0];
      expect(firstArg._def.typeName).to.equal('ZodObject');
      expect(firstArg.shape.scheme).to.exist;
      expect(firstArg.shape.host).to.exist;
      
      // Verify the other properties are regular number types
      expect((shape.timeout as any)._def.typeName).to.equal('ZodNumber');
      expect((shape.retries as any)._def.typeName).to.equal('ZodNumber');
    });
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
