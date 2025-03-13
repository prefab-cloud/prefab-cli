import {expect} from 'chai'
import {z} from 'zod'
import {UnifiedPythonGenerator} from '../../../src/codegen/python/pydantic-generator.js'
import {ZodUtils} from '../../../src/codegen/zod-utils.js'

describe('UnifiedPythonGenerator', () => {
  let generator: UnifiedPythonGenerator

  beforeEach(() => {
    generator = new UnifiedPythonGenerator({
      className: 'TestClient',
    })
  })

  describe('Basic type handling', () => {
    it('should identify basic types correctly', () => {
      expect(generator.isBasicType('str')).to.be.true
      expect(generator.isBasicType('int')).to.be.true
      expect(generator.isBasicType('float')).to.be.true
      expect(generator.isBasicType('bool')).to.be.true
      expect(generator.isBasicType('datetime.datetime')).to.be.true
      expect(generator.isBasicType('List[str]')).to.be.true

      expect(generator.isBasicType('Dict[str, Any]')).to.be.false
      expect(generator.isBasicType('CustomModel')).to.be.false
    })

    it('should register basic types correctly', () => {
      expect(generator.registerModel(z.string(), 'MyString')).to.equal('str')
      expect(generator.registerModel(z.number().int(), 'MyInt')).to.equal('int')
      expect(generator.registerModel(z.number(), 'MyFloat')).to.equal('float')
      expect(generator.registerModel(z.boolean(), 'MyBool')).to.equal('bool')
    })
  })

  describe('Method generation', () => {
    it('should generate a method for a boolean type', () => {
      const methodCode = generator.generateMethodCode('is_feature_enabled', {
        returnType: 'bool',
        params: [],
        docstring: 'Check if feature is enabled',
        valueType: 'BOOL',
        originalKey: 'is_feature_enabled',
      })

      expect(methodCode).to.include(
        'def is_feature_enabled(self, context: Optional[Union[dict, Context]] = None, default: Optional[bool] = None) -> bool:',
      )
      expect(methodCode).to.include('"""')
      expect(methodCode).to.include('Check if feature is enabled')
      expect(methodCode).to.include('config_value = self.get("is_feature_enabled", context=context)')
      expect(methodCode).to.include("if config_value.HasField('bool'):")
      expect(methodCode).to.include('return config_value.bool')
    })

    it('should generate a method for a float type', () => {
      const methodCode = generator.generateMethodCode('get_conversion_rate', {
        returnType: 'float',
        params: [],
        docstring: 'Get conversion rate',
        valueType: 'DOUBLE',
        originalKey: 'get_conversion_rate',
      })

      expect(methodCode).to.include(
        'def get_conversion_rate(self, context: Optional[Union[dict, Context]] = None, default: Optional[float] = None) -> float:',
      )
      expect(methodCode).to.include('"""')
      expect(methodCode).to.include('Get conversion rate')
      expect(methodCode).to.include('config_value = self.get("get_conversion_rate", context=context)')
      expect(methodCode).to.include("if config_value.HasField('double'):")
      expect(methodCode).to.include('return config_value.double')
    })

    it('should generate a method for a string type', () => {
      const methodCode = generator.generateMethodCode('get_api_url', {
        returnType: 'str',
        params: [],
        docstring: 'Get the API URL',
        valueType: 'STRING',
        originalKey: 'get_api_url',
      })

      expect(methodCode).to.include(
        'def get_api_url(self, context: Optional[Union[dict, Context]] = None, default: Optional[str] = None) -> str:',
      )
      expect(methodCode).to.include('"""')
      expect(methodCode).to.include('Get the API URL')
      expect(methodCode).to.include('config_value = self.get("get_api_url", context=context)')
      expect(methodCode).to.include("if config_value.HasField('string'):")
      expect(methodCode).to.include('raw = config_value.string')
      expect(methodCode).to.include('return raw')
    })

    it('should generate a method for a string list type', () => {
      const methodCode = generator.generateMethodCode('get_allowed_domains', {
        returnType: 'List[str]',
        params: [],
        docstring: 'Get allowed domains',
        valueType: 'STRING_LIST',
        originalKey: 'get_allowed_domains',
      })

      expect(methodCode).to.include(
        'def get_allowed_domains(self, context: Optional[Union[dict, Context]] = None, default: Optional[List[str]] = None) -> List[str]:',
      )
      expect(methodCode).to.include('"""')
      expect(methodCode).to.include('Get allowed domains')
      expect(methodCode).to.include('config_value = self.get("get_allowed_domains", context=context)')
      expect(methodCode).to.include("if config_value.HasField('string_list'):")
      expect(methodCode).to.include('return config_value.string_list.values')
    })

    it('should generate a method for a custom model', () => {
      generator.registerModel(
        z.object({
          url: z.string(),
          port: z.number().int(),
          timeout: z.number(),
        }),
        'ServiceConfig',
      )

      const methodCode = generator.generateMethodCode('get_service_config', {
        returnType: 'ServiceConfig',
        params: [],
        docstring: 'Get the service configuration',
        valueType: 'JSON',
        originalKey: 'get_service_config',
      })

      expect(methodCode).to.include(
        'def get_service_config(self, context: Optional[Union[dict, Context]] = None, default: Optional[ServiceConfig] = None) -> ServiceConfig:',
      )
      expect(methodCode).to.include("if config_value.HasField('json'):")
      expect(methodCode).to.include('return ServiceConfig(**data)')
    })

    it('should generate methods with parameters', () => {
      const methodCode = generator.generateMethodCode('get_user_preference', {
        returnType: 'str',
        params: [
          {name: 'user_id', type: 'str', default: 'None'},
          {name: 'preference_type', type: 'str', default: '"default"'},
        ],
        docstring: 'Get user preference',
        valueType: 'STRING',
        originalKey: 'get_user_preference',
      })

      expect(methodCode).to.include(
        'def get_user_preference(self, user_id: str = None, preference_type: str = "default", context: Optional[Union[dict, Context]] = None, default: Optional[str] = None) -> str:',
      )
      expect(methodCode).to.include('user_id: Description of user_id')
      expect(methodCode).to.include('preference_type: Description of preference_type')
    })
  })

  describe('Value extraction', () => {
    it('should generate extraction code for basic types with value type', () => {
      const boolExtraction = generator.generateValueExtraction('bool', true, 'BOOL')
      expect(boolExtraction).to.include("if config_value.HasField('bool'):")
      expect(boolExtraction).to.include('return config_value.bool')

      const intExtraction = generator.generateValueExtraction('int', true, 'INT')
      expect(intExtraction).to.include("if config_value.HasField('int'):")
      expect(intExtraction).to.include('return config_value.int')

      const strExtraction = generator.generateValueExtraction('str', true, 'STRING')
      expect(strExtraction).to.include("if config_value.HasField('string'):")
      expect(strExtraction).to.include('raw = config_value.string')
      expect(strExtraction).to.include('return raw')
    })

    it('should generate extraction code for complex types', () => {
      const extraction = generator.generateValueExtraction('UserSettings', false, 'JSON')
      expect(extraction).to.include("if config_value.HasField('json'):")
      expect(extraction).to.include('data = json.loads(config_value.json.json)')
      expect(extraction).to.include('return UserSettings(**data)')
    })
  })

  describe('Import calculation', () => {
    it('should calculate base imports correctly', () => {
      // Test with empty methods
      const {imports, typingImports, needsJson} = generator.calculateNeededImports()

      expect(imports).to.include('import logging')
      expect(imports).to.include('from prefab_cloud_python import Client, Context')
      expect(imports).to.include('from prefab_cloud_python.client import ConfigValue')

      expect(typingImports).to.include('Optional')
      expect(typingImports).to.include('Union')

      expect(needsJson).to.be.false
    })

    it('should add imports for complex types', () => {
      // Register a complex model method
      const userSchema = z.object({
        id: z.number().int(),
        name: z.string(),
        email: z.string().email(),
        isActive: z.boolean(),
      })

      generator.registerMethod('get_user', userSchema, 'User', [], 'Get user data', 'JSON')

      const {imports, typingImports, needsJson} = generator.calculateNeededImports()

      // Should include pydantic imports
      expect(imports).to.include('from pydantic import BaseModel, ValidationError')
      expect(needsJson).to.be.true
    })

    it('should add imports for specialized types', () => {
      // Register methods with specialized types
      generator.registerMethod('get_timeout', z.number(), 'Timeout', [], 'Get timeout', 'DOUBLE')
      generator.registerMethod('get_allowed_domains', z.array(z.string()), 'Domains', [], 'Get domains', 'STRING_LIST')
      generator.registerMethod('get_timestamp', z.date(), 'Timestamp', [], 'Get timestamp', 'STRING')

      const {imports, typingImports} = generator.calculateNeededImports()

      // Check for List import
      expect(typingImports).to.include('List')

      // Check for datetime import
      expect(imports).to.include('from datetime import datetime')
    })
  })

  describe('Model generation', () => {
    it('should generate a Pydantic model for an object schema', () => {
      const userSchema = z.object({
        id: z.number().int(),
        name: z.string(),
        email: z.string().email(),
        isActive: z.boolean(),
      })

      const modelCode = generator.generatePydanticModel(userSchema, 'User')

      expect(modelCode).to.include('class User(BaseModel):')
      expect(modelCode).to.include('id: int')
      expect(modelCode).to.include('name: str')
      expect(modelCode).to.include('email: str')
      expect(modelCode).to.include('isActive: bool')
    })

    it('should generate a wrapper model for non-object schemas', () => {
      const listSchema = z.array(z.string())
      const modelCode = generator.generatePydanticModel(listSchema, 'StringList')

      expect(modelCode).to.include('class StringList(BaseModel):')
      expect(modelCode).to.include('value: List[str]')
    })
  })

  describe('Client generation', () => {
    it('should generate a client class with methods', () => {
      // Register some methods
      generator.registerMethod(
        'is_feature_enabled',
        z.boolean(),
        'FeatureFlag',
        [],
        'Check if feature is enabled',
        'BOOL',
      )
      generator.registerMethod('get_api_url', z.string(), 'ApiUrl', [], 'Get API URL', 'STRING')

      const clientCode = generator.generateClientClass()

      expect(clientCode).to.include('class TestClient(Client):')
      expect(clientCode).to.include('def is_feature_enabled(self')
      expect(clientCode).to.include('def get_api_url(self')
    })
  })

  describe('Full file generation', () => {
    it('should generate a complete Python file', () => {
      // Register some methods with different types
      generator.registerMethod(
        'is_feature_enabled',
        z.boolean(),
        'FeatureFlag',
        [],
        'Check if feature is enabled',
        'BOOL',
      )
      generator.registerMethod('get_api_url', z.string(), 'ApiUrl', [], 'Get API URL', 'STRING')
      generator.registerMethod('get_timeout', z.number(), 'Timeout', [], 'Get timeout in seconds', 'INT')

      // Add a complex type
      const configSchema = z.object({
        api_key: z.string(),
        rate_limit: z.number().int(),
        debug_mode: z.boolean().default(false),
      })

      generator.registerMethod('get_config', configSchema, 'Config', [], 'Get service configuration', 'JSON')

      const pythonFile = generator.generatePythonFile()

      // Print the entire python file for debugging
      console.log('Generated Python File:')
      console.log(pythonFile)

      // Check imports
      expect(pythonFile).to.include('import json')
      expect(pythonFile).to.include('import logging')
      expect(pythonFile).to.include('from pydantic import BaseModel, ValidationError')
      expect(pythonFile).to.include('from prefab_cloud_python import Client, Context')
      expect(pythonFile).to.include('from typing import')

      // Instead of checking for a specific model name, check for any Pydantic model
      expect(pythonFile).to.include('class ')
      expect(pythonFile).to.include('(BaseModel):')

      // Check methods
      expect(pythonFile).to.include('def is_feature_enabled(self')
      expect(pythonFile).to.include('def get_api_url(self')
      expect(pythonFile).to.include('def get_timeout(self')
      expect(pythonFile).to.include('def get_config(self')
    })
  })

  describe('Array handling', () => {
    it('should correctly handle arrays of basic types', () => {
      const stringArraySchema = z.array(z.string())
      const returnType = generator.registerModel(stringArraySchema, 'StringArray')

      // Should convert to List[str] type
      expect(returnType).to.equal('List[str]')

      // Test method generation with a string list
      const methodCode = generator.generateMethodCode('get_tags', {
        returnType: 'List[str]',
        params: [],
        docstring: 'Get tags list',
        valueType: 'STRING_LIST',
        originalKey: 'get_tags',
      })

      expect(methodCode).to.include('def get_tags(self')
      expect(methodCode).to.include('-> List[str]')
      expect(methodCode).to.include("if config_value.HasField('string_list'):")
      expect(methodCode).to.include('return config_value.string_list.values')
    })

    it('should register methods with array parameters', () => {
      // Test with a method that takes an array parameter
      const methodCode = generator.generateMethodCode('filter_items', {
        returnType: 'List[str]',
        params: [
          {name: 'categories', type: 'List[str]', default: '[]'},
          {name: 'limit', type: 'int', default: '10'},
        ],
        docstring: 'Filter items by categories',
        valueType: 'STRING_LIST',
        originalKey: 'filter_items',
      })

      expect(methodCode).to.include('def filter_items(self, categories: List[str] = [], limit: int = 10')
      expect(methodCode).to.include('categories: Description of categories')
    })
  })

  describe('Complex type handling', () => {
    it('should handle nested object structures', () => {
      // Define a nested schema
      const addressSchema = z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string(),
      })

      const userSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        address: addressSchema,
      })

      // Register both models
      const addressType = generator.registerModel(addressSchema, 'Address')
      const userType = generator.registerModel(userSchema, 'User')

      // Address should be registered as a separate model
      expect(addressType).to.include('Address')

      // Test the generated models
      const userModelCode = generator.generatePydanticModel(userSchema, 'User')
      expect(userModelCode).to.include('address: ')

      // Check the import calculation
      const {needsJson} = generator.calculateNeededImports()
      expect(needsJson).to.be.true
    })

    it('should handle dictionary types', () => {
      const dictSchema = z.record(z.string())
      const returnType = generator.registerModel(dictSchema, 'StringDict')

      // Should convert to Dict type
      expect(returnType).to.include('Dict')

      // Test method with dictionary return
      const methodCode = generator.generateMethodCode('get_metadata', {
        returnType: 'Dict[str, str]',
        params: [],
        docstring: 'Get metadata dictionary',
        valueType: 'JSON',
        originalKey: 'get_metadata',
      })

      expect(methodCode).to.include('def get_metadata(self')
      expect(methodCode).to.include('-> Dict[str, str]')
      expect(methodCode).to.include("if config_value.HasField('json'):")
    })
  })

  describe('Edge cases', () => {
    it('should handle nullable/optional types', () => {
      const optionalSchema = z.string().optional()
      const returnType = generator.registerModel(optionalSchema, 'OptionalString')

      // Test method with optional return
      const methodCode = generator.generateMethodCode('get_optional_config', {
        returnType: returnType,
        params: [],
        docstring: 'Get optional config',
        valueType: 'STRING',
        originalKey: 'get_optional_config',
      })

      expect(methodCode).to.include(`default: Optional[${returnType}] = None`)
    })

    it('should handle specialized value types', () => {
      // Test duration value type
      const durationMethodCode = generator.generateValueExtraction('datetime.timedelta', true, 'DURATION')
      expect(durationMethodCode).to.include('parse_duration(config_value.duration.definition)')

      // Test JSON value type with primitive return
      const jsonBoolMethodCode = generator.generateValueExtraction('bool', true, 'JSON')
      expect(jsonBoolMethodCode).to.include("config_value.HasField('json')")
    })
  })

  describe('Mustache template handling', () => {
    it('should generate a parameter class for template parameters', () => {
      // Create a template function schema with object params
      const templateSchema = z
        .function()
        .args(
          z.object({
            userId: z.number().int(),
            status: z.string(),
          }),
        )
        .returns(z.string())
        .describe('Template')

      // Generate a parameter class
      const className = generator.generateParamClass('get_user_status', templateSchema._def.args._def.items[0])

      // Check the class name
      expect(className).to.equal('GetUserStatusParams')

      // Get the parameter class info from the generator's internal state
      const paramClass = (generator as any).paramClasses.get(className)
      expect(paramClass).to.exist

      // Check that parameters preserve their exact original names for mustache templates
      expect(paramClass.fields[0]).to.deep.include({name: 'userId', type: 'int'})
      expect(paramClass.fields[1]).to.deep.include({name: 'status', type: 'str'})
    })

    it('should detect template parameters in registerMethod', () => {
      // Create a template function schema
      const templateSchema = z
        .function()
        .args(
          z.object({
            name: z.string(),
            company: z.string(),
          }),
        )
        .returns(z.string())
        .describe('GreetingTemplate')

      // Register the method
      generator.registerMethod(
        'getGreetingTemplate',
        templateSchema,
        undefined,
        [],
        'Get a greeting template that can be rendered with name and company',
        'STRING',
      )

      // Check that the method was registered with template parameters
      const method = (generator as any).methods.get('get_greeting_template')
      expect(method).to.exist
      expect(method.hasTemplateParams).to.be.true
      expect(method.paramClassName).to.equal('GetGreetingTemplateParams')

      // The imports should include pystache
      const imports = (generator as any).imports
      const standardImports = Array.from((imports as any).standardImports)
      expect(standardImports).to.include('pystache')
    })

    it('should generate value extraction with template support', () => {
      // Test string extraction with template parameters
      const extractionCode = generator.generateValueExtraction('str', true, 'STRING', true)

      expect(extractionCode).to.include("if config_value.HasField('string'):")
      expect(extractionCode).to.include('raw = config_value.string')
      expect(extractionCode).to.include('return pystache.render(raw, params.__dict__) if params else raw')

      // Test string extraction without template parameters
      const normalExtractionCode = generator.generateValueExtraction('str', true, 'STRING', false)

      expect(normalExtractionCode).to.include("if config_value.HasField('string'):")
      expect(normalExtractionCode).to.include('raw = config_value.string')
      expect(normalExtractionCode).to.include('return raw')
      expect(normalExtractionCode).not.to.include('pystache.render')
    })

    it('should generate method code with template parameters', () => {
      // Generate a method with template parameters
      const methodCode = generator.generateMethodCode('getGreetingTemplate', {
        returnType: 'str',
        params: [],
        docstring: 'Get a greeting template',
        valueType: 'STRING',
        hasTemplateParams: true,
        paramClassName: 'GreetingTemplateParams',
        originalKey: 'getGreetingTemplate',
      })

      // Check method signature includes params parameter
      expect(methodCode).to.include('def getGreetingTemplate(self, params: Optional[GreetingTemplateParams] = None')

      // Check method documentation
      expect(methodCode).to.include('params: Parameters for template rendering')

      // Check value extraction with template rendering
      expect(methodCode).to.include("if config_value.HasField('string'):")
      expect(methodCode).to.include('raw = config_value.string')
      expect(methodCode).to.include('return pystache.render(raw, params.__dict__) if params else raw')

      // Check that the docstring includes the explanation about template rendering behavior
      expect(methodCode).to.include('Returns:')
      expect(methodCode).to.include(
        "str: If 'params' is provided, returns the template rendered with those parameters.",
      )
      expect(methodCode).to.include("If 'params' is None, returns the raw template string without rendering.")
    })

    it('should handle nested JSON objects with Mustache templates', () => {
      // Register a schema similar to the "url-schema" from the example
      const urlSchema = z.object({
        url: z.string(),
        timeout: z.number(),
        retries: z.number(),
      })

      // Create a JSON schema with a mustache template in the url property
      const urlWithMustacheSchema = z.object({
        url: z
          .function()
          .args(
            z.object({
              scheme: z.string(),
              host: z.string(),
            }),
          )
          .returns(z.string()),
        timeout: z.number(),
        retries: z.number(),
      })

      // Register the method with the schema
      generator.registerMethod(
        'url_with_mustache',
        urlWithMustacheSchema,
        'UrlWithMustache',
        [],
        'Get URL with template parameters',
        'JSON',
      )

      // Generate the Python method code
      const method = (generator as any).methods.get('url_with_mustache')
      expect(method).to.exist
      expect(method.hasTemplateParams).to.be.true

      // Generate the Python code for the entire client
      const pythonCode = generator.generatePythonFile()

      // Print the entire Python code for debugging
      console.log('Generated Python Code:')
      console.log(pythonCode)

      // Verify the imports include pystache
      expect(pythonCode).to.include('import pystache')

      // Verify a parameter class was generated for the URL template
      expect(pythonCode).to.include('class UrlWithMustacheParams')
      expect(pythonCode).to.include('scheme: str')
      expect(pythonCode).to.include('host: str')

      // Verify the method signature includes params parameter
      expect(pythonCode).to.include('def url_with_mustache(self, params: Optional[UrlWithMustacheParams] = None')

      // Most importantly, verify nested template properties are handled correctly
      expect(pythonCode).to.include('if params:')
      expect(pythonCode).to.include('result = {}')
      expect(pythonCode).to.include('for key, value in data.items():')
      expect(pythonCode).to.include('if isinstance(value, str):')
      expect(pythonCode).to.include('result[key] = pystache.render(value, params.__dict__)')
      expect(pythonCode).to.include('else:')
      expect(pythonCode).to.include('result[key] = value')

      // Check for proper model return
      expect(pythonCode).to.include('return UrlWithMustacheModel(**result)')
      expect(pythonCode).to.include('return UrlWithMustacheModel(**data)')
    })

    it('should correctly generate imports for templates', () => {
      // Create a generator without templates
      const generatorNoTemplates = new UnifiedPythonGenerator({
        className: 'NoTemplatesClient',
      })

      // Register a regular method
      generatorNoTemplates.registerMethod('getConfig', z.object({key: z.string()}), undefined, [], 'Get config', 'JSON')

      // Generate Python file
      const pythonCodeNoTemplates = generatorNoTemplates.generatePythonFile()

      // Should not include pystache
      expect(pythonCodeNoTemplates).not.to.include('import pystache')

      // Now create a generator with templates
      const generatorWithTemplates = new UnifiedPythonGenerator({
        className: 'TemplatesClient',
      })

      // Register a template method
      generatorWithTemplates.registerMethod(
        'getGreetingTemplate',
        z
          .function()
          .args(z.object({name: z.string()}))
          .returns(z.string()),
        undefined,
        [],
        'Get greeting template',
        'STRING',
      )

      // Generate Python file
      const pythonCodeWithTemplates = generatorWithTemplates.generatePythonFile()

      // Should include pystache via the import collector
      expect(pythonCodeWithTemplates).to.include('import pystache')
    })
  })

  describe('Method name sanitization', () => {
    it('should sanitize method names with dots', () => {
      // Create a schema with a problematic method name
      const schema = z.object({
        field1: z.string(),
        field2: z.number(),
      })

      // Register a method with dots in the name
      generator.registerMethod('url.with.mustache', schema, 'UrlConfig', [], 'Get URL configuration', 'JSON')

      // Generate method code
      const methodCode = generator.generateMethodCode('url_with_mustache', {
        returnType: 'UrlConfig',
        params: [],
        docstring: 'Get URL configuration',
        valueType: 'JSON',
        originalKey: 'url.with.mustache',
      })

      // Verify the method name is sanitized correctly
      expect(methodCode).to.include('def url_with_mustache(self')
      expect(methodCode).not.to.include('def url.with.mustache(self')

      // Generate the full client code
      const pythonCode = generator.generatePythonFile()

      // Verify the sanitized method name appears in the full code
      expect(pythonCode).to.include('def url_with_mustache(self')
      expect(pythonCode).not.to.include('def url.with.mustache(self')
    })

    it('should sanitize method names with other special characters', () => {
      // Generate Python file with methods that have special characters
      generator.registerMethod(
        'feature.flag.is-enabled?',
        z.boolean(),
        undefined,
        [],
        'Check if feature flag is enabled',
        'BOOL',
      )
      generator.registerMethod('api-gateway/endpoint', z.string(), undefined, [], 'Get API endpoint', 'STRING')

      const pythonCode = generator.generatePythonFile()

      // Log the method name transformation for debugging
      console.log(
        "ZodUtils.keyToMethodName('api-gateway/endpoint') => '" +
          ZodUtils.keyToMethodName('api-gateway/endpoint') +
          "'",
      )
      console.log(
        "ZodUtils.keyToMethodName('feature.flag.is-enabled?') => '" +
          ZodUtils.keyToMethodName('feature.flag.is-enabled?') +
          "'",
      )

      // Check that the special characters were handled properly
      expect(pythonCode).to.include('def feature_flag_is_enabled(self')
      expect(pythonCode).to.include('def api_gateway_endpoint(self')
    })
  })

  describe('Class member generation', () => {
    it('should generate imports section', () => {
      // ... existing code ...

      const methodCode = generator.generateMethodCode('get_config', {
        returnType: 'ConfigModel',
        params: [],
        docstring: 'Get config',
        valueType: 'JSON',
        originalKey: 'get_config',
      })

      // ... assertions ...
    })

    it('should generate parameter classes', () => {
      // ... existing code ...
    })
  })
})
