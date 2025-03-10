import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

import { z } from 'zod';

import type { Config, ConfigFile } from './types.js';

import { MustacheExtractor } from './mustache-extractor.js';
import { ZodUtils } from './zod-utils.js';

export class SchemaInferrer {
    private jsonToInferredZod = (data: unknown): ZodTypeAny => {
        if (Array.isArray(data)) {
            // If it's an array, infer the type of its first element (assuming homogenous arrays)
            if (data.length > 0) {
                return z.array(this.jsonToInferredZod(data[0]));
            }

            return z.array(z.any()); // Empty arrays default to z.any()
        }

        if (typeof data === "object" && data !== null) {
            // If it's an object, recursively infer the schema for each key
            const shape: Record<string, ZodTypeAny> = {};
            const dataRecord = data as Record<string, unknown>;
            for (const key in dataRecord) {
                if (Object.hasOwn(dataRecord, key)) {
                    shape[key] = this.jsonToInferredZod(dataRecord[key]);
                }
            }

            return z.object(shape);
        }

        if (typeof data === "string") {
            // Check if the string contains mustache templates
            const schema = MustacheExtractor.extractSchema(data);

            // If the schema has properties, it's a template string
            if (Object.keys(schema._def.shape()).length > 0) {
                return z.function().args(schema).returns(z.string());
            }

            // Otherwise it's a regular string
            return z.string();
        }

        if (typeof data === "number") {
            return z.number();
        }

        if (typeof data === "boolean") {
            return z.boolean();
        }

        if (data === null) {
            return z.null();
        }

        return z.any(); // Fallback for unknown types
    };

    private mergeSchemas = (schemaA: ZodObject<ZodRawShape>, schemaB: ZodObject<ZodRawShape>): ZodObject<ZodRawShape> => {
        const shapeA = schemaA.shape;
        const shapeB = schemaB.shape;

        const mergedShape: Record<string, ZodTypeAny> = {};

        const allKeys = new Set([...Object.keys(shapeA), ...Object.keys(shapeB)]);

        for (const key of allKeys) {
            const typeA = shapeA[key];
            const typeB = shapeB[key];

            if (typeA && typeB) {
                // If both schemas have the key
                if (typeA instanceof z.ZodObject && typeB instanceof z.ZodObject) {
                    // Recursively merge nested objects
                    mergedShape[key] = this.mergeSchemas(typeA, typeB);
                } else if (typeA._def.typeName === 'ZodFunction' && typeB._def.typeName === 'ZodFunction') {
                    // For functions, we need to check if their argument shapes are significantly different
                    try {
                        // Safely extract argument shapes
                        const argsA = typeA._def.args;
                        const argsB = typeB._def.args;

                        let areArgsDifferent = true;

                        // Only proceed with detailed comparison if both are ZodObject types
                        if (argsA instanceof z.ZodObject && argsB instanceof z.ZodObject) {
                            areArgsDifferent = this.areArgumentShapesDifferent(argsA.shape, argsB.shape);
                        }

                        if (areArgsDifferent) {
                            // If the argument structures are significantly different, use a union
                            mergedShape[key] = z.union([typeA, typeB]);
                        } else {
                            // If the argument structures are similar, merge them
                            const mergedArgs = this.mergeSchemas(
                                argsA as ZodObject<ZodRawShape>,
                                argsB as ZodObject<ZodRawShape>
                            );
                            mergedShape[key] = z.function().args(mergedArgs).returns(z.string());
                        }
                    } catch (error) {
                        // If there's any error in merging function args, fall back to using a union
                        console.log(`Error merging function arguments for key ${key}:`, error);
                        mergedShape[key] = z.union([typeA, typeB]);
                    }
                } else if (typeA._def.typeName === typeB._def.typeName) {
                    // If types match, use one of them
                    mergedShape[key] = typeA;
                } else {
                    // If types conflict, use a union
                    mergedShape[key] = z.union([typeA, typeB]);
                }
            } else {
                // If only one schema has the key, make it optional
                mergedShape[key] = z.optional(typeA || typeB);
            }
        }

        return z.object(mergedShape);
    };


    // return every template string. eg ["hello {{name}}", "goodbye {{person}}"]
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

