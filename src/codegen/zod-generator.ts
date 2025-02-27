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
            .filter(config => this.canGenerateSimpleAccessor(config))
            .map(config => ({
                key: config.key,
                methodName: this.keyToMethodName(config.key),
                params: '',
                returnType: this.valueTypeToReturnType(config.valueType)
            }));

        // Load and render template
        const templatePath = path.join(__dirname, 'templates', 'typescript.mustache');
        const template = fs.readFileSync(templatePath, 'utf8');
        const output = Mustache.render(template, {
            accessorMethods,
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

    // Check if we can generate a simple accessor (skip complex mustache templates for now)
    private canGenerateSimpleAccessor(config: Config): boolean {
        // Skip complex Mustache templates that need arguments
        if (config.valueType === 'STRING') {
            const templateStrings = this.getAllTemplateStrings(config);
            if (templateStrings.length > 0) {
                const schema = MustacheExtractor.extractSchema(templateStrings[0]);
                // If schema has properties, it needs arguments
                if (Object.keys(schema._def.shape()).length > 0) {
                    return false;
                }
            }
        }

        return true;
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

            case 'DURATION': {
                return 'z.string().duration()';
            }

            case 'JSON': {
                console.log(config);
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

    // Convert config key to a valid method name
    private keyToMethodName(key: string): string {
        // Replace spaces with underscores first
        key = key.replaceAll(' ', '_');

        // Replace periods with underscores
        const parts = key.split('.');

        return parts.map((part, index) => {
            // First, handle the camelCase for hyphens
            if (index === 0) {
                // For the first part, convert "multi-word" to "multiWord"
                part = part.replace(/-(\w)/g, (_, char) => char.toUpperCase());
            } else {
                // For subsequent parts, capitalize after hyphens
                part = part.replace(/-(\w)/g, (_, char) => char.toUpperCase());
            }

            // Now replace remaining special characters with underscores
            part = part.replace(/[^\dA-Za-z]/g, '_');

            // Remove duplicate underscores
            part = part.replace(/_+/g, '_');

            // Ensure the first character is a valid identifier (not a number)
            if (/^\d/.test(part)) {
                part = '_' + part;
            }

            return part;
        }).join('_');
    }

    // Map config value types to TypeScript return types
    private valueTypeToReturnType(valueType: string): string {
        switch (valueType) {
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

            case 'JSON': {
                return 'any';
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
