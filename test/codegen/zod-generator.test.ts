import {expect} from 'chai'

import {Config, ConfigFile} from '../../src/codegen/types.js'
import {SupportedLanguage, ZodGenerator} from '../../src/codegen/zod-generator.js'

/**
 * Helper function to compare strings with normalized line endings
 */
function expectToEqualWithNormalizedLineEndings(actual: string, expected: string): void {
  expect(actual.trim().replaceAll('\r\n', '\n')).to.equal(expected)
}

// Simple tests using the actual filesystem and templates
describe('ZodGenerator', () => {
  const logger = (category: string | unknown, message?: unknown) => {
    console.log(category, message)
  }

  let mockConfigFile: ConfigFile
  let mockBoolConfig: Config
  let mockStringConfig: Config
  let mockObjectConfig: Config
  let mockObjectWithPlaceholderConfig: Config
  let mockObjectWithPlaceholderConfigMultiValue: Config
  let mockTemplateConfig: Config

  beforeEach(() => {
    // Create a boolean feature flag config
    mockBoolConfig = {
      configType: 'FEATURE_FLAG',
      key: 'example.feature.flag',
      rows: [
        {
          values: [
            {
              value: {
                bool: true,
              },
            },
          ],
        },
      ],
      valueType: 'BOOL',
    }

    // Create a string config
    mockStringConfig = {
      configType: 'CONFIG',
      key: 'example.config.string',
      rows: [
        {
          values: [
            {
              value: {
                string: 'test-value',
              },
            },
          ],
        },
      ],
      valueType: 'STRING',
    }

    mockObjectConfig = {
      configType: 'CONFIG',
      key: 'example.config.object',
      rows: [
        {
          values: [
            {
              value: {
                json: {json: '{"name": "John", "age": 30}'},
              },
            },
          ],
        },
      ],
      valueType: 'JSON',
    }

    mockObjectWithPlaceholderConfig = {
      configType: 'CONFIG',
      key: 'example.config.object',
      rows: [
        {
          values: [
            {
              value: {
                json: {json: '{"template": "template {{placeholder}}"}'},
              },
            },
          ],
        },
      ],
      valueType: 'JSON',
    }
    mockObjectWithPlaceholderConfigMultiValue = {
      configType: 'CONFIG',
      key: 'example.config.object',
      rows: [
        {
          values: [
            {
              value: {
                json: {json: '{"template": "template {{other_placeholder}}", "num": 20}'},
              },
            },
            {
              value: {
                json: {json: '{"template": "template {{placeholder}}"}'},
              },
            },
          ],
        },
      ],
      valueType: 'JSON',
    }
    // Create a template string config (function)
    mockTemplateConfig = {
      configType: 'CONFIG',
      key: 'example.config.function',
      rows: [
        {
          values: [
            {
              value: {
                string: '{{name}}',
              },
            },
          ],
        },
      ],
      valueType: 'STRING',
    }

    // Create mock config file with sample configs
    mockConfigFile = {
      configs: [mockBoolConfig, mockStringConfig, mockObjectConfig, mockTemplateConfig],
    }
  })

  describe('generate', () => {
    it('should generate a output for configs', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const output = generator.generate(SupportedLanguage.TypeScript)

      expect(output).to.include('PrefabConfig')
    })

    it('should throw if method names conflict', () => {
      mockConfigFile.configs = [
        ...mockConfigFile.configs,
        {
          configType: 'FEATURE_FLAG',
          key: 'example-feature-flag',
          rows: [
            {
              values: [
                {
                  value: {
                    bool: true,
                  },
                },
              ],
            },
          ],
          valueType: 'BOOL',
        },
      ]
      const generator = new ZodGenerator(mockConfigFile, logger)

      expect(() => generator.generate(SupportedLanguage.TypeScript)).to.throw(
        `Method 'exampleFeatureFlag' is already registered. Prefab key example.feature.flag conflicts with example-feature-flag`,
      )
    })
  })

  describe('generateSchemaLines', () => {
    it('should generate schema lines for configs', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const schemaLines = generator.generateSchemaLines()

      expect(schemaLines).to.have.lengthOf(4)
      expect(schemaLines[0].key).to.equal('example.feature.flag')
      expect(schemaLines[0].schemaName).to.equal('exampleFeatureFlagSchema')
    })
  })

  describe('generateAccessorMethod', () => {
    it('should generate a boolean accessor method correctly', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const accessorMethod = generator.generateAccessorMethod(mockBoolConfig, SupportedLanguage.TypeScript)

      expect(accessorMethod.methodName).to.equal('exampleFeatureFlag')
      expect(accessorMethod.key).to.equal('example.feature.flag')
      expect(accessorMethod.isFunctionReturn).to.be.false
      expect(accessorMethod.returnType).to.equal('boolean')
      expect(accessorMethod.returnValue).to.equal('raw')
    })

    it('should generate a string accessor method correctly', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const accessorMethod = generator.generateAccessorMethod(mockStringConfig, SupportedLanguage.TypeScript)

      expect(accessorMethod.methodName).to.equal('exampleConfigString')
      expect(accessorMethod.key).to.equal('example.config.string')
      expect(accessorMethod.isFunctionReturn).to.be.false
      expect(accessorMethod.returnType).to.equal('string')
      expect(accessorMethod.returnValue).to.equal('raw')
    })

    it('should generate a template function accessor method correctly', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const accessorMethod = generator.generateAccessorMethod(mockTemplateConfig, SupportedLanguage.TypeScript)

      expect(accessorMethod.methodName).to.equal('exampleConfigFunction')
      expect(accessorMethod.key).to.equal('example.config.function')
      expect(accessorMethod.isFunctionReturn).to.be.true
      expect(accessorMethod.returnType).to.equal('string')
      expect(accessorMethod.returnValue).to.equal('(params: { name: string }) => Mustache.render(raw ?? "", params)')
      expect(accessorMethod.params).to.equal('{ name: string }')
    })
  })

  describe('renderAccessorMethod', () => {
    it('should render a boolean accessor method with the actual template', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockBoolConfig)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `exampleFeatureFlag(contexts?: Contexts | ContextObj): boolean {
    const raw = this.get('example.feature.flag', contexts);
    return raw;
  }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })

    it('should render a template function accessor method with the actual template', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockTemplateConfig)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `exampleConfigFunction(contexts?: Contexts | ContextObj): (params: { name: string }) => string {
    const raw = this.get('example.config.function', contexts);
    return (params: { name: string }) => Mustache.render(raw ?? "", params);
  }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })

    it('should render a JSON object accessor method with the actual template', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockObjectConfig)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `exampleConfigObject(contexts?: Contexts | ContextObj): { name: string; age: number } {
    const raw = this.get('example.config.object', contexts);
    return { "name": raw["name"], "age": raw["age"] };
  }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })
  })

  describe('End-to-end config rendering', () => {
    // This test shows how to test the rendering of a single config without mocking
    it('should generate a complete accessor method for the complex config', () => {
      // A more complex example with nested templates
      const complexConfig: Config = {
        configType: 'CONFIG',
        key: 'example.greeting.template',
        rows: [
          {
            values: [
              {
                value: {
                  string: 'Hello {{name}}! Welcome to {{company}}. Your ID is {{user.id}}.',
                },
              },
            ],
          },
        ],
        valueType: 'STRING',
      }

      // Create a new ConfigFile with just this config
      const singleConfigFile: ConfigFile = {
        configs: [complexConfig],
      }

      // Create a new generator just for this config
      const generator = new ZodGenerator(singleConfigFile, logger)

      // Generate the accessor method
      const accessorMethod = generator.renderAccessorMethod(complexConfig)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `exampleGreetingTemplate(contexts?: Contexts | ContextObj): (params: { name: string; company: string; user.id: string }) => string {
    const raw = this.get('example.greeting.template', contexts);
    return (params: { name: string; company: string; user.id: string }) => Mustache.render(raw ?? "", params);
  }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(accessorMethod, expectedOutput)
    })
  })

  describe('renderAccessorMethod python', () => {
    it('should render a boolean accessor method with the actual template', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockBoolConfig, SupportedLanguage.Python)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `def exampleFeatureFlag(self):
      raw = self.get('example.feature.flag')
      return raw`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })
    it('should render a template method with the actual template', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockTemplateConfig, SupportedLanguage.Python)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `def exampleConfigFunction(self):
      raw = self.get('example.config.function')
      return lambda params: pystache.render(raw, params)`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })
    it('should render a JSON object with the actual template', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockObjectConfig, SupportedLanguage.Python)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `def exampleConfigObject(self):
      raw = self.get('example.config.object')
      return { "name": raw["name"], "age": raw["age"] }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })
  })

  describe('renderAccessorMethod for JSON with templates', () => {
    it('should render a JSON object with template placeholders for TypeScript', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockObjectWithPlaceholderConfig)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `exampleConfigObject(contexts?: Contexts | ContextObj): { template: (params: { placeholder: string }) => string } {
    const raw = this.get('example.config.object', contexts);
    return { "template": (params: { placeholder: string }) => Mustache.render(raw["template"] ?? "", params) };
  }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })

    it('should render a JSON object with multiple values and templates for TypeScript', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockObjectWithPlaceholderConfigMultiValue)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `exampleConfigObject(contexts?: Contexts | ContextObj): { template: (params: { other_placeholder: string; placeholder: string }) => string; num?: number } {
    const raw = this.get('example.config.object', contexts);
    return { "template": (params: { other_placeholder: string; placeholder: string }) => Mustache.render(raw["template"] ?? "", params), "num": raw["num"] };
  }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })
  })

  describe('renderAccessorMethod python for JSON with templates', () => {
    it('should render a JSON object with template placeholders for Python', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockObjectWithPlaceholderConfig, SupportedLanguage.Python)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `def exampleConfigObject(self):
      raw = self.get('example.config.object')
      return { "template": lambda params: pystache.render(raw["template"], params) }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })

    it('should render a JSON object with multiple values and templates for Python', () => {
      const generator = new ZodGenerator(mockConfigFile, logger)
      const result = generator.renderAccessorMethod(mockObjectWithPlaceholderConfigMultiValue, SupportedLanguage.Python)

      // Use a single multiline string assertion for better readability
      const expectedOutput = `def exampleConfigObject(self):
      raw = self.get('example.config.object')
      return { "template": lambda params: pystache.render(raw["template"], params), "num": raw["num"] }`

      // Normalize line endings before comparison
      expectToEqualWithNormalizedLineEndings(result, expectedOutput)
    })
  })
})
