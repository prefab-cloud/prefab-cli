export interface ConfigValue {
    value: {
        bool?: boolean;
        int?: number;
        json?: {
            json: string;
        };
        logLevel?: string;
        schema?: {
            schema: string;
            schemaType: string;
        };
        string?: string;
    };
}

export interface ConfigRow {
    values: ConfigValue[];
}


export interface Config {
    configType: 'CONFIG' | 'FEATURE_FLAG' | 'SCHEMA';
    key: string;
    rows: ConfigRow[];
    schemaKey?: string;
    valueType: 'BOOL' | 'DURATION' | 'INT' | 'JSON' | 'LOG_LEVEL' | 'STRING' | 'STRING_LIST';
}

export interface ConfigFile {
    configs: Config[];
} 