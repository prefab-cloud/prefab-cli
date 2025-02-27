import { camelCase, pascalCase } from 'change-case';
import { z } from 'zod';

import type { Config } from './types.js';

export const ZodUtils = {
    /**
     * Generate TypeScript parameter type from Zod schema shape
     */
    generateParamsType(schemaShape: Record<string, z.ZodTypeAny>): string {
        const properties = Object.entries(schemaShape)
            .map(([key, type]) => {
                const typeString = this.zodTypeToTsType(type);
                return `${key}: ${typeString}`;
            })
            .join('; ');

        return `{ ${properties} }`;
    },

    /**
     * Convert config key to a valid method name
     */
    keyToMethodName(key: string): string {
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
    },

    /**
     * Convert a config key to a schema variable name
     */
    keyToSchemaName(key: string): string {
        // Convert 'my.config.key' to 'myConfigKeySchema'
        return this.keyToMethodName(key) + 'Schema';
    },

    /**
     * Ensure a string is a safe JavaScript identifier
     */
    makeSafeIdentifier(identifier: string): string {
        // Ensure it starts with a letter or underscore
        let result = identifier;
        if (/^[^A-Z_a-z]/.test(result)) {
            result = '_' + result;
        }

        // Replace invalid characters with underscores
        result = result.replaceAll(/[^\w$]/g, '_');

        return result;
    },

    /**
     * Map config value types to TypeScript return types
     */
    prefabValueTypeToTypescriptReturnType(config: Config): string {
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
    },

    /**
     * Convert a Zod schema to its string representation
     */
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
    },

    /**
     * Convert Zod types to TypeScript type strings
     */
    zodTypeToTsType(zodType: z.ZodTypeAny): string {
        if (zodType instanceof z.ZodString) {
            return 'string';
        }

        if (zodType instanceof z.ZodNumber) {
            return 'number';
        }

        if (zodType instanceof z.ZodBoolean) {
            return 'boolean';
        }

        if (zodType instanceof z.ZodArray) {
            // Recursively get the type of array elements
            return `Array<${this.zodTypeToTsType(zodType.element)}>`;
        }

        if (zodType instanceof z.ZodObject) {
            const shape = zodType._def.shape();
            const innerProps = Object.entries(shape)
                .map(([k, v]) => {
                    const isOptional = v instanceof z.ZodOptional;
                    const typeString = this.zodTypeToTsType(v as z.ZodTypeAny);
                    return `${k}${isOptional ? '?' : ''}: ${typeString}`;
                })
                .join('; ');
            return `{ ${innerProps} }`;
        }

        if (zodType instanceof z.ZodOptional) {
            // Return the unwrapped type without adding the optional marker here
            // The '?' will be added to the property name in the parent context
            return this.zodTypeToTsType(zodType.unwrap());
        }

        if (zodType instanceof z.ZodEnum) {
            // Handle enum types
            const { values } = zodType._def;
            return values.map((v: string) => `"${v}"`).join(' | ');
        }

        // Default fallback
        return 'any';
    },
}; 