import {expect} from 'chai'
import {z} from 'zod'

import {secureEvaluateSchema} from '../../src/codegen/schema-evaluator.js'

describe('SchemaEvaluator', () => {
  describe('secureEvaluateSchema', () => {
    it('should properly evaluate valid schema strings', () => {
      const result = secureEvaluateSchema('z.object({ name: z.string(), age: z.number() })')

      expect(result.success).to.be.true
      expect(result.schema).to.exist

      if (result.schema) {
        const def = (result.schema as any)._def
        expect(def.typeName).to.equal('ZodObject')
        const shape = (result.schema as z.ZodObject<any>).shape
        expect((shape.name as any)._def.typeName).to.equal('ZodString')
        expect((shape.age as any)._def.typeName).to.equal('ZodNumber')
      }
    })

    it('should handle complex schema strings', () => {
      const schemaStr = `
        z.object({
          id: z.string().uuid(),
          name: z.string().min(3).max(50),
          email: z.string().email(),
          age: z.number().int().positive().optional(),
          tags: z.array(z.string()),
          metadata: z.record(z.string(), z.any())
        })
      `

      const result = secureEvaluateSchema(schemaStr)

      expect(result.success).to.be.true
      expect(result.schema).to.exist

      if (result.schema) {
        const def = (result.schema as any)._def
        expect(def.typeName).to.equal('ZodObject')
        const shape = (result.schema as z.ZodObject<any>).shape

        expect((shape.id as any)._def.typeName).to.equal('ZodString')
        expect((shape.name as any)._def.typeName).to.equal('ZodString')
        expect((shape.email as any)._def.typeName).to.equal('ZodString')
        expect((shape.age as any)._def.typeName).to.equal('ZodOptional')
        expect((shape.tags as any)._def.typeName).to.equal('ZodArray')
        expect((shape.metadata as any)._def.typeName).to.equal('ZodRecord')
      }
    })

    it('should reject schema strings with syntax errors', () => {
      const result = secureEvaluateSchema('z.object({ name: z.string(, })')

      expect(result.success).to.be.false
      expect(result.error).to.include('Evaluation error')
    })

    it('should reject schema strings with unsupported operations', () => {
      // Trying to use a forbidden global object
      const result = secureEvaluateSchema('z.object({ test: z.string() }).refine(() => console.log("hello"))')

      expect(result.success).to.be.false
      expect(result.error).to.include('potentially unsafe operations')
      expect(result.error).to.include('console')
    })

    it('should reject schema strings attempting to use unsupported properties', () => {
      // Trying to access constructor
      const result = secureEvaluateSchema('z.object({ test: z.string() }).constructor')

      expect(result.success).to.be.false
      expect(result.error).to.include('potentially unsafe operations')
      expect(result.error).to.include('constructor')
    })

    it('should allow valid refinements with arrow functions', () => {
      // Valid refinement
      const result = secureEvaluateSchema(
        'z.string().refine((val) => val.length > 5, { message: "Must be more than 5 characters" })',
      )

      expect(result.success).to.be.true
      expect(result.schema).to.exist

      if (result.schema) {
        // Use type assertion for accessing internal _def properties
        const def = (result.schema as any)._def
        expect(def.typeName).to.equal('ZodEffects')
        expect(def.effect.refinement).to.be.a('function')
      }
    })

    it('should reject schema strings exceeding maximum complexity', () => {
      // Generate a very complex schema by creating a deep nesting
      let complexSchema = 'z.object({'
      for (let i = 0; i < 100; i++) {
        complexSchema += `prop${i}: z.object({nested: z.string()}),`
      }
      complexSchema += '})'

      const result = secureEvaluateSchema(complexSchema, {maxAstNodes: 200})

      expect(result.success).to.be.false
      expect(result.error).to.include('exceeds maximum allowed complexity')
    })

    it('should handle enum types properly', () => {
      const result = secureEvaluateSchema('z.enum(["pending", "active", "completed"])')

      expect(result.success).to.be.true
      expect(result.schema).to.exist

      if (result.schema) {
        const def = (result.schema as any)._def
        expect(def.typeName).to.equal('ZodEnum')
        expect(def.values).to.deep.equal(['pending', 'active', 'completed'])
      }
    })

    it('should handle union types', () => {
      const result = secureEvaluateSchema('z.union([z.string(), z.number(), z.boolean()])')

      expect(result.success).to.be.true
      expect(result.schema).to.exist

      if (result.schema) {
        const def = (result.schema as any)._def
        expect(def.typeName).to.equal('ZodUnion')
        expect(def.options).to.have.length(3)
        expect((def.options[0] as any)._def.typeName).to.equal('ZodString')
        expect((def.options[1] as any)._def.typeName).to.equal('ZodNumber')
        expect((def.options[2] as any)._def.typeName).to.equal('ZodBoolean')
      }
    })
  })
})
