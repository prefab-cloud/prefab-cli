import {expect} from '@oclif/test'
import {z} from 'zod'

import {SupportedLanguage} from '../../src/codegen/zod-generator.js'
import {ZodUtils} from '../../src/codegen/zod-utils.js'

describe('ZodUtils', () => {
  describe('zodToString', () => {
    it('should convert a ZodString to string representation', () => {
      const schema = z.string()
      expect(ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal('z.string()')
    })

    it('should convert a ZodBoolean to string representation', () => {
      const schema = z.boolean()
      expect(ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal('z.boolean()')
    })

    it('should convert a Zod integer to string representation', () => {
      const schema = z.number().int()
      expect(ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'z.number().int()',
      )
    })

    it('should convert a regular Zod number to string representation', () => {
      const schema = z.number()
      const result = ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)
      expect(result).to.equal('z.number()')
    })

    it('should convert a ZodObject to string representation', () => {
      const schema = z.object({
        age: z.string(),
        name: z.string(),
      })
      const result = ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)
      expect(result).to.contain('optionalRequiredAccess({')
      expect(result).to.contain('name: z.string()')
      expect(result).to.contain('age: z.string()')

      const result2 = ZodUtils.zodToString(schema, 'test', 'user', SupportedLanguage.TypeScript)
      expect(result2).to.contain('z.object({')
      expect(result2).to.contain('name: z.string()')
      expect(result2).to.contain('age: z.string()')

      const resultPython = ZodUtils.zodToString(schema, 'test', 'user', SupportedLanguage.Python)
      expect(resultPython).to.contain('z.object({')
      expect(resultPython).to.contain('name: z.string()')
      expect(resultPython).to.contain('age: z.string()')

      const resultPython2 = ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.Python)
      expect(resultPython2).to.contain('z.object({')
      expect(resultPython2).to.contain('name: z.string()')
      expect(resultPython2).to.contain('age: z.string()')
    })

    it('should convert a ZodArray to string representation', () => {
      const schema = z.array(z.string())
      expect(ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'z.array(z.string())',
      )
    })

    it('should convert a ZodOptional to string representation', () => {
      const schema = z.string().optional()
      expect(ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'z.string().optional()',
      )
    })

    it('should convert a union to string representation', () => {
      const schema = z.union([z.string(), z.number()])
      expect(ZodUtils.zodToString(schema, 'test', 'inferred', SupportedLanguage.TypeScript)).to.equal(
        'z.union([z.string(), z.number()])',
      )
    })
  })

  describe('generateParamsType', () => {
    it('should generate TypeScript parameter type from schema shape', () => {
      const schemaShape = {
        age: z.number(),
        isActive: z.boolean(),
        name: z.string(),
      }
      const result = ZodUtils.generateParamsType(schemaShape)
      expect(result).to.equal('{ age: number; isActive: boolean; name: string }')
    })

    it('should handle optional properties in schema shape', () => {
      const schemaShape = {
        age: z.number().optional(),
        name: z.string(),
      }
      const result = ZodUtils.generateParamsType(schemaShape)
      expect(result).to.equal('{ age?: number; name: string }')
    })
  })

  describe('keyToMethodName', () => {
    it('should convert simple keys to camelCase method names', () => {
      expect(ZodUtils.keyToMethodName('test')).to.equal('test')
      expect(ZodUtils.keyToMethodName('test_key')).to.equal('testKey')
    })

    it('should convert dotted keys to method names', () => {
      expect(ZodUtils.keyToMethodName('user.profile')).to.equal('userProfile')
      expect(ZodUtils.keyToMethodName('app.settings.theme')).to.equal('appSettingsTheme')
    })

    it('should ensure method names are valid identifiers', () => {
      expect(ZodUtils.keyToMethodName('1test')).to.equal('_1test')
      expect(ZodUtils.keyToMethodName('test-key')).to.equal('testKey')
    })
    it('should convert simple keys', () => {
      expect(ZodUtils.keyToMethodName('flag.tidelift')).to.equal('flagTidelift')
      expect(ZodUtils.keyToMethodName('simple.config')).to.equal('simpleConfig')
    })

    it('should handle hyphens', () => {
      expect(ZodUtils.keyToMethodName('flag.tide-lift')).to.equal('flagTideLift')
      expect(ZodUtils.keyToMethodName('multi-word.key-name')).to.equal('multiWordKeyName')
    })

    it('should properly camelCase parts after the first one', () => {
      expect(ZodUtils.keyToMethodName('first.second')).to.equal('firstSecond')
      expect(ZodUtils.keyToMethodName('module.feature.enabled')).to.equal('moduleFeatureEnabled')
    })

    it('should deal with spaces', () => {
      expect(ZodUtils.keyToMethodName('first second')).to.equal('firstSecond')
      expect(ZodUtils.keyToMethodName('module feature.is-enabled')).to.equal('moduleFeatureIsEnabled')
    })

    it('should handle complex keys with special characters', () => {
      // The key '234nas6234^&#$__///WHY_OH_WHY' will be processed by:
      // 1. Adding an underscore for the numeric prefix: '_234nas6234'
      // 2. Converting special chars to dots: '_234nas6234...__...WHY_OH_WHY'
      // 3. Normalizing consecutive dots: '_234nas6234._.WHY_OH_WHY'
      // 4. Splitting by dots: ['_234nas6234', '_', 'WHY_OH_WHY']
      // 5. Camel-casing parts: ['_234nas6234', '_', 'whyOhWhy']
      // 6. Joining with camelCase: '_234nas6234WhyOhWhy'
      expect(ZodUtils.keyToMethodName('234nas6234^&#$__///WHY_OH_WHY')).to.equal('_234nas6234WhyOhWhy')
    })
  })

  describe('keyToSchemaName', () => {
    it('should convert keys to schema variable names', () => {
      expect(ZodUtils.keyToSchemaName('test')).to.equal('testSchema')
      expect(ZodUtils.keyToSchemaName('app.settings')).to.equal('appSettingsSchema')
    })
  })

  describe('makeSafeIdentifier', () => {
    it('should ensure identifiers start with a letter or underscore', () => {
      expect(ZodUtils.makeSafeIdentifier('123abc')).to.equal('_123abc')
      expect(ZodUtils.makeSafeIdentifier('_abc')).to.equal('_abc')
      expect(ZodUtils.makeSafeIdentifier('abc')).to.equal('abc')
    })

    it('should replace invalid characters with underscores', () => {
      expect(ZodUtils.makeSafeIdentifier('a-b-c')).to.equal('a_b_c')
      expect(ZodUtils.makeSafeIdentifier('a.b.c')).to.equal('a_b_c')
      expect(ZodUtils.makeSafeIdentifier('a@b#c')).to.equal('a_b_c')
    })
  })

  describe('zodTypeToTsType', () => {
    it('should convert primitive Zod types to TypeScript types', () => {
      expect(ZodUtils.zodTypeToTsType(z.string())).to.equal('string')
      expect(ZodUtils.zodTypeToTsType(z.number())).to.equal('number')
      expect(ZodUtils.zodTypeToTsType(z.boolean())).to.equal('boolean')
    })

    it('should convert ZodArray to TypeScript array type', () => {
      expect(ZodUtils.zodTypeToTsType(z.array(z.string()))).to.equal('Array<string>')
      expect(ZodUtils.zodTypeToTsType(z.array(z.number()))).to.equal('Array<number>')
    })

    it('should convert ZodObject to TypeScript object type', () => {
      const schema = z.object({
        age: z.number(),
        name: z.string(),
      })
      expect(ZodUtils.zodTypeToTsType(schema)).to.equal('{ age: number; name: string }')
    })

    it('should convert ZodEnum to TypeScript union type', () => {
      const schema = z.enum(['red', 'green', 'blue'])
      expect(ZodUtils.zodTypeToTsType(schema)).to.equal("'red' | 'green' | 'blue'")
    })

    it('should handle unknown Zod types', () => {
      const unknownType = {} as unknown as z.ZodTypeAny
      expect(ZodUtils.zodTypeToTsType(unknownType)).to.equal('any')
    })
  })

  describe('simplifyFunctions', () => {
    it('should keep primitive types unchanged', () => {
      const stringSchema = z.string()
      const numberSchema = z.number()
      const booleanSchema = z.boolean()

      expect(ZodUtils.simplifyFunctions(stringSchema)).to.equal(stringSchema)
      expect(ZodUtils.simplifyFunctions(numberSchema)).to.equal(numberSchema)
      expect(ZodUtils.simplifyFunctions(booleanSchema)).to.equal(booleanSchema)
    })

    it('should replace function with its return type', () => {
      const fnSchema = z.function().args(z.string()).returns(z.number())

      const result = ZodUtils.simplifyFunctions(fnSchema)
      expect(result._def.typeName).to.equal('ZodNumber')
    })

    it('should handle complex function schemas', () => {
      const complexFnSchema = z
        .function()
        .args(
          z.object({
            accent: z.string(),
            role: z.boolean().optional(),
            users: z.array(
              z.object({
                language: z.string(),
                name: z.string(),
              }),
            ),
          }),
        )
        .returns(z.string())

      const result = ZodUtils.simplifyFunctions(complexFnSchema)
      expect(result._def.typeName).to.equal('ZodString')
    })

    it('should handle objects with function properties', () => {
      const objWithFn = z.object({
        getAge: z.function().args(z.void()).returns(z.number()),
        name: z.string(),
      })

      const result = ZodUtils.simplifyFunctions(objWithFn)
      expect(result._def.typeName).to.equal('ZodObject')

      const shape = result._def.shape()
      expect(shape.name._def.typeName).to.equal('ZodString')
      expect(shape.getAge._def.typeName).to.equal('ZodNumber')
    })

    it('should handle arrays of functions', () => {
      const arrayOfFns = z.array(z.function().args(z.string()).returns(z.boolean()))

      const result = ZodUtils.simplifyFunctions(arrayOfFns)
      expect(result._def.typeName).to.equal('ZodArray')
      expect(result._def.type._def.typeName).to.equal('ZodBoolean')
    })

    it('should handle nested objects with functions', () => {
      const nestedObj = z.object({
        user: z.object({
          getDetails: z
            .function()
            .args(z.void())
            .returns(
              z.object({
                age: z.number(),
                email: z.string(),
              }),
            ),
          name: z.string(),
        }),
      })

      const result = ZodUtils.simplifyFunctions(nestedObj)
      expect(result._def.typeName).to.equal('ZodObject')

      const userShape = result._def.shape().user._def.shape()
      expect(userShape.name._def.typeName).to.equal('ZodString')
      expect(userShape.getDetails._def.typeName).to.equal('ZodObject')

      const detailsShape = userShape.getDetails._def.shape()
      expect(detailsShape.age._def.typeName).to.equal('ZodNumber')
      expect(detailsShape.email._def.typeName).to.equal('ZodString')
    })

    it('should handle optional functions', () => {
      const optionalFn = z.function().args(z.string()).returns(z.number()).optional()

      const result = ZodUtils.simplifyFunctions(optionalFn)
      expect(result._def.typeName).to.equal('ZodOptional')
      expect(result._def.innerType._def.typeName).to.equal('ZodNumber')
    })

    it('should handle union types containing functions', () => {
      const unionWithFn = z.union([z.string(), z.function().args(z.void()).returns(z.boolean())])

      const result = ZodUtils.simplifyFunctions(unionWithFn)
      expect(result._def.typeName).to.equal('ZodUnion')

      const {options} = result._def
      expect(options[0]._def.typeName).to.equal('ZodString')
      expect(options[1]._def.typeName).to.equal('ZodBoolean')
    })
  })

  describe('generateReturnValueCode', () => {
    it('should return "raw" for primitive types', () => {
      expect(ZodUtils.generateReturnValueCode(z.string(), '', SupportedLanguage.TypeScript)).to.equal('raw')
      expect(ZodUtils.generateReturnValueCode(z.number(), '', SupportedLanguage.TypeScript)).to.equal('raw')
      expect(ZodUtils.generateReturnValueCode(z.boolean(), '', SupportedLanguage.TypeScript)).to.equal('raw')
    })

    it('should handle arrays with primitive elements', () => {
      const arraySchema = z.array(z.string())
      expect(ZodUtils.generateReturnValueCode(arraySchema, '', SupportedLanguage.TypeScript)).to.equal('raw')
    })

    it('should handle simple objects', () => {
      const objSchema = z.object({
        age: z.number(),
        name: z.string(),
      })

      const result = ZodUtils.generateReturnValueCode(objSchema, '', SupportedLanguage.TypeScript)
      expect(result).to.equal('{ "age": raw["age"], "name": raw["name"] }')
    })

    it('should handle simple objects in python', () => {
      const objSchema = z.object({
        age: z.number(),
        name: z.string(),
      })

      const result = ZodUtils.generateReturnValueCode(objSchema, '', SupportedLanguage.Python)
      expect(result).to.equal('{ "age": raw["age"], "name": raw["name"] }')
    })

    it('should handle placeholder in object', () => {
      const nestedSchema = z.object({
        message: z
          .function()
          .args(z.object({name: z.string()}))
          .returns(z.number()),
      })
      const result = ZodUtils.generateReturnValueCode(nestedSchema, '', SupportedLanguage.TypeScript)
      expect(result).to.equal(
        '{ "message": (params: { name: string }) => Mustache.render(raw["message"] ?? "", params) }',
      )
    })

    it('should handle placeholder in typescript', () => {
      const placeholderSchema = z
        .function()
        .args(z.object({name: z.string()}))
        .returns(z.number())
      const result = ZodUtils.generateReturnValueCode(placeholderSchema, '', SupportedLanguage.TypeScript)
      expect(result).to.equal('(params: { name: string }) => Mustache.render(raw ?? "", params)')
    })

    it('should handle placeholder in Python', () => {
      const placeholderSchema = z
        .function()
        .args(z.object({name: z.string()}))
        .returns(z.number())
      const result = ZodUtils.generateReturnValueCode(placeholderSchema, '', SupportedLanguage.Python)
      expect(result).to.equal('lambda params: pystache.render(raw, params)')
    })

    it('should handle placeholder in object in python', () => {
      const nestedSchema = z.object({
        message: z
          .function()
          .args(z.object({name: z.string()}))
          .returns(z.number()),
      })
      const result = ZodUtils.generateReturnValueCode(nestedSchema, '', SupportedLanguage.Python)
      expect(result).to.equal('{ "message": lambda params: pystache.render(raw["message"], params) }')
    })

    it('should handle deep nested function placeholders', () => {
      const deepNestedSchema = z.object({
        data: z.object({
          greeting: z
            .function()
            .args(z.object({name: z.string(), title: z.string()}))
            .returns(z.string()),
        }),
      })

      const result = ZodUtils.generateReturnValueCode(deepNestedSchema, '', SupportedLanguage.TypeScript)
      expect(result).to.equal(
        '{ "data": { "greeting": (params: { name: string; title: string }) => Mustache.render(raw["data"]["greeting"] ?? "", params) } }',
      )
    })

    it('should handle multiple function placeholders in object', () => {
      const multiSchema = z.object({
        model: z.string(),
        systemMessage: z
          .function()
          .args(z.object({placeholders: z.string()}))
          .returns(z.string()),
        temperature: z.number(),
        userMessage: z
          .function()
          .args(
            z.object({
              extractedFiltersAsText: z.string(),
              userMessage: z.string(),
            }),
          )
          .returns(z.string()),
      })

      const result = ZodUtils.generateReturnValueCode(multiSchema, '', SupportedLanguage.TypeScript)
      expect(result).to.contain(
        '"systemMessage": (params: { placeholders: string }) => Mustache.render(raw["systemMessage"] ?? "", params)',
      )
      expect(result).to.contain(
        '"userMessage": (params: { extractedFiltersAsText: string; userMessage: string }) => Mustache.render(raw["userMessage"] ?? "", params)',
      )
      expect(result).to.contain('"model": raw["model"]')
      expect(result).to.contain('"temperature": raw["temperature"]')
    })
  })

  it('should handle nested objects', () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string(),
        profile: z.object({
          bio: z.string(),
        }),
      }),
    })

    const result = ZodUtils.generateReturnValueCode(nestedSchema, '', SupportedLanguage.TypeScript)
    expect(result).to.equal(
      '{ "user": { "name": raw["user"]["name"], "profile": { "bio": raw["user"]["profile"]["bio"] } } }',
    )
  })

  it('should handle arrays of objects', () => {
    const arrayOfObjSchema = z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )

    const result = ZodUtils.generateReturnValueCode(arrayOfObjSchema, '', SupportedLanguage.TypeScript)
    expect(result).to.equal('raw')
  })

  it('should handle arrays of strings', () => {
    const arrayOfStringSchema = z.array(z.string())

    let result = ZodUtils.generateReturnValueCode(arrayOfStringSchema, '', SupportedLanguage.TypeScript)
    expect(result).to.equal('raw')
    result = ZodUtils.generateReturnValueCode(arrayOfStringSchema, '', SupportedLanguage.Python)
    expect(result).to.equal('raw')
  })

  it('should handle optional fields', () => {
    const optionalSchema = z.object({
      age: z.number().optional(),
      name: z.string(),
    })

    const result = ZodUtils.generateReturnValueCode(optionalSchema, '', SupportedLanguage.TypeScript)
    expect(result).to.equal('{ "age": raw["age"], "name": raw["name"] }')
  })

  it('should handle functions by using their return type', () => {
    const fnSchema = z.function().args(z.string()).returns(z.number())

    expect(ZodUtils.generateReturnValueCode(fnSchema, '', SupportedLanguage.TypeScript)).to.equal(
      '(params: string) => Mustache.render(raw ?? "", params)',
    )
  })
})

