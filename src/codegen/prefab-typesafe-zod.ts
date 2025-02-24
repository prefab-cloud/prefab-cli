const template = `import { Prefab } from "@prefab-cloud/prefab-cloud-node";
import { z } from "zod";
import { prefabSchema, PrefabConfig } from "./prefab-zod-generated.js";
import { MustacheStringType } from "./prefab-shared.js";

export class PrefabTypesafe {
    constructor(private prefab: Prefab) { }

    get<K extends keyof PrefabConfig>(key: K): PrefabConfig[K] {
        const value = this.prefab.get(key);
        // For MustacheString types, pass the prefab instance to enable partials
        if (typeof value === 'string' && value.includes('{{')) {
            const mustacheString = prefabSchema.shape[key].parse(value) as MustacheStringType<any>;
            // Pass this instance to enable partial resolution
            return {
                template: mustacheString.template,
                schema: mustacheString.schema,
                compile: (data: any) => mustacheString.compile(data, this)
            } as PrefabConfig[K];
        }
        return prefabSchema.shape[key].parse(value) as PrefabConfig[K];
    }
}`;
