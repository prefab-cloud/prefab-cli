import Mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConfigFile } from './types.js';

import { SchemaInferrer } from './schema-inferrer.js';
import { ZodUtils } from './zod-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ZodGenerator {
    private schemaInferrer: SchemaInferrer;

    constructor(private configFile: ConfigFile) {
        // Initialize SchemaInferrer
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
                const returnValue = ZodUtils.generateReturnValueCode(schemaObj)

                const paramsSchema = ZodUtils.paramsOf(schemaObj);
                const params = paramsSchema ? ZodUtils.zodTypeToTypescript(paramsSchema) : '';

                return {
                    key: config.key,
                    methodName: ZodUtils.keyToMethodName(config.key),
                    params,
                    returnType: ZodUtils.zodTypeToTypescript(ZodUtils.simplifyFunctions(schemaObj)),
                    returnValue
                };
            });
        console.log(accessorMethods)
        const templatePath = path.join(__dirname, 'templates', 'typescript.mustache');
        const template = fs.readFileSync(templatePath, 'utf8');
        const output = Mustache.render(template, {
            accessorMethods,
            schemaLines,
        });

        return output;
    }

    // generate2(): string {
    //     console.log('Generating Zod schemas for configs...');

    //     // Generate schema declarations for all configs
    //     const schemaLines = this.configFile.configs
    //         .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
    //         .map(config => {
    //             const schemaObj = this.schemaInferrer.infer(config, this.configFile);
    //             let zodType = ZodUtils.zodToString(schemaObj);
    //             zodType = this.escapeMustacheTags(zodType);

    //             return {
    //                 key: config.key,
    //                 schemaName: ZodUtils.keyToMethodName(config.key) + 'Schema',
    //                 zodType
    //             };
    //         });

    //     // Generate accessor methods
    //     const accessorMethods = this.configFile.configs
    //         .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
    //         .map(config => {
    //             console.log('Processing config:', config.key);
    //             const methodName = ZodUtils.keyToMethodName(config.key);

    //             // Get the schema for this config
    //             const schemaObj = this.schemaInferrer.infer(config, this.configFile);

    //             // Check if this is a JSON object with template strings
    //             if (config.valueType === 'JSON' && this.hasTemplateStrings(schemaObj)) {
    //                 // Generate method for JSON with template strings
    //                 return this.generateJsonTemplateMethod(config.key, methodName, schemaObj);
    //             }

    //             // Check if this is a string with template
    //             if (config.valueType === 'STRING' && this.isTemplateString(schemaObj)) {
    //                 // Generate method for string template
    //                 return this.generateStringTemplateMethod(config.key, methodName, schemaObj);
    //             }
    //             // Regular value (no templates)

    //             const returnType = ZodUtils.prefabValueTypeToTypescriptReturnType(config);
    //             return {
    //                 key: config.key,
    //                 methodName,
    //                 returnType,
    //                 simpleValue: true
    //             };

    //         });

    //     // Load and render template
    //     const templatePath = path.join(__dirname, 'templates', 'typescript_old.mustache');
    //     const template = fs.readFileSync(templatePath, 'utf8');
    //     const output = Mustache.render(template, {
    //         accessorMethods,
    //         schemaLines,
    //     });

    //     return output;
    // }

    // // Helper method to escape Mustache tags in schema strings
    // private escapeMustacheTags(input: string): string {
    //     return input.replaceAll('{{', '{{ "{" }}{{ "{" }}')
    //         .replaceAll('}}', '{{ "}" }}{{ "}" }}');
    // }

    // // Generate the implementation code for a JSON object with template strings
    // private generateJsonImplementation(schema: z.ZodObject<any>): string {
    //     const { shape } = schema;
    //     const implParts = [];

    //     for (const key in shape) {
    //         if (Object.hasOwn(shape, key)) {
    //             const propType = shape[key];

    //             // Check if this property is a function (template string)
    //             if (propType._def?.typeName === 'ZodFunction') {
    //                 // Extract parameter type from the function args
    //                 const argsShape = propType._def.args.shape || {};
    //                 const paramProps = [];

    //                 for (const paramKey in argsShape) {
    //                     if (Object.hasOwn(argsShape, paramKey)) {
    //                         const paramType = ZodUtils.zodTypeToTypescript(argsShape[paramKey]);
    //                         paramProps.push(`${paramKey}: ${paramType}`);
    //                     }
    //                 }

    //                 // Create function implementation for this template string property
    //                 implParts.push(`    ${key}: (params: { ${paramProps.join('; ')} }) => 
    //   Mustache.render(json.${key}, params)`);
    //             } else {
    //                 // Regular property, just use the value directly
    //                 implParts.push(`    ${key}: json.${key}`);
    //             }
    //         }
    //     }

    //     return `{\n${implParts.join(',\n')}\n  }`;
    // }

    // // Generate a TypeScript return type for a JSON object with template strings
    // private generateJsonReturnType(schema: z.ZodObject<any>): string {
    //     const { shape } = schema;
    //     const returnTypeParts = [];

    //     for (const key in shape) {
    //         if (Object.hasOwn(shape, key)) {
    //             const propType = shape[key];

    //             // Check if this property is a function (template string)
    //             if (propType._def?.typeName === 'ZodFunction') {
    //                 // Extract parameter type from the function args
    //                 const argsShape = propType._def.args.shape || {};
    //                 const paramProps = [];

    //                 for (const paramKey in argsShape) {
    //                     if (Object.hasOwn(argsShape, paramKey)) {
    //                         const paramType = ZodUtils.zodTypeToTypescript(argsShape[paramKey]);
    //                         paramProps.push(`${paramKey}: ${paramType}`);
    //                     }
    //                 }

    //                 // Create function type for this template string property
    //                 returnTypeParts.push(`${key}: (params: { ${paramProps.join('; ')} }) => string`);
    //             } else {
    //                 // Regular property, use its TypeScript type
    //                 const propTypeStr = ZodUtils.zodTypeToTypescript(propType);
    //                 returnTypeParts.push(`${key}: ${propTypeStr}`);
    //             }
    //         }
    //     }

    //     return `{\n    ${returnTypeParts.join(';\n    ')};\n  }`;
    // }

    // // Generate method for a JSON object with template strings
    // private generateJsonTemplateMethod(key: string, methodName: string, schema: z.ZodObject<any>): any {
    //     // Generate the return type
    //     const returnType = this.generateJsonReturnType(schema);

    //     // Generate the implementation
    //     const implementation = this.generateJsonImplementation(schema);

    //     return {
    //         implementation,
    //         jsonTemplate: true,
    //         key,
    //         methodName,
    //         returnType
    //     };
    // }

    // // Generate method for a string template
    // private generateStringTemplateMethod(key: string, methodName: string, schema: z.ZodTypeAny): any {
    //     // Get the parameters from function args
    //     const argsShape = schema._def.args.shape || {};
    //     const paramsType = ZodUtils.generateParamsType(argsShape);

    //     return {
    //         key,
    //         methodName,
    //         params: `params: ${paramsType}`,
    //         returnType: 'string',
    //         stringTemplate: true
    //     };
    // }

    // // Check if a schema has any template strings
    // private hasTemplateStrings(schema: z.ZodTypeAny): boolean {
    //     if (schema._def?.typeName !== 'ZodObject') return false;

    //     // Check each property of the object
    //     const { shape } = (schema as z.ZodObject<any>);
    //     return Object.values(shape).some(propType =>
    //         propType._def?.typeName === 'ZodFunction'
    //     );
    // }

    // // Check if a schema is a template string
    // private isTemplateString(schema: z.ZodTypeAny): boolean {
    //     return schema._def?.typeName === 'ZodFunction';
    // }
}
