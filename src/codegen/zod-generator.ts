import { camelCase, pascalCase } from 'change-case';
import Mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import type { Config, ConfigFile } from './types.js';

import { MustacheExtractor } from './mustache-extractor.js';
import { ZodUtils } from './zod-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ZodGenerator {
    constructor(private configFile: ConfigFile) { }

    generate(): string {
        console.log('Generating Zod schemas for configs...');

        // Generate accessor methods info
        const accessorMethods = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => {
                const methodInfo = {
                    key: config.key,
                    methodName: ZodUtils.keyToMethodName(config.key),
                    returnType: ZodUtils.valueTypeToReturnType(config)
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
                            const paramsType = ZodUtils.generateParamsType(schemaShape);
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

        // Collect configs into schema lines
        const schemaLines = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => ({
                key: config.key,
                zodType: this.getZodTypeForValueType(config)
            }));

        // Collect schema configs to export
        const schemaConfigs = this.configFile.configs
            .filter(config => config.configType === 'SCHEMA')
            .map(config => ({
                schemaName: ZodUtils.keyToSchemaName(config.key),
                zodSchema: this.getZodSchemaByKey(config.key)
            }));

        // Load and render template
        const templatePath = path.join(__dirname, 'templates', 'typescript.mustache');
        const template = fs.readFileSync(templatePath, 'utf8');
        const output = Mustache.render(template, {
            accessorMethods,
            schemaConfigs,
            schemaLines,
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

                return `MustacheString(${ZodUtils.zodToString(schema)})`;
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
}
