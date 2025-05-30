import {expect} from 'chai'

import {generatePythonClientCode} from '../../../src/codegen/python/generator.js'
import {SchemaInferrer} from '../../../src/codegen/schema-inferrer.js'
import {type Config, type ConfigFile, SupportedLanguage} from '../../../src/codegen/types.js'

describe('Python Generator Integration', () => {
  it('should generate Python code from config files', () => {
    // Create a mock config file with different types of configs
    const mockConfigFile: ConfigFile = {
      configs: [
        {
          configType: 'FEATURE_FLAG',
          key: 'feature_enabled',
          rows: [
            {
              values: [{value: {bool: true}}],
            },
          ],
          valueType: 'BOOL',
        },
        {
          configType: 'CONFIG',
          key: 'api_url',
          rows: [
            {
              values: [{value: {string: 'https://api.example.com'}}],
            },
          ],
          valueType: 'STRING',
        },
        {
          configType: 'CONFIG',
          key: 'timeout_seconds',
          rows: [
            {
              values: [{value: {int: 30}}],
            },
          ],
          valueType: 'INT',
        },
        {
          configType: 'CONFIG',
          key: 'rate_limits',
          rows: [
            {
              values: [
                {
                  value: {
                    json: {
                      json: JSON.stringify({
                        enterprise: 5000,
                        premium: 500,
                        standard: 100,
                      }),
                    },
                  },
                },
              ],
            },
          ],
          valueType: 'JSON',
        },
        {
          configType: 'CONFIG',
          key: 'allowed_origins',
          rows: [
            {
              values: [
                {
                  value: {
                    // @ts-expect-error: The local ConfigValue interface doesn't have string_list but the Python generator expects it
                    string_list: {values: ['localhost', 'example.com', 'api.example.com']},
                  },
                },
              ],
            },
          ],
          valueType: 'STRING_LIST',
        },
      ],
    }

    // Mock SchemaInferrer - use a simple implementation that returns appropriate schemas
    const mockSchemaInferrer = {
      zodForConfig(config: Config, _configFile: ConfigFile, _language: SupportedLanguage) {
        if (config.key === 'feature_enabled') {
          return {providence: 'inferred', schema: {_def: {typeName: 'ZodBoolean'}}} // Mock boolean schema
        }

        if (config.key === 'api_url') {
          return {providence: 'inferred', schema: {_def: {typeName: 'ZodString'}}} // Mock string schema
        }

        if (config.key === 'timeout_seconds') {
          return {providence: 'inferred', schema: {_def: {checks: [{kind: 'int'}], typeName: 'ZodNumber'}}} // Mock integer schema
        }

        if (config.key === 'rate_limits') {
          return {providence: 'inferred', schema: {_def: {typeName: 'ZodObject'}}} // Mock object schema
        }

        if (config.key === 'allowed_origins') {
          return {
            providence: 'inferred',
            schema: {_def: {element: {_def: {typeName: 'ZodString'}}, typeName: 'ZodArray'}},
          } // Mock string array schema
        }

        if (config.key === 'feature.enabled') {
          return {providence: 'inferred', schema: {_def: {checks: [{kind: 'int'}], typeName: 'ZodNumber'}}} // Mock integer schema
        }

        return {providence: 'inferred', schema: {_def: {typeName: 'ZodUnknown'}}}
      },
    } as unknown as SchemaInferrer

    // Generate the Python code
    const generatedCode = generatePythonClientCode(mockConfigFile, mockSchemaInferrer, 'PrefabClient')

    // Verify key parts of the generated code
    expect(generatedCode).to.include('class PrefabClient:')

    // Check for methods
    expect(generatedCode).to.include('def feature_enabled(self')
    expect(generatedCode).to.include('def api_url(self')
    expect(generatedCode).to.include('def timeout_seconds(self')
    expect(generatedCode).to.include('def rate_limits(self')
    expect(generatedCode).to.include('def allowed_origins(self')

    // Check for return types
    expect(generatedCode).to.include('-> bool:')
    expect(generatedCode).to.include('-> str:')
    expect(generatedCode).to.include('-> int:')
    expect(generatedCode).to.include('-> List[str]:')

    // Check for value type handling
    expect(generatedCode).to.include('if isinstance(config_value, bool):')
    expect(generatedCode).to.include('if isinstance(config_value, str):')
    expect(generatedCode).to.include('if isinstance(config_value, int):')
    expect(generatedCode).to.include(
      'if isinstance(config_value, list) and all(isinstance(x, str) for x in config_value):',
    )

    // Check for ConfigValue field handling
    expect(generatedCode).to.include('if isinstance(config_value, bool):')
    expect(generatedCode).to.include('if isinstance(config_value, str):')
    expect(generatedCode).to.include('if isinstance(config_value, int):')
    expect(generatedCode).to.include('return config_value')

    // Check for appropriate imports
    expect(generatedCode).to.include('from typing import')
    expect(generatedCode).to.include('import logging')
    expect(generatedCode).to.include('import prefab_cloud_python')
    expect(generatedCode).to.include('from prefab_cloud_python import')
    expect(generatedCode).to.include('Context')
  })

  it('throws if method names conflict', () => {
    // Create a mock config file with different types of configs
    const mockConfigFile: ConfigFile = {
      configs: [
        {
          configType: 'FEATURE_FLAG',
          key: 'feature_enabled',
          rows: [
            {
              values: [{value: {bool: true}}],
            },
          ],
          valueType: 'BOOL',
        },
        {
          configType: 'CONFIG',
          key: 'api_url',
          rows: [
            {
              values: [{value: {string: 'https://api.example.com'}}],
            },
          ],
          valueType: 'STRING',
        },
        {
          configType: 'CONFIG',
          key: 'feature.enabled',
          rows: [
            {
              values: [{value: {int: 30}}],
            },
          ],
          valueType: 'INT',
        },
      ],
    }

    const mockSchemaInferrer = {
      zodForConfig(config: Config, _configFile: ConfigFile, _language: SupportedLanguage) {
        if (config.key === 'feature_enabled') {
          return {providence: 'inferred', schema: {_def: {typeName: 'ZodBoolean'}}} // Mock boolean schema
        }

        if (config.key === 'api_url') {
          return {providence: 'inferred', schema: {_def: {typeName: 'ZodString'}}} // Mock string schema
        }

        if (config.key === 'feature.enabled') {
          return {providence: 'inferred', schema: {_def: {checks: [{kind: 'int'}], typeName: 'ZodNumber'}}} // Mock integer schema
        }

        return {providence: 'inferred', schema: {_def: {typeName: 'ZodUnknown'}}}
      },
    } as unknown as SchemaInferrer

    expect(() => generatePythonClientCode(mockConfigFile, mockSchemaInferrer)).to.throw(
      `Unable to generate method 'feature_enabled' for config key 'feature.enabled' because it has already been generated for config key 'feature_enabled'.`,
    )
  })
})
