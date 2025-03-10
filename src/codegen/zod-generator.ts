import Mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Config, ConfigFile } from './types.js';

import { SchemaInferrer } from './schema-inferrer.js';
import { ZodUtils } from './zod-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export enum SupportedLanguage {
    Python = 'python',
    TypeScript = 'typescript',
}

export interface AccessorMethod {
    isFunctionReturn: boolean;
    key: string;
    methodName: string;
    params: string;
    returnType: string;
    returnValue: string;
}

export interface SchemaLine {
    key: string;
    schemaName: string;
    zodType: string;
}

export interface TemplateData {
    accessorMethods: AccessorMethod[];
    schemaLines: SchemaLine[];
}

/**
 * Generates typed code for configs using Zod for validation
 */
export class ZodGenerator {
    private configFile: ConfigFile;
    private schemaInferrer: SchemaInferrer;

    constructor(configFile: ConfigFile) {
        this.configFile = configFile;
        this.schemaInferrer = new SchemaInferrer();
    }

    /**
     * Generate code for the specified language
     */
    generate(language: SupportedLanguage = SupportedLanguage.TypeScript): string {
        console.log(`Generating ${language} code for configs...`);

        // Get base template for the framework
        const templateName = this.getTemplateNameForLanguage(language);
        const templatePath = path.join(__dirname, 'templates', `${templateName}.mustache`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template for language '${language}' not found at ${templatePath}`);
        }

        const baseTemplate = fs.readFileSync(templatePath, 'utf8');

        // Generate individual accessor methods
        const accessorMethods = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => this.renderAccessorMethod(config, language))
            .join('\n\n  ');

        // Generate individual schema lines
        const schemaLines = this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => this.renderSchemaLine(config, language))
            .join(',\n  ');

        // Render the base template with the generated content
        const result = Mustache.render(baseTemplate, {
            accessorMethods,
            schemaLines,
        });

        return result;
    }

    /**
     * Generate an accessor method for a single config
     */
    generateAccessorMethod(config: Config): AccessorMethod {
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
            isFunctionReturn: isFunction,
            key: config.key,
            methodName: ZodUtils.keyToMethodName(config.key),
            params,
            returnType,
            returnValue,
        };
    }

    /**
     * Generate accessor methods for all configs
     */
    generateAccessorMethods(): AccessorMethod[] {
        return this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => this.generateAccessorMethod(config));
    }

    /**
     * Generate a schema line for a single config
     */
    generateSchemaLine(config: Config): SchemaLine {
        const schemaObj = this.schemaInferrer.infer(config, this.configFile);
        const simplified = ZodUtils.simplifyFunctions(schemaObj);
        const zodType = ZodUtils.zodToString(simplified);

        return {
            key: config.key,
            schemaName: ZodUtils.keyToMethodName(config.key) + 'Schema',
            zodType,
        };
    }

    /**
     * Generate schema lines for all configs
     */
    generateSchemaLines(): SchemaLine[] {
        return this.configFile.configs
            .filter(config => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
            .map(config => this.generateSchemaLine(config));
    }

    /**
     * Prepare all data needed for templates
     */
    prepareTemplateData(): TemplateData {
        const accessorMethods = this.generateAccessorMethods();
        const schemaLines = this.generateSchemaLines();

        return {
            accessorMethods,
            schemaLines,
        };
    }

    /**
     * Render a single accessor method for the given language
     */
    renderAccessorMethod(config: Config, language: SupportedLanguage = SupportedLanguage.TypeScript): string {
        const templateName = this.getTemplateNameForLanguage(language);
        const templatePath = path.join(__dirname, 'templates', `${templateName}-accessor.mustache`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Accessor template for language '${language}' not found at ${templatePath}`);
        }

        const template = fs.readFileSync(templatePath, 'utf8');
        const accessorMethod = this.generateAccessorMethod(config);

        return Mustache.render(template, accessorMethod);
    }

    /**
     * Render a single schema line for the given language
     */
    renderSchemaLine(config: Config, language: SupportedLanguage = SupportedLanguage.TypeScript): string {
        const templateName = this.getTemplateNameForLanguage(language);
        const templatePath = path.join(__dirname, 'templates', `${templateName}-schema.mustache`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Schema template for language '${language}' not found at ${templatePath}`);
        }

        const template = fs.readFileSync(templatePath, 'utf8');
        const schemaLine = this.generateSchemaLine(config);

        return Mustache.render(template, schemaLine);
    }

    /**
     * Get the template file name for the given language
     */
    private getTemplateNameForLanguage(language: SupportedLanguage): string {
        if (language === SupportedLanguage.TypeScript) {
            return 'typescript';
        }

        if (language === SupportedLanguage.Python) {
            return 'python';
        }

        return 'typescript';
    }
}
