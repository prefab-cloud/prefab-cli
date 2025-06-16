import {expect} from 'chai'

import {JsonToZodMapper} from '../../../src/codegen/language-mappers/json-to-zod-mapper.js'

describe('JsonToZodMapper', () => {
  const mapper = new JsonToZodMapper()

  describe('resolve', () => {
    it('should resolve homogeneous array of numbers', () => {
      const input = [1, 2, 3]

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodArray')
      expect(result._def.type._def.typeName).equal('ZodNumber')
    })

    it('should resolve homogeneous array of strings', () => {
      const input = ['a', 'b', 'c']

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodArray')
      expect(result._def.type._def.typeName).equal('ZodString')
    })

    it('should resolve homogeneous array of booleans', () => {
      const input = [true, false, true]

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodArray')
      expect(result._def.type._def.typeName).equal('ZodBoolean')
    })

    it('should resolve heterogeneous array to unknown', () => {
      const input = [1, 'a', true]

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodArray')
      expect(result._def.type._def.typeName).equal('ZodUnknown')
    })

    it('should resolve object with primitive types', () => {
      const input = {age: 30, isActive: true, name: 'Alice'}

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodObject')
      expect(Object.keys(result._def.shape()).sort()).to.deep.equal(['age', 'isActive', 'name'])
      expect(result._def.shape().age._def.typeName).equal('ZodNumber')
      expect(result._def.shape().isActive._def.typeName).equal('ZodBoolean')
      expect(result._def.shape().name._def.typeName).equal('ZodString')
    })

    it('should resolve deeply nested objects', () => {
      const input = {isActive: true, user: {age: 30, name: 'Alice'}}

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodObject')
      expect(Object.keys(result._def.shape()).sort()).to.deep.equal(['isActive', 'user'])
      expect(result._def.shape().isActive._def.typeName).equal('ZodBoolean')
      expect(result._def.shape().user._def.typeName).equal('ZodObject')
      expect(Object.keys(result._def.shape().user._def.shape()).sort()).to.deep.equal(['age', 'name'])
      expect(result._def.shape().user._def.shape().age._def.typeName).equal('ZodNumber')
      expect(result._def.shape().user._def.shape().name._def.typeName).equal('ZodString')
    })

    it('should resolve array of objects', () => {
      const input = [{name: 'Alice'}, {name: 'Bob'}]

      const result = mapper.resolve(input)

      expect(result._def.typeName).equal('ZodArray')
      expect(result._def.type._def.typeName).equal('ZodObject')
      expect(Object.keys(result._def.type._def.shape())).to.deep.equal(['name'])
      expect(result._def.type._def.shape().name._def.typeName).equal('ZodString')
    })

    it('should resolve null values', () => {
      const input = null

      const result = mapper.resolve(input)

      expect(result._def.typeName).to.deep.equal('ZodNull')
    })
  })
})
