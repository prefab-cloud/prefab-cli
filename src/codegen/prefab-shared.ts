import { z } from "zod";
import Mustache from 'mustache';
import type { PrefabTypesafe } from "./prefab-typesafe-zod";

export class MustacheImpl<T> {
    constructor(
        private template: string,
        private schema?: z.ZodType<T>
    ) { }

    compile(values: T): string {
        if (this.schema) {
            this.schema.parse(values);
        }
        return Mustache.render(this.template, values);
    }

    toString(): string {
        return this.template;
    }
}

export function MustacheString<T extends z.ZodTypeAny = z.ZodObject<{}>>(schema?: T) {
    return z.string().transform((str, ctx) => {
        return {
            template: str,
            schema: schema || z.object({}),
            compile: function (data: z.infer<T>, prefab?: PrefabTypesafe) {
                // If no prefab instance provided, just do basic compilation
                if (!prefab) {
                    return Mustache.render(str, data);
                }

                // Create a partials resolver that uses prefab.get()
                const partials: Record<string, string> = new Proxy({}, {
                    get: (_, name: string) => {
                        try {
                            const config = prefab.get(name);
                            return config.template;
                        } catch (e) {
                            console.warn(`Failed to load partial "${name}":`, e);
                            return '';
                        }
                    }
                });

                return Mustache.render(str, data, partials);
            }
        };
    });
}

export type MustacheStringType<T> = {
    template: string;
    schema: T;
    compile: (data: z.infer<T>, prefab?: PrefabTypesafe) => string;
}; 