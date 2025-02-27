import { camelCase, pascalCase } from 'change-case';
import Mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import type { Config, ConfigFile } from './types.js';

import { MustacheExtractor } from './mustache-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ZodGenerator {
    constructor(private configFile: ConfigFile) { }

    generate(): string {
        console.log('Generating Zod schemas for configs...');

        // Collect configs into schema lines
        const schemaLines = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => ({
                key: config.key,
                zodType: this.getZodTypeForValueType(config)
            }));

        // Generate accessor methods info
        const accessorMethods = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => {
                const methodInfo = {
                    key: config.key,
                    methodName: this.keyToMethodName(config.key),
                    returnType: this.valueTypeToReturnType(config)
                };

                // For string values that might be Mustache templates
                if (config.valueType === 'STRING') {
                    const templateStrings = this.getAllTemplateStrings(config);
                    if (templateStrings.length > 0) {
                        const schema = MustacheExtractor.extractSchema(templateStrings[0]);
                        const schemaShape = schema._def.shape();
                        const hasParams = Object.keys(schemaShape).length > 0;

                        if (hasParams) {
                            // Generate parameters for the method signature
                            const paramsType = this.generateParamsType(schemaShape);
                            return {
                                ...methodInfo,
                                params: `params: ${paramsType}`,
                                paramsArg: 'params'
                            };
                        }

                        // No parameters needed for this template
                        return {
                            ...methodInfo,
                            params: '',
                            paramsArg: '{}'
                        };

                    }
                }

                // For non-Mustache values, no parameters needed
                return {
                    ...methodInfo,
                    params: '',
                    paramsArg: undefined
                };
            });
        // Collect schema configs to export
        const schemaConfigs = this.configFile.configs
            .filter(config => config.configType === 'SCHEMA')
            .map(config => ({
                schemaName: this.keyToSchemaName(config.key),
                zodSchema: this.getZodSchemaByKey(config.key)
            }));

        // Load and render template
        const templatePath = path.join(__dirname, 'templates', 'typescript.mustache');
        const template = fs.readFileSync(templatePath, 'utf8');
        const output = Mustache.render(template, {
            accessorMethods,
            schemaConfigs,
            schemaLines
        });

        console.log('\nGenerated Schema:\n');
        return output;
    }


    getAllTemplateStrings(config: Config): string[] {
        return config.rows.flatMap(row =>
            row.values.flatMap(valueObj => {
                if (valueObj.value.string) {
                    return [valueObj.value.string];
                }

                // Handle JSON values that might contain templates
                if (valueObj.value.json?.json) {
                    try {
                        const jsonObj = JSON.parse(valueObj.value.json.json);
                        // Recursively find all string values in the JSON object
                        const jsonStrings: string[] = [];
                        JSON.stringify(jsonObj, (_, value) => {
                            if (typeof value === 'string') {
                                jsonStrings.push(value);
                            }

                            return value;
                        });
                        return jsonStrings;
                    } catch (error) {
                        console.warn(`Failed to parse JSON for ${config.key}:`, error);
                        return [];
                    }
                }

                return [];
            })
        );
    }

    // For objects found in mustache templates, convert the zod to a string
    zodToString(schema: z.ZodType): string {
        if (schema instanceof z.ZodObject) {
            const shape = schema._def.shape();
            const props = Object.entries(shape)
                .map(([key, value]) => `        ${key}: ${this.zodToString(value as z.ZodType)}`)
                .join(',\n');
            return `z.object({\n${props}\n    })`;
        }

        if (schema instanceof z.ZodArray) {
            return `z.array(${this.zodToString(schema._def.type)})`;
        }

        if (schema instanceof z.ZodString) {
            return 'z.string()';
        }

        if (schema instanceof z.ZodOptional) {
            const { innerType } = schema._def;
            return `${this.zodToString(innerType)}.optional()`;
        }

        if (schema instanceof z.ZodBoolean) {
            return 'z.boolean()';
        }

        console.warn('Unknown zod type:', schema);
        return 'z.any()';
    }


    // Generate TypeScript type for parameters
    private generateParamsType(schemaShape: Record<string, z.ZodTypeAny>): string {
        const properties = Object.entries(schemaShape)
            .map(([key, type]) => {
                let typeString = 'any';

                if (type instanceof z.ZodString) {
                    typeString = 'string';
                } else if (type instanceof z.ZodNumber) {
                    typeString = 'number';
                } else if (type instanceof z.ZodBoolean) {
                    typeString = 'boolean';
                } else if (type instanceof z.ZodArray) {
                    typeString = 'any[]';
                } else if (type instanceof z.ZodObject) {
                    typeString = 'Record<string, any>';
                }

                return `${key}: ${typeString}`;
            })
            .join('; ');

        return `{ ${properties} }`;
    }


    // Helper method to get a config by its key
    private getConfigByKey(key: string): Config | undefined {
        return this.configFile.configs.find(config => config.key === key);
    }

    // Helper method to get a ZOD schema by its key
    private getZodSchemaByKey(key: string): string {
        const schemaConfig = this.getConfigByKey(key);

        if (!schemaConfig) {
            throw new Error(`No config found with key: ${key}`);
        }

        if (!schemaConfig.rows || schemaConfig.rows.length === 0) {
            throw new Error(`Config ${key} has no rows`);
        }

        const firstRow = schemaConfig.rows[0];
        if (!firstRow.values || firstRow.values.length === 0) {
            throw new Error(`Config ${key} first row has no values`);
        }

        const firstValue = firstRow.values[0];

        // Check if this is a ZOD schema
        if (firstValue.value.schema?.schemaType !== 'ZOD') {
            throw new Error(`Config ${key} is not a ZOD schema, it's: ${firstValue.value.schema?.schemaType}`);
        }

        // Return the schema
        const zodSchema = firstValue.value.schema?.schema;
        if (!zodSchema) {
            throw new Error(`Config ${key} has no schema content`);
        }

        return zodSchema;
    }

    private getZodTypeForValueType(config: Config): string {
        switch (config.valueType) {
            case 'STRING': {
                const templateStrings = this.getAllTemplateStrings(config);
                const schema = MustacheExtractor.extractSchema(templateStrings[0]);

                // If the schema is empty (no properties), just return basic MustacheString
                if (Object.keys(schema._def.shape()).length === 0) {
                    return 'MustacheString()';
                }

                return `MustacheString(${this.zodToString(schema)})`;
            }

            case 'BOOL': {
                return 'z.boolean()';
            }

            case 'INT': {
                return 'z.number()';
            }

            case 'STRING_LIST': {
                return 'z.array(z.string())';
            }

            case 'DURATION': {
                return 'z.string().duration()';
            }

            case 'JSON': {
                if (config.schemaKey) {
                    const schema = this.getZodSchemaByKey(config.schemaKey);
                    if (schema) {
                        return schema;
                    }
                }

                return "z.union([z.array(z.any()), z.record(z.any())])";
            }

            case 'LOG_LEVEL': {
                return 'z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR"])';
            }

            default: {
                return 'z.any()';
            }
        }
    }

    // Convert config key to a valid method name using libraries
    private keyToMethodName(key: string): string {
        // Split by periods to get parts
        const parts = key.split('.');

        return parts.map((part, index) => {
            // Convert to camelCase or pascalCase based on position
            const transformed = index === 0
                ? camelCase(part)
                : pascalCase(part);

            // Ensure it's a valid identifier
            return this.makeSafeIdentifier(transformed);
        }).join('_');
    }

    // Add a method to convert a config key to a schema variable name
    private keyToSchemaName(key: string): string {
        // Convert 'my.config.key' to 'myConfigKeySchema'
        return this.keyToMethodName(key) + 'Schema';
    }

    private makeSafeIdentifier(identifier: string): string {
        // Ensure it starts with a letter or underscore
        let result = identifier;
        if (/^[^A-Z_a-z]/.test(result)) {
            result = '_' + result;
        }

        // Replace invalid characters with underscores
        result = result.replaceAll(/[^\w$]/g, '_');

        return result;
    }


    // Map config value types to TypeScript return types
    private valueTypeToReturnType(config: Config): string {
        switch (config.valueType) {
            case 'BOOL': {
                return 'boolean';
            }

            case 'STRING': {
                return 'string';
            }

            case 'INT': {
                return 'number';
            }

            case 'DURATION': {
                return 'string';
            }

            case 'STRING_LIST': {
                return 'string[]';
            }

            case 'JSON': {
                if (config.schemaKey) {
                    // Instead of converting to TypeScript, reference the schema with z.infer
                    return `z.infer<typeof ${this.keyToSchemaName(config.schemaKey)}>`;
                }

                return 'any[] | Record<string, any>';
            }

            case 'LOG_LEVEL': {
                return '"TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR"';
            }

            default: {
                return 'any';
            }
        }
    }
}
