import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MustacheString } from "./prefab-shared.js";
import { MustacheExtractor } from './mustache-extractor.js';
import { z } from "zod";

const execAsync = promisify(exec);

interface ConfigValue {
    value: {
        string?: string;
        bool?: boolean;
        int?: string;
        json?: {
            json: string;
        };
        logLevel?: string;
    };
}

interface ConfigRow {
    values: ConfigValue[];
}

interface Config {
    key: string;
    configType: string;
    valueType: string;
    rows: ConfigRow[];
}

interface ConfigFile {
    configs: Config[];
}

function getAllTemplateStrings(config: Config): string[] {
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
                } catch (e) {
                    console.warn(`Failed to parse JSON for ${config.key}:`, e);
                    return [];
                }
            }
            return [];
        })
    );
}

function generateMustacheSchema(config: Config): string {
    const templateStrings = getAllTemplateStrings(config);
    const allPlaceholders = new Set<string>();

    templateStrings.forEach(template => {
        // Convert ZodObject to array of property names
        const placeholders = Object.keys(MustacheExtractor.extractSchema(template)._def.shape());
        placeholders.forEach((p: string) => allPlaceholders.add(p));
    });

    // Generate the schema object with all found placeholders
    const schemaProperties = Array.from(allPlaceholders)
        .map(placeholder => `        ${placeholder}: z.string()`)
        .join(',\n');

    return `MustacheString(z.object({\n${schemaProperties}\n    }))`;
}

function zodToString(schema: z.ZodType): string {
    if (schema instanceof z.ZodObject) {
        const shape = schema._def.shape();
        const props = Object.entries(shape)
            .map(([key, value]) => `        ${key}: ${zodToString(value as z.ZodType)}`)
            .join(',\n');
        return `z.object({\n${props}\n    })`;
    }
    if (schema instanceof z.ZodArray) {
        return `z.array(${zodToString(schema._def.type)})`;
    }
    if (schema instanceof z.ZodString) {
        return 'z.string()';
    }
    if (schema instanceof z.ZodOptional) {
        const innerType = schema._def.innerType;
        return `${zodToString(innerType)}.optional()`;
    }
    if (schema instanceof z.ZodBoolean) {
        return 'z.boolean()';
    }
    console.warn('Unknown zod type:', schema);
    return 'z.any()';
}

async function getZodTypeForValueType(config: Config): Promise<string> {
    // Check if it's an LLM config
    // TODO remove this
    if (config.key.startsWith('llm')) {
        return `z.object({
        model: z.enum(["gpt-3.5-turbo", "gpt-4o", "gpt-4o-mini"]),
        temperature: z.number().optional(),
        max_tokens: z.number().optional(),
        top_p: z.number().optional(),
        messages: z.array(z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: MustacheString(z.object({
                city: z.string()
            }))
        }))
    })`;
    }

    if (config.key.includes(':schema:')) {
        const match = config.key.match(/:(schema:.*)/);
        if (match) {
            console.log('Found schema reference:', match[1], 'for key:', config.key);
            try {
                const { stdout } = await execAsync(`prefab get "${match[1]}"`);
                // Use the Zod schema string directly
                console.log("basic schema " + stdout);

                console.log("\n...looking for strings")
                console.log(getAllTemplateStrings(config));

                return stdout.trim();
            } catch (error) {
                console.error('Error getting schema from prefab:', error);
                return 'z.any()';
            }
        }
    }

    switch (config.valueType) {
        case 'STRING':
            const templateStrings = getAllTemplateStrings(config);
            const schema = MustacheExtractor.extractSchema(templateStrings[0]);

            // If the schema is empty (no properties), just return basic MustacheString
            if (Object.keys(schema._def.shape()).length === 0) {
                return 'MustacheString()';
            }

            return `MustacheString(${zodToString(schema)})`;
        case 'BOOL':
            return 'z.boolean()';
        case 'INT':
            return 'z.number()';
        case 'DURATION':
            return 'z.string().duration()';
        case 'JSON':
            return 'z.string()'; // JSON configs are stored as strings
        case 'LOG_LEVEL':
            return 'z.enum(["TRACE", "DEBUG", "INFO", "WARN", "ERROR"])';
        default:
            return 'z.any()';
    }
}

async function main() {
    try {
        // First run the prefab download command
        console.log('Downloading latest config...');
        const { stdout, stderr } = await execAsync('prefab download --environment=Development');
        if (stderr) {
            console.error('Warning during download:', stderr);
        }
        console.log('Download complete:', stdout);

        // Read the config file
        const configPath = path.join(process.cwd(), 'prefab.Development.596.config.json');
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const configData: ConfigFile = JSON.parse(configContent);

        // Generate the schema content
        const schemaLines = await Promise.all(configData.configs.map(async config => {
            const zodType = await getZodTypeForValueType(config);
            return `    "${config.key}": ${zodType},`;
        }));

        const output = `import { z } from "zod";
import { MustacheString } from "./src/prefab-shared.js";

export const prefabSchema = z.object({
${schemaLines.join('\n')}
});

export type PrefabConfig = z.infer<typeof prefabSchema>;
`;

        // Write to prefab-zod.ts
        fs.writeFileSync('prefab-zod-generated.ts', output);
        console.log('Generated prefab-zod-generated.ts successfully!');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 