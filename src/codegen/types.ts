export interface ConfigValue {
    value: {
        bool?: boolean;
        int?: string;
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
    configType: string;
    key: string;
    rows: ConfigRow[];
    schemaKey?: string;
    valueType: string;
}

export interface ConfigFile {
    configs: Config[];
} 