import {SchemaInferrer} from '../schema-inferrer.js'
import {type ConfigFile} from '../types.js'
import {UnifiedPythonGenerator} from './pydantic-generator.js'

export function doStuff(configFile: ConfigFile, schemaInferrer: SchemaInferrer): string {
  const generator = new UnifiedPythonGenerator({
    className: 'PrefabClient',
    prefixName: 'Prefab',
  })
  configFile.configs
    .filter((config) => config.configType === 'FEATURE_FLAG' || config.configType === 'CONFIG')
    // eslint-disable-next-line unicorn/no-array-for-each
    .forEach((config) => {
      const inferredSchema = schemaInferrer.infer(config, configFile)
      generator.registerMethod(config.key, inferredSchema, undefined, [], 'testing', config.valueType)
    })
  console.log(generator.generatePythonFile())

  return generator.generatePythonFile()
}
