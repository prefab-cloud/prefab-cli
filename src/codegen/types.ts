export interface ConfigValue {
    value: {
        bool?: boolean;
        int?: string;
        json?: {
            json: string;
        };
        logLevel?: string;
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
    valueType: string;
}

export interface ConfigFile {
    configs: Config[];
} 