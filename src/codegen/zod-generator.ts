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



        // Load and render template
        const templatePath = path.join(__dirname, 'templates', 'typescript.mustache');
        const template = fs.readFileSync(templatePath, 'utf8');
        const output = Mustache.render(template, { schemaLines });

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
