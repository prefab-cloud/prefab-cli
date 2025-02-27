import { expect } from '@oclif/test'

import { ZodGenerator } from '../../src/codegen/zod-generator.js';

describe('ZodGenerator', () => {
    describe('keyToMethodName', () => {
        const generator = new ZodGenerator({ configs: [] });

        // Access the private method for testing
        const keyToMethodName = (key: string) => (generator as any).keyToMethodName(key);

        it('should convert simple keys', () => {
            expect(keyToMethodName('flag.tidelift')).to.equal('flag_tidelift');
            expect(keyToMethodName('simple.config')).to.equal('simple_config');
        });

        it('should handle hyphens', () => {
            expect(keyToMethodName('flag.tide-lift')).to.equal('flag_tideLift');
            expect(keyToMethodName('multi-word.key-name')).to.equal('multiWord_keyName');
        });

        it('should properly camelCase parts after the first one', () => {
            expect(keyToMethodName('first.second')).to.equal('first_second');
            expect(keyToMethodName('module.feature.enabled')).to.equal('module_feature_enabled');
        });

        it('should deal with spaces', () => {
            expect(keyToMethodName('first second')).to.equal('first_second');
            expect(keyToMethodName('module feature.is-enabled')).to.equal('module_feature_isEnabled');
        });


        it('should handle complex keys with special characters', () => {
            expect(keyToMethodName('234nas6234^&#$__///WHY_OH_WHY')).to.equal('_34nas6234_______WHY_OH_WHY');
        });
    });
}); 