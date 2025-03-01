import Mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConfigFile } from './types.js';

import { SchemaInferrer } from './schema-inferrer.js';
import { ZodUtils } from './zod-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ZodGenerator {
    private configFile: ConfigFile;
    private schemaInferrer: SchemaInferrer;

    constructor(configFile: ConfigFile) {
        this.configFile = configFile;
        this.schemaInferrer = new SchemaInferrer();
    }

    generate(): string {
        console.log('Generating Zod schemas for configs...');
        const schemaLines = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => {
                const schemaObj = this.schemaInferrer.infer(config, this.configFile);
                const simplified = ZodUtils.simplifyFunctions(schemaObj);
                const zodType = ZodUtils.zodToString(simplified);

                return {
                    key: config.key,
                    schemaName: ZodUtils.keyToMethodName(config.key) + 'Schema',
                    zodType
                };
            });

        // Generate schema declarations for all configs
        const accessorMethods = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => {
                const schemaObj = this.schemaInferrer.infer(config, this.configFile);
                const returnValue = ZodUtils.generateReturnValueCode(schemaObj);

                const paramsSchema = ZodUtils.paramsOf(schemaObj);
                const params = paramsSchema ? ZodUtils.zodTypeToTypescript(paramsSchema) : '';
                // For function return types, they should return a function taking params
                const isFunction = schemaObj._def.typeName === 'ZodFunction';
                const returnType = isFunction
                    ? ZodUtils.zodTypeToTypescript(schemaObj._def.returns)
                    : ZodUtils.zodTypeToTypescript(schemaObj);

                return {
                    key: config.key,
                    methodName: ZodUtils.keyToMethodName(config.key),
                    params,
                    isFunctionReturn: isFunction,
                    returnType,
                    returnValue
                };
            });

        const templatePath = path.join(__dirname, 'templates', 'typescript.mustache');
        const template = fs.readFileSync(templatePath, 'utf8');
        const output = Mustache.render(template, {
            accessorMethods,
            schemaLines,
        });

        return output;
    }
}
