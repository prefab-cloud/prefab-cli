import Mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Config, ConfigFile } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ZodGenerator {
    constructor(private configFile: ConfigFile) { }

    generate(): string {
        console.log('Generating Zod schemas for configs...');

        // Collect configs into schema lines
        const schemaLines = this.configFile.configs.map(config => ({
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

    private getZodTypeForValueType(config: Config): string {
        switch (config.valueType) {
            case 'STRING': {
                return 'z.string()';
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
