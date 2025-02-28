import { expect } from '@oclif/test'

import type { Config, ConfigFile } from '../../src/codegen/types.js';

import { SchemaInferrer } from '../../src/codegen/schema-inferrer.js';

describe('SchemaInferrer', () => {
    describe('infer', () => {

        it('should infer from a number', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { int: 1 } }] }],
                valueType: 'INT',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.number()');
        });

        it('should infer from a simple string', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "foo" } }] }],
                valueType: 'STRING',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.string()');
        });

        it('should infer from a template string', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "foo {{name}}" } }] }],
                valueType: 'STRING',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.function().args(z.object({name: z.string()})).returns(z.string())');
        });

        it('should infer from a json', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "{\"name\": \"foo\", \"age\": 10}" } }] }],
                valueType: 'JSON',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.object({name: z.string(), age: z.number()})');
        });

        it('should infer from a json with placeholders', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "{\"name\": \"foo {{name}}\", \"age\": 10}" } }] }],
                valueType: 'JSON',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.object({name: z.function().args(z.object({name: z.string()})).returns(z.string()), age: z.number()})');
        });

        it('torture test', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "{\"systemMessage\": \"you {{#user}} {{name}} {{/user}} {{#admin}} {{name}} {{/admin}}\", \"nested\": { \"stuff\": [{ \"name\": \"foo\" }, { \"name\": \"bar\" }] }}" } }] }],
                valueType: 'JSON',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.object({systemMessage: z.function().args(z.object({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), nested: z.object({stuff: z.array(z.object({name: z.string()}))})})');
        });

        it('should merge from a multiple string', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "foo {{name}}" } }] },
                { values: [{ value: { string: "bar {{baz}}" } }] }],
                valueType: 'STRING',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.function().args(z.object({name: z.string().optional(), baz: z.string().optional()})).returns(z.string())');
        });

        it('should merge from a multiple JSON', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [{ values: [{ value: { string: "{\"name\": \"foo\", \"age\": 10, \"conflict\": \"string\"}" } }] },
                { values: [{ value: { string: "{\"name\": \"foo2\", \"otherNum\": 10, \"conflict\": 42}" } }] }],
                valueType: 'JSON',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.object({name: z.string(), age: z.number().optional(), conflict: z.union([z.string(), z.number()]), otherNum: z.number().optional()})');
        });

        it('multi-row merge with placeholder test', () => {
            const config: Config = {
                configType: 'CONFIG',
                key: 'test',
                rows: [
                    { values: [{ value: { string: "{\"systemMessage\": \"you {{#user}} {{name}} {{/user}} {{#admin}} {{name}} {{/admin}}\", \"nested\": { \"stuff\": [{ \"name\": \"foo\" }, { \"name\": \"bar\" }] }}" } }] },
                    { values: [{ value: { string: "{\"systemMessage\": \"message with {{placeholder}}\", \"nested\": { \"otherStuff\": \"string {{placeholder2}}\" }}" } }] }
                ],
                valueType: 'JSON',
            };
            const schemaInferrer = new SchemaInferrer();
            const configFile: ConfigFile = {
                configs: [config],
            };

            const result = schemaInferrer.infer(config, configFile);
            expect(result).to.equal('z.object({systemMessage: z.union([z.function().args(z.object({user: z.array(z.object({name: z.string()})), admin: z.array(z.object({name: z.string()}))})).returns(z.string()), z.function().args(z.object({placeholder: z.string()})).returns(z.string())]), nested: z.object({stuff: z.array(z.object({name: z.string()})).optional(), otherStuff: z.function().args(z.object({placeholder2: z.string()})).returns(z.string()).optional()})})');
        });
    });
});
