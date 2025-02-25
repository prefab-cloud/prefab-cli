import { expect } from '@oclif/test'
import { z } from 'zod';

import { MustacheExtractor } from '../../src/codegen/mustache-extractor.js';

describe('MustacheExtractor', () => {

    it('extracts simple placeholders', () => {
        const template = "Hello {{name}}!";
        const schema = MustacheExtractor.extractSchema(template);
        const shape = schema._def.shape();

        // Instead of deep equality, check that we have the expected property
        expect(Object.keys(shape)).to.deep.equal(['name']);

        // Check that the value is an instance of ZodString
        expect(shape.name instanceof z.ZodString).to.be.true;
    });

    it('handles section with variables', () => {
        const template = "{{#user}}Name: {{name}}{{/user}}";
        const schema = MustacheExtractor.extractSchema(template);
        const shape = schema._def.shape();

        // Check structure and type of user property
        expect(Object.keys(shape)).to.deep.equal(['user']);
        expect(shape.user instanceof z.ZodArray).to.be.true;

        // Check the array element type
        const userShape = shape.user._def.type._def.shape();
        expect(Object.keys(userShape)).to.deep.equal(['name']);
        expect(userShape.name instanceof z.ZodString).to.be.true;
    });

    it('handles inverted sections', () => {
        const template = "{{^logged_in}}Please log in{{/logged_in}}";
        const schema = MustacheExtractor.extractSchema(template);
        const shape = schema._def.shape();

        expect(Object.keys(shape)).to.deep.equal(['logged_in']);
        expect(shape.logged_in instanceof z.ZodOptional).to.be.true;
    });

    it('handles complex nested template', () => {
        const template = `
            {{#role}}
            You are a helpful AI with role: "{{role}}".
            {{/role}}
            {{^role}}
            You are a helpful AI with an unknown role.
            {{/role}}

            You need to greet the following users:
            {{#users}}
            - Name: {{name}}, Language: {{language}}
            {{/users}}

            Finally, you must speak with a {{accent}} accent.
        `;

        const schema = MustacheExtractor.extractSchema(template);
        const shape = schema._def.shape();

        // Validate the schema structure and types
        expect(Object.keys(shape).sort()).to.deep.equal(['accent', 'role', 'users'].sort());
        expect(shape.accent instanceof z.ZodString).to.be.true;
        expect(shape.role instanceof z.ZodOptional).to.be.true;
        expect(shape.users instanceof z.ZodArray).to.be.true;

        // Check the users array element type
        const usersShape = shape.users._def.type._def.shape();
        expect(Object.keys(usersShape).sort()).to.deep.equal(['language', 'name'].sort());
        expect(usersShape.language instanceof z.ZodString).to.be.true;
        expect(usersShape.name instanceof z.ZodString).to.be.true;
    });

    it('validates data against generated schema', () => {
        const template = `
            {{#users}}
            - Name: {{name}}, Language: {{language}}
            {{/users}}
            {{accent}}
        `;

        const schema = MustacheExtractor.extractSchema(template);

        // Valid data should parse successfully
        const validData = {
            accent: 'British',
            users: [
                { language: 'English', name: 'Alice' },
                { language: 'French', name: 'Bob' }
            ]
        };
        expect(() => schema.parse(validData)).not.throw();

        // Invalid data should fail
        const invalidData = {
            accent: 'British',
            users: [{ name: 'Alice' }] // missing language
        };
        expect(() => schema.parse(invalidData)).throw();
    });
}); 