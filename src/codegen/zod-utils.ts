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
     * Generate code for transforming raw data based on a Zod schema
     * @param zodType The Zod schema
     * @param propertyPath Current property path for nested properties
     * @returns string representing the code to transform raw data
     */
    generateReturnValueCode(zodType: z.ZodTypeAny, propertyPath: string = ''): string {
        if (!zodType || !zodType._def) return 'raw';

        switch (zodType._def.typeName) {
            case 'ZodString':
            case 'ZodNumber':
            case 'ZodBoolean':
            case 'ZodNull':
            case 'ZodUndefined': {
                return propertyPath ? `raw${propertyPath}` : 'raw';
            }

            case 'ZodArray': {
                const elementCode = this.generateReturnValueCode(zodType._def.type);
                if (elementCode === 'raw') {
                    return propertyPath ? `raw${propertyPath}` : 'raw';
                }
                return `Array.isArray(raw${propertyPath}) ? raw${propertyPath}.map(item => ${elementCode.replaceAll('raw', 'item')}) : []`;
            }

            case 'ZodObject': {
                const shape = zodType._def.shape();
                const props = [];

                for (const key in shape) {
                    if (Object.hasOwn(shape, key)) {
                        const newPath = propertyPath ? `${propertyPath}.${key}` : `.${key}`;
                        const propCode = this.generateReturnValueCode(shape[key], newPath);

                        if (shape[key]._def.typeName === 'ZodFunction') {
                            // Handle function within object directly
                            props.push(`${key}: ${propCode}`);
                        } else if (propCode === `raw${newPath}`) {
                            // Simple passthrough for primitive types
                            props.push(`${key}: raw${newPath}`);
                        } else {
                            // For complex types that aren't functions
                            props.push(`${key}: ${propCode}`);
                        }
                    }
                }

                if (props.length === 0) {
                    return propertyPath ? `raw${propertyPath}` : 'raw';
                }

                return `{ ${props.join(', ')} }`;
            }

            case 'ZodOptional': {
                const innerCode = this.generateReturnValueCode(zodType._def.innerType, propertyPath);
                if (innerCode === `raw${propertyPath}`) {
                    return innerCode;
                }
                return `raw${propertyPath} === undefined ? undefined : ${innerCode}`;
            }

            case 'ZodFunction': {
                // For functions, we need special handling based on context
                const paramsSchema = this.paramsOf(zodType);
                const paramsType = paramsSchema ? this.zodTypeToTypescript(paramsSchema) : '{}';

                return `(params: ${paramsType}) => Mustache.render(raw${propertyPath}, params)`;
            }

            case 'ZodUnion': {
                // For unions, we'd ideally need type checking, but for now just return raw
                return propertyPath ? `raw${propertyPath}` : 'raw';
            }

            default: {
                return propertyPath ? `raw${propertyPath}` : 'raw';
            }
        }
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
     * Extract parameter schema from a Zod function schema
     * @param schema The Zod schema
     * @returns The parameters schema if it's a function, or undefined otherwise
     */
    paramsOf(schema: z.ZodTypeAny): undefined | z.ZodTypeAny {
        if (!schema || !schema._def) return undefined;

        // Check if this is a function schema
        if (schema._def.typeName === 'ZodFunction') {
            // Get the args schema (which is actually a ZodTuple)
            const argsSchema = schema._def.args;

            // If it's a tuple with a single item, return that item
            if (argsSchema._def.typeName === 'ZodTuple' &&
                argsSchema._def.items &&
                argsSchema._def.items.length === 1) {
                return argsSchema._def.items[0];
            }

            // Otherwise return the args schema as is
            return argsSchema;
        }

        // Not a function, return undefined
        return undefined;
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
     * Simplify a Zod schema by replacing function types with their return types
     */
    simplifyFunctions(schema: z.ZodTypeAny): z.ZodTypeAny {
        if (!schema || !schema._def) return schema;

        // Check for ZodFunction type
        if (schema._def.typeName === 'ZodFunction') {
            // Replace function with its return type
            return this.simplifyFunctions(schema._def.returns);
        }

        // Handle ZodObject recursively
        if (schema._def.typeName === 'ZodObject') {
            const shape = schema._def.shape();
            const newShape: Record<string, z.ZodTypeAny> = {};

            // Process each property
            for (const key in shape) {
                if (Object.hasOwn(shape, key)) {
                    newShape[key] = this.simplifyFunctions(shape[key]);
                }
            }

            return z.object(newShape);
        }

        // Handle ZodArray recursively
        if (schema._def.typeName === 'ZodArray') {
            const elementType = this.simplifyFunctions(schema._def.type);
            return z.array(elementType);
        }

        // Handle ZodOptional recursively
        if (schema._def.typeName === 'ZodOptional') {
            const innerType = this.simplifyFunctions(schema._def.innerType);
            return z.optional(innerType);
        }

        // Handle ZodUnion recursively
        if (schema._def.typeName === 'ZodUnion') {
            const options = schema._def.options.map((option: z.ZodTypeAny) =>
                this.simplifyFunctions(option)
            );
            return z.union(options);
        }

        // For all other types, return as is
        return schema;
    },

    /**
     * Convert a Zod schema to its string representation
     */
    zodToString(schema: z.ZodType): string {
        // Keep using any for internal properties that aren't exposed in the type definitions
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

    // Convert a Zod type to its TypeScript equivalent
    zodTypeToTypescript(zodType: z.ZodTypeAny): string {
        if (!zodType || !zodType._def) return 'any';

        switch (zodType._def.typeName) {
            case 'ZodString': {
                return 'string';
            }

            case 'ZodNumber': {
                return 'number';
            }

            case 'ZodBoolean': {
                return 'boolean';
            }

            case 'ZodNull': {
                return 'null';
            }

            case 'ZodUndefined': {
                return 'undefined';
            }

            case 'ZodArray': {
                const innerType = this.zodTypeToTypescript(zodType._def.type);
                return `${innerType}[]`;
            }

            case 'ZodObject': {
                const shape = zodType._def.shape();
                const props = [];
                for (const key in shape) {
                    if (Object.hasOwn(shape, key)) {
                        const propType = this.zodTypeToTypescript(shape[key]);
                        props.push(`${key}: ${propType}`);
                    }
                }

                return `{ ${props.join('; ')} }`;
            }

            case 'ZodEnum': {
                const options = zodType._def.values;
                return options.map((o: string) => `'${o}'`).join(' | ');
            }

            case 'ZodUnion': {
                const unionTypes = zodType._def.options.map((t: z.ZodTypeAny) => this.zodTypeToTypescript(t));
                return unionTypes.join(' | ');
            }

            case 'ZodFunction': {
                const paramsSchema = this.paramsOf(zodType);
                const paramsType = paramsSchema ? this.zodTypeToTypescript(paramsSchema) : '{}';
                const returnType = this.zodTypeToTypescript(zodType._def.returns);
                return `(params: ${paramsType}) => ${returnType}`;
            }

            default: {
                return 'any';
            }
        }
    },
}; 