    // For all values and recursively for all strings in json,
    infer(config: Config, _configFile: ConfigFile): z.ZodTypeAny {
        switch (config.valueType) {
            case 'STRING': {
                const templateStrings = this.getAllTemplateStrings(config);

                if (templateStrings.length === 0) {
                    return z.string();
                }

                // If multiple template strings, merge their schemas
                if (templateStrings.length > 1) {
                    const schemas = templateStrings.map(str => MustacheExtractor.extractSchema(str));

                    // Replace reduce with a loop
                    let mergedSchema: ZodObject<ZodRawShape> | null = null;
                    for (const schema of schemas) {
                        mergedSchema = mergedSchema === null ? schema as ZodObject<ZodRawShape> : this.mergeSchemas(
                            mergedSchema,
                            schema as ZodObject<ZodRawShape>
                        );
                    }

                    // If the schema is empty (no properties), just return basic string
                    if (mergedSchema && Object.keys(mergedSchema._def.shape()).length === 0) {
                        return z.string();
                    }

                    return mergedSchema ?
                        z.function().args(mergedSchema).returns(z.string()) :
                        z.function().args(schemas[0]).returns(z.string());
                }

                const schema = MustacheExtractor.extractSchema(templateStrings[0]);

                // If the schema is empty (no properties), just return basic string
                if (Object.keys(schema._def.shape()).length === 0) {
                    return z.string();
                }

                return z.function().args(schema).returns(z.string());
            }

            case 'BOOL': {
                return z.boolean();
            }

            case 'INT': {
                return z.number().int();
            }

            case 'DOUBLE': {
                return z.number();
            }

            case 'STRING_LIST': {
                return z.array(z.string());
            }

            case 'DURATION': {
                return z.string().duration();
            }

            case 'JSON': {
                // Get all JSON values
                const jsonValues = this.getAllJsonValues(config);
                console.log('JSON values:', JSON.stringify(jsonValues, null, 2));

                if (jsonValues.length > 0) {
                    try {
                        // Infer schemas for all JSON values
                        const schemas = jsonValues.map(json => {
                            const schema = this.jsonToInferredZod(json);
                            console.log('Inferred schema for:', JSON.stringify(json));
                            console.log('Schema:', ZodUtils.zodToString(schema));
                            return schema;
                        });

                        // Process each schema
                        let mergedSchema: ZodTypeAny | null = null;
                        for (const [i, schema] of schemas.entries()) {
                            console.log(`Processing schema ${i}:`, ZodUtils.zodToString(schema));

                            if (mergedSchema === null) {
                                mergedSchema = schema;
                            } else if (mergedSchema instanceof z.ZodObject && schema instanceof z.ZodObject) {
                                mergedSchema = this.mergeSchemas(mergedSchema, schema);
                                console.log('Merged result:', ZodUtils.zodToString(mergedSchema));
                            }
                        }

                        if (mergedSchema) {
                            console.log('Final merged schema:', ZodUtils.zodToString(mergedSchema));
                            return mergedSchema;
                        }
                    } catch (error) {
                        console.warn(`Error inferring JSON schema for ${config.key}:`, error);
                    }
                }

                return z.union([z.array(z.any()), z.record(z.any())]);
            }

            case 'LOG_LEVEL': {
                return z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]);
            }

            default: {
                return z.any();
            }
        }
    }

    private areArgumentShapesDifferent(argsA: Record<string, ZodTypeAny>, argsB: Record<string, ZodTypeAny>): boolean {
        // Check for structural differences that would make merging inappropriate
        const keysA = Object.keys(argsA);
        const keysB = Object.keys(argsB);

        // If one has section helpers and the other has simple placeholders, they're different
        const hasSectionA = keysA.some(key => argsA[key] && argsA[key]._def && argsA[key]._def.typeName === 'ZodArray');
        const hasSectionB = keysB.some(key => argsB[key] && argsB[key]._def && argsB[key]._def.typeName === 'ZodArray');

        if (hasSectionA !== hasSectionB) {
            return true;
        }

        // If they have no keys in common, they're different
        return !keysA.some(key => keysB.includes(key));
    }

    // Get all JSON values from the config
    private getAllJsonValues(config: Config): unknown[] {
        return config.rows.flatMap(row =>
            row.values.flatMap(valueObj => {
                if (config.valueType === 'JSON') {
                    // Try to parse JSON from json field
                    if (valueObj.value.json?.json) {
                        try {
                            return [JSON.parse(valueObj.value.json.json)];
                        } catch (error) {
                            console.warn(`Failed to parse JSON for ${config.key}:`, error);
                        }
                    }
                    // Try to parse JSON from string field
                    else if (valueObj.value.string) {
                        try {
                            return [JSON.parse(valueObj.value.string)];
                        } catch (error) {
                            console.warn(`Failed to parse JSON string for ${config.key}:`, error);
                        }
                    }
                }

                return [];
            })
        );
    }
}
