import { expect } from '@oclif/test'
import { z } from 'zod';

import type { Config } from '../../src/codegen/types.js';

import { ZodUtils } from '../../src/codegen/zod-utils.js';

describe('ZodUtils', () => {
    describe('zodToString', () => {
        it('should convert a ZodString to string representation', () => {
            const schema = z.string();
            expect(ZodUtils.zodToString(schema)).to.equal('z.string()');
        });

        it('should convert a ZodBoolean to string representation', () => {
            const schema = z.boolean();
            expect(ZodUtils.zodToString(schema)).to.equal('z.boolean()');
        });

        it('should convert a ZodObject to string representation', () => {
            const schema = z.object({
                age: z.string(),
                name: z.string()
            });
            const result = ZodUtils.zodToString(schema);
            expect(result).to.contain('z.object({');
            expect(result).to.contain('name: z.string()');
            expect(result).to.contain('age: z.string()');
        });

        it('should convert a ZodArray to string representation', () => {
            const schema = z.array(z.string());
            expect(ZodUtils.zodToString(schema)).to.equal('z.array(z.string())');
        });

        it('should convert a ZodOptional to string representation', () => {
            const schema = z.string().optional();
            expect(ZodUtils.zodToString(schema)).to.equal('z.string().optional()');
        });
    });

    describe('generateParamsType', () => {
        it('should generate TypeScript parameter type from schema shape', () => {
            const schemaShape = {
                age: z.number(),
                isActive: z.boolean(),
                name: z.string()
            };
            const result = ZodUtils.generateParamsType(schemaShape);
            expect(result).to.equal('{ age: number; isActive: boolean; name: string }');
        });

        it('should handle optional properties in schema shape', () => {
            const schemaShape = {
                age: z.number().optional(),
                name: z.string()
            };
            const result = ZodUtils.generateParamsType(schemaShape);
            expect(result).to.equal('{ age: number; name: string }');
        });
    });

    describe('keyToMethodName', () => {
        it('should convert simple keys to camelCase method names', () => {
            expect(ZodUtils.keyToMethodName('test')).to.equal('test');
            expect(ZodUtils.keyToMethodName('test_key')).to.equal('testKey');
        });

        it('should convert dotted keys to method names', () => {
            expect(ZodUtils.keyToMethodName('user.profile')).to.equal('user_Profile');
            expect(ZodUtils.keyToMethodName('app.settings.theme')).to.equal('app_Settings_Theme');
        });

        it('should ensure method names are valid identifiers', () => {
            expect(ZodUtils.keyToMethodName('1test')).to.equal('_1test');
            expect(ZodUtils.keyToMethodName('test-key')).to.equal('testKey');
        });
        it('should convert simple keys', () => {
            expect(ZodUtils.keyToMethodName('flag.tidelift')).to.equal('flag_Tidelift');
            expect(ZodUtils.keyToMethodName('simple.config')).to.equal('simple_Config');
        });

        it('should handle hyphens', () => {
            expect(ZodUtils.keyToMethodName('flag.tide-lift')).to.equal('flag_TideLift');
            expect(ZodUtils.keyToMethodName('multi-word.key-name')).to.equal('multiWord_KeyName');
        });

        it('should properly camelCase parts after the first one', () => {
            expect(ZodUtils.keyToMethodName('first.second')).to.equal('first_Second');
            expect(ZodUtils.keyToMethodName('module.feature.enabled')).to.equal('module_Feature_Enabled');
        });

        it('should deal with spaces', () => {
            expect(ZodUtils.keyToMethodName('first second')).to.equal('firstSecond');
            expect(ZodUtils.keyToMethodName('module feature.is-enabled')).to.equal('moduleFeature_IsEnabled');
        });

        it('should handle complex keys with special characters', () => {
            expect(ZodUtils.keyToMethodName('234nas6234^&#$__///WHY_OH_WHY')).to.equal('_234nas6234WhyOhWhy');
        });
    });

    describe('keyToSchemaName', () => {
        it('should convert keys to schema variable names', () => {
            expect(ZodUtils.keyToSchemaName('test')).to.equal('testSchema');
            expect(ZodUtils.keyToSchemaName('app.settings')).to.equal('app_SettingsSchema');
        });
    });

    describe('makeSafeIdentifier', () => {
        it('should ensure identifiers start with a letter or underscore', () => {
            expect(ZodUtils.makeSafeIdentifier('123abc')).to.equal('_123abc');
            expect(ZodUtils.makeSafeIdentifier('_abc')).to.equal('_abc');
            expect(ZodUtils.makeSafeIdentifier('abc')).to.equal('abc');
        });

        it('should replace invalid characters with underscores', () => {
            expect(ZodUtils.makeSafeIdentifier('a-b-c')).to.equal('a_b_c');
            expect(ZodUtils.makeSafeIdentifier('a.b.c')).to.equal('a_b_c');
            expect(ZodUtils.makeSafeIdentifier('a@b#c')).to.equal('a_b_c');
        });
    });

    describe('zodTypeToTsType', () => {
        it('should convert primitive Zod types to TypeScript types', () => {
            expect(ZodUtils.zodTypeToTsType(z.string())).to.equal('string');
            expect(ZodUtils.zodTypeToTsType(z.number())).to.equal('number');
            expect(ZodUtils.zodTypeToTsType(z.boolean())).to.equal('boolean');
        });

        it('should convert ZodArray to TypeScript array type', () => {
            expect(ZodUtils.zodTypeToTsType(z.array(z.string()))).to.equal('Array<string>');
            expect(ZodUtils.zodTypeToTsType(z.array(z.number()))).to.equal('Array<number>');
        });

        it('should convert ZodObject to TypeScript object type', () => {
            const schema = z.object({
                age: z.number(),
                name: z.string()
            });
            expect(ZodUtils.zodTypeToTsType(schema)).to.equal('{ age: number; name: string }');
        });

        it('should handle optional properties in objects', () => {
            const schema = z.object({
                age: z.number().optional(),
                name: z.string()
            });
            expect(ZodUtils.zodTypeToTsType(schema)).to.equal('{ age?: number; name: string }');
        });

        it('should convert ZodEnum to TypeScript union type', () => {
            const schema = z.enum(['red', 'green', 'blue']);
            expect(ZodUtils.zodTypeToTsType(schema)).to.equal('"red" | "green" | "blue"');
        });

        it('should handle unknown Zod types', () => {
            const unknownType = {} as unknown as z.ZodTypeAny;
            expect(ZodUtils.zodTypeToTsType(unknownType)).to.equal('any');
        });
    });

    describe('valueTypeToReturnType', () => {
        it('should map primitive config value types to TypeScript types', () => {
            const boolConfig: Pick<Config, 'valueType'> = { valueType: 'BOOL' };
            const stringConfig: Pick<Config, 'valueType'> = { valueType: 'STRING' };
            const intConfig: Pick<Config, 'valueType'> = { valueType: 'INT' };

            expect(ZodUtils.valueTypeToReturnType(boolConfig as Config)).to.equal('boolean');
            expect(ZodUtils.valueTypeToReturnType(stringConfig as Config)).to.equal('string');
            expect(ZodUtils.valueTypeToReturnType(intConfig as Config)).to.equal('number');
        });

        it('should map complex config value types to TypeScript types', () => {
            const durationConfig: Pick<Config, 'valueType'> = { valueType: 'DURATION' };
            const stringListConfig: Pick<Config, 'valueType'> = { valueType: 'STRING_LIST' };
            const logLevelConfig: Pick<Config, 'valueType'> = { valueType: 'LOG_LEVEL' };

            expect(ZodUtils.valueTypeToReturnType(durationConfig as Config)).to.equal('string');
            expect(ZodUtils.valueTypeToReturnType(stringListConfig as Config)).to.equal('string[]');
            expect(ZodUtils.valueTypeToReturnType(logLevelConfig as Config)).to.equal('"TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR"');
        });

        it('should handle JSON config with schema reference', () => {
            const jsonConfig: Pick<Config, 'schemaKey' | 'valueType'> = {
                schemaKey: 'user.schema',
                valueType: 'JSON'
            };

            expect(ZodUtils.valueTypeToReturnType(jsonConfig as Config)).to.equal('z.infer<typeof user_SchemaSchema>');
        });

        it('should handle JSON config without schema reference', () => {
            const jsonConfig: Pick<Config, 'valueType'> = { valueType: 'JSON' };
            expect(ZodUtils.valueTypeToReturnType(jsonConfig as Config)).to.equal('any[] | Record<string, any>');
        });

        it('should handle unknown config value types', () => {
            // Define a union type including the custom valueType
            type TestValueType = 'UNKNOWN' | Config['valueType'];
            const unknownConfig = { valueType: 'UNKNOWN' as TestValueType };
            expect(ZodUtils.valueTypeToReturnType(unknownConfig as Config)).to.equal('any');
        });
    });
}); 