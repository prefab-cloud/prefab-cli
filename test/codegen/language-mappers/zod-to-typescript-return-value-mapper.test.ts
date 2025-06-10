import {expect} from 'chai'

import {ZodToTypescriptReturnValueMapper} from '../../../src/codegen/language-mappers/zod-to-typescript-return-value-mapper.js'
import {secureEvaluateSchema} from '../../../src/codegen/schema-evaluator.js'

describe('ZodToTypescriptReturnValueMapper', () => {
  describe('renderField', () => {
    const returnTypePropertyPath = ['first', 'second', 'third']

    it('Can successfully parse strings', () => {
      const zodAst = secureEvaluateSchema(`z.string()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse strings with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.string()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse numbers', () => {
      const zodAst = secureEvaluateSchema(`z.number()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse numbers with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.number()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse integer numbers', () => {
      const zodAst = secureEvaluateSchema(`z.number().int()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse integer numbers with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.number().int()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse booleans', () => {
      const zodAst = secureEvaluateSchema(`z.boolean()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse booleans with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.boolean()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse any', () => {
      const zodAst = secureEvaluateSchema(`z.any()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse any with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.any()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse an array wrapped type', () => {
      const zodAst = secureEvaluateSchema(`z.array(z.string())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse an array wrapped type with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.array(z.string())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse an array chained type', () => {
      const zodAst = secureEvaluateSchema(`z.string().array()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse an array chained type with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.string().array()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse an enum', () => {
      const zodAst = secureEvaluateSchema(`z.enum(["first", "second"])`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse an enum with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.enum(["first", "second"])`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse null', () => {
      const zodAst = secureEvaluateSchema(`z.null()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse null with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.null()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse undefined', () => {
      const zodAst = secureEvaluateSchema(`z.undefined()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse undefined with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.undefined()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse unknown', () => {
      const zodAst = secureEvaluateSchema(`z.unknown()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse unknown with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.unknown()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse unions', () => {
      const zodAst = secureEvaluateSchema(`z.union([z.string(), z.number()])`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse unions defined with or chaining with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.string().or(z.number())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse unions defined with or chaining', () => {
      const zodAst = secureEvaluateSchema(`z.string().or(z.number())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse unions defined with or chaining with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.string().or(z.number())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse tuples', () => {
      const zodAst = secureEvaluateSchema(`z.tuple([z.string(), z.number()])`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": [raw?.[0]!, raw?.[1]!]')
    })

    it('Can successfully parse tuples with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.tuple([z.string(), z.number()])`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal(
        "\"someKey\": [raw?.['first']?.['second']?.['third']?.[0]!, raw?.['first']?.['second']?.['third']?.[1]!]",
      )
    })

    it('Can successfully parse objects', () => {
      const zodAst = secureEvaluateSchema(`z.object({ name: z.string(), age: z.number() })`)
      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})
      const rendered = mapper.renderField(zodAst.schema!)
      expect(rendered).to.equal('"someKey": { "name": raw?.[\'name\']!, "age": raw?.[\'age\']! }')
    })

    it('Can successfully parse objects with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.object({ name: z.string(), age: z.number() })`)
      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})
      const rendered = mapper.renderField(zodAst.schema!)
      expect(rendered).to.equal(
        "\"someKey\": { \"name\": raw?.['first']?.['second']?.['third']?.['name']!, \"age\": raw?.['first']?.['second']?.['third']?.['age']! }",
      )
    })

    it('Can successfully parse an optional wrapped type', () => {
      const zodAst = secureEvaluateSchema(`z.optional(z.string())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse an optional wrapped type with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.optional(z.string())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse an optional chained type', () => {
      const zodAst = secureEvaluateSchema(`z.string().optional()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": raw')
    })

    it('Can successfully parse an optional chained type with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.string().optional()`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal("\"someKey\": raw?.['first']?.['second']?.['third']!")
    })

    it('Can successfully parse functions', () => {
      const zodAst = secureEvaluateSchema(`z.function().args(z.string(), z.number()).returns(z.boolean())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal('"someKey": (params) => Mustache.render(raw ?? "", params)')
    })

    it('Can successfully parse functions with property paths', () => {
      const zodAst = secureEvaluateSchema(`z.function().args(z.string(), z.number()).returns(z.boolean())`)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey', returnTypePropertyPath})

      const rendered = mapper.renderField(zodAst.schema!)

      expect(rendered).to.equal(
        "\"someKey\": (params) => Mustache.render(raw?.['first']?.['second']?.['third']! ?? \"\", params)",
      )
    })

    it('Can successfully complex combinations of types', () => {
      const zodString = `
          z.object({
            name: z.string(),
            age: z.number().int(),
            topLevel: z.function().args(z.boolean().optional(), z.any()).returns(z.string()),
            more: z.object({
              details: z.string(),
              count: z.number().int(),
              exec: z.function().args(z.string()).returns(z.boolean().optional()),
            }),
            tags: z.array(z.string()).optional(),
            isActive: z.boolean().default(true),
          })
        `

      const zodAst = secureEvaluateSchema(zodString)

      const mapper = new ZodToTypescriptReturnValueMapper({fieldName: 'someKey'})

      const rendered = mapper.renderField(zodAst.schema!)

      // NOTE: isActive is set to `any` because of the default value, which is not currently supported in the mapper.
      expect(rendered).to.equal(
        '"someKey": { "name": raw?.[\'name\']!, "age": raw?.[\'age\']!, "topLevel": (params) => Mustache.render(raw?.[\'topLevel\']! ?? "", params), "more": { "details": raw?.[\'more\']?.[\'details\']!, "count": raw?.[\'more\']?.[\'count\']!, "exec": (params) => Mustache.render(raw?.[\'more\']?.[\'exec\']! ?? "", params) }, "tags": raw?.[\'tags\']!, "isActive": raw?.[\'isActive\']! }',
      )
    })
  })
})
