import {BaseGenerator, BaseGeneratorArgs} from './base-generator.js'

export abstract class BaseTypescriptGenerator extends BaseGenerator {
  protected MUSTACHE_IMPORT = "import Mustache from 'mustache'"

  constructor({configFile, log}: BaseGeneratorArgs) {
    super({configFile, log})
  }
}
