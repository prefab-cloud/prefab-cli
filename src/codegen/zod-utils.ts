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
        // Use type assertion to access internal properties
        const def = schema._def as any;

        // Check for primitive types
        if (def.typeName === 'ZodString') {
            return 'z.string()';
        }

        if (def.typeName === 'ZodNumber') {
            return 'z.number()';
        }

        if (def.typeName === 'ZodBoolean') {
            return 'z.boolean()';
        }

        if (def.typeName === 'ZodNull') {
            return 'z.null()';
        }

        if (def.typeName === 'ZodArray') {
            const innerType = this.zodToString(def.type);
            return `z.array(${innerType})`;
        }

        // Handle ZodOptional
        if (def.typeName === 'ZodOptional') {
            const innerType = this.zodToString(def.innerType);
            return `${innerType}.optional()`;
        }

        // Handle ZodUnion
        if (def.typeName === 'ZodUnion') {
            const options = def.options.map((option: z.ZodType) => this.zodToString(option));
            return `z.union([${options.join(', ')}])`;
        }

        // Handle ZodFunction
        if (def.typeName === 'ZodFunction') {
            // Handle the arguments
            const argsSchema = def.args;
            const returnsSchema = def.returns;

            return `z.function().args(${this.zodToString(argsSchema)}).returns(${this.zodToString(returnsSchema)})`;
        }

        // Handle ZodTuple (used for function args)
        if (def.typeName === 'ZodTuple') {
            if (def.items && def.items.length === 1) {
                return this.zodToString(def.items[0]);
            }
            return this.zodToString(def.items[0]); // Just take the first item for simplicity
        }

        // Handle ZodObject
        if (def.typeName === 'ZodObject') {
            const shape = def.shape();
            const props = Object.entries(shape).map(([key, value]) =>
                `${key}: ${this.zodToString(value as z.ZodTypeAny)}`
            ).join(', ');

            return `z.object({${props}})`;
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