export enum SupportedLanguage {
  Python = 'python',
  React = 'react',
  Ruby = 'ruby',
  TypeScript = 'typescript',
}

export interface ConfigValue {
  value: {
    bool?: boolean
    int?: number
    json?: {
      json: string
    }
    logLevel?: string
    schema?: {
      schema: string
      schemaType: string
    }
    string?: string
  }
}

export interface ConfigRow {
  values: ConfigValue[]
}

export interface Config {
  configType: 'CONFIG' | 'FEATURE_FLAG' | 'SCHEMA'
  key: string
  rows: ConfigRow[]
  schemaKey?: string
  sendToClientSdk?: boolean
  valueType: 'BOOL' | 'DOUBLE' | 'DURATION' | 'INT' | 'JSON' | 'LOG_LEVEL' | 'STRING' | 'STRING_LIST'
}

export interface ConfigFile {
  configs: Config[]
}
