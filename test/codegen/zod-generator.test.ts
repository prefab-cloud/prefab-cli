import { expect } from 'chai';

import { Config, ConfigFile } from '../../src/codegen/types.js';
import { ZodGenerator } from '../../src/codegen/zod-generator.js';

/**
 * Helper function to compare strings with normalized line endings
 */
function expectToEqualWithNormalizedLineEndings(actual: string, expected: string): void {
    expect(actual.trim().replaceAll(/\r\n/g, '\n')).to.equal(expected);
}

// Simple tests using the actual filesystem and templates
describe('ZodGenerator', () => {
    let mockConfigFile: ConfigFile;
    let mockBoolConfig: Config;
    let mockStringConfig: Config;
    let mockTemplateConfig: Config;

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
                                bool: true
                            }
                        }
                    ]
                }
            ],
            valueType: 'BOOL',
        };

        // Create a string config
        mockStringConfig = {
            configType: 'CONFIG',
            key: 'example.config.string',
            rows: [
                {
                    values: [
                        {
                            value: {
                                string: 'test-value'
                            }
                        }
                    ]
                }
            ],
            valueType: 'STRING',
        };

        // Create a template string config (function)
        mockTemplateConfig = {
            configType: 'CONFIG',
            key: 'example.config.function',
            rows: [
                {
                    values: [
                        {
                            value: {
                                string: '{{name}}'
                            }
                        }
                    ]
                }
            ],
            valueType: 'STRING',
        };

        // Create mock config file with sample configs
        mockConfigFile = {
            configs: [
                mockBoolConfig,
                mockStringConfig,
                mockTemplateConfig,
            ],
        };
    });

    describe('generateSchemaLines', () => {
        it('should generate schema lines for configs', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const schemaLines = generator.generateSchemaLines();

            expect(schemaLines).to.have.lengthOf(3);
            expect(schemaLines[0].key).to.equal('example.feature.flag');
            expect(schemaLines[0].schemaName).to.equal('example_Feature_FlagSchema');
        });
    });

    describe('generateAccessorMethods', () => {
        it('should generate accessor methods for configs', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const accessorMethods = generator.generateAccessorMethods();

            expect(accessorMethods).to.have.lengthOf(3);
            expect(accessorMethods[0].key).to.equal('example.feature.flag');
            expect(accessorMethods[0].methodName).to.equal('example_Feature_Flag');
        });

        it('should identify function returns correctly', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const accessorMethods = generator.generateAccessorMethods();

            // The boolean flag should not be a function return
            expect(accessorMethods[0].isFunctionReturn).to.be.false;
            // The string with mustache template should be identified as a function
            expect(accessorMethods[2].isFunctionReturn).to.be.true;
        });
    });

    describe('generateAccessorMethod', () => {
        it('should generate a boolean accessor method correctly', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const accessorMethod = generator.generateAccessorMethod(mockBoolConfig);

            expect(accessorMethod.methodName).to.equal('example_Feature_Flag');
            expect(accessorMethod.key).to.equal('example.feature.flag');
            expect(accessorMethod.isFunctionReturn).to.be.false;
            expect(accessorMethod.returnType).to.equal('boolean');
            expect(accessorMethod.returnValue).to.equal('raw');
        });

        it('should generate a string accessor method correctly', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const accessorMethod = generator.generateAccessorMethod(mockStringConfig);

            expect(accessorMethod.methodName).to.equal('example_Config_String');
            expect(accessorMethod.key).to.equal('example.config.string');
            expect(accessorMethod.isFunctionReturn).to.be.false;
            expect(accessorMethod.returnType).to.equal('string');
            expect(accessorMethod.returnValue).to.equal('raw');
        });

        it('should generate a template function accessor method correctly', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const accessorMethod = generator.generateAccessorMethod(mockTemplateConfig);

            expect(accessorMethod.methodName).to.equal('example_Config_Function');
            expect(accessorMethod.key).to.equal('example.config.function');
            expect(accessorMethod.isFunctionReturn).to.be.true;
            expect(accessorMethod.returnType).to.equal('string');
            expect(accessorMethod.returnValue).to.equal('(params: { name: string }) => Mustache.render(raw, params)');
            expect(accessorMethod.params).to.equal('{ name: string }');
        });
    });

    describe('renderAccessorMethod', () => {
        it('should render a boolean accessor method with the actual template', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const result = generator.renderAccessorMethod(mockBoolConfig);

            // Use a single multiline string assertion for better readability
            const expectedOutput = `example_Feature_Flag(): boolean {
  const raw = this.get('example.feature.flag');
  return raw;
}`;

            // Normalize line endings before comparison
            expectToEqualWithNormalizedLineEndings(result, expectedOutput);
        });

        it('should render a template function accessor method with the actual template', () => {
            const generator = new ZodGenerator(mockConfigFile);
            const result = generator.renderAccessorMethod(mockTemplateConfig);

            // Use a single multiline string assertion for better readability
            const expectedOutput = `example_Config_Function(): (params: { name: string }) => string {
  const raw = this.get('example.config.function');
  return (params: { name: string }) => Mustache.render(raw, params);
}`;

            // Normalize line endings before comparison
            expectToEqualWithNormalizedLineEndings(result, expectedOutput);
        });
    });

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
                                    string: 'Hello {{name}}! Welcome to {{company}}. Your ID is {{user.id}}.'
                                }
                            }
                        ]
                    }
                ],
                valueType: 'STRING',
            };

            // Create a new ConfigFile with just this config
            const singleConfigFile: ConfigFile = {
                configs: [complexConfig]
            };

            // Create a new generator just for this config
            const generator = new ZodGenerator(singleConfigFile);

            // Generate the accessor method
            const accessorMethod = generator.renderAccessorMethod(complexConfig);

            // Use a single multiline string assertion for better readability
            const expectedOutput = `example_Greeting_Template(): (params: { name: string; company: string; user.id: string }) => string {
  const raw = this.get('example.greeting.template');
  return (params: { name: string; company: string; user.id: string }) => Mustache.render(raw, params);
}`;

            // Normalize line endings before comparison
            expectToEqualWithNormalizedLineEndings(accessorMethod, expectedOutput);
        });
    });
}); 