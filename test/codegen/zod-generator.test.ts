import { expect } from '@oclif/test'

import type { Config, ConfigFile } from '../../src/codegen/types.js';

import { ZodGenerator } from '../../src/codegen/zod-generator.js';

describe('ZodGenerator', () => {
    describe('getAllTemplateStrings', () => {
        let zodGenerator: ZodGenerator;

        beforeEach(() => {
            // Create a minimal ConfigFile to initialize ZodGenerator
            const configFile: ConfigFile = {
                configs: []
            };
            zodGenerator = new ZodGenerator(configFile);
        });

        it('should extract strings from direct string values', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test-config',
                rows: [
                    {
                        values: [
                            {
                                value: {
                                    string: 'Hello {{name}}!'
                                }
                            }
                        ]
                    }
                ],
                valueType: 'STRING'
            };

            const result = zodGenerator.getAllTemplateStrings(config);

            expect(result).to.have.length(1);
            expect(result).to.contain('Hello {{name}}!');
        });

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
                                                message: 'Welcome to {{place}}!'
                                            }
                                        })
                                    }
                                }
                            }
                        ]
                    }
                ],
                schemaKey: '',
                valueType: 'JSON'
            };

            const result = zodGenerator.getAllTemplateStrings(config);

            expect(result).to.have.length(3);
            expect(result).to.contain('Hello {{name}}!');
            expect(result).to.contain('Goodbye {{name}}!');
            expect(result).to.contain('Welcome to {{place}}!');
        });

        it('should handle mixed string and JSON values', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'mixed-config',
                rows: [
                    {
                        values: [
                            {
                                value: {
                                    string: 'Direct {{variable}}'
                                }
                            }
                        ]
                    },
                    {
                        values: [
                            {
                                value: {
                                    json: {
                                        json: JSON.stringify({
                                            text: 'JSON {{variable}}'
                                        })
                                    }
                                }
                            }
                        ]
                    }
                ],
                schemaKey: '',
                valueType: 'STRING'
            };

            const result = zodGenerator.getAllTemplateStrings(config);

            expect(result).to.have.length(2);
            expect(result).to.contain('Direct {{variable}}');
            expect(result).to.contain('JSON {{variable}}');
        });


        it('should handle empty values gracefully', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'empty-config',
                rows: [
                    {
                        values: [
                            {
                                value: {} // Empty value object
                            }
                        ]
                    }
                ],
                schemaKey: '',
                valueType: 'STRING'
            };

            const result = zodGenerator.getAllTemplateStrings(config);

            expect(result).to.have.length(0);
        });
    });
}); 