describe('paramsOf', () => {
  it('should return undefined for non-function schemas', () => {
    const stringSchema = z.string()
    const result = ZodUtils.paramsOf(stringSchema)
    expect(result).to.be.undefined
  })

  it('should extract arguments schema from function schema', () => {
    const argsSchema = z.object({age: z.number(), name: z.string()})
    const fnSchema = z.function().args(argsSchema).returns(z.boolean())

    const result = ZodUtils.paramsOf(fnSchema)
    expect(result).to.equal(argsSchema)

    // We can also check that the structure is correct
    expect(result?._def.typeName).to.equal('ZodObject')
    const shape = result?._def.shape()
    expect(shape.name._def.typeName).to.equal('ZodString')
    expect(shape.age._def.typeName).to.equal('ZodNumber')
  })

  it('should extract optional arguments schema from function schema', () => {
    const argsSchema = z.object({name: z.string(), optional: z.string().optional()})
    const fnSchema = z.function().args(argsSchema).returns(z.string())

    const result = ZodUtils.paramsOf(fnSchema)
    expect(result).to.equal(argsSchema)
  })
})

describe('zodTypeToTypescript', () => {
  it('should return the correct typescript type for a zod type', () => {
    const result = ZodUtils.zodTypeToTypescript(z.string())
    expect(result).to.equal('string')
  })

  it('should return the correct typescript type for an optional zod type', () => {
    const result = ZodUtils.zodTypeToTypescript(z.string().optional())
    expect(result).to.equal('string?')
  })

  it('should return the correct typescript type for an array of zod types', () => {
    const result = ZodUtils.zodTypeToTypescript(z.object({age: z.number().optional(), name: z.string()}))
    expect(result).to.equal('{ age?: number; name: string }')
  })
})
