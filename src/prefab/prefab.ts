import { z } from "zod";
import { Prefab } from "@prefab-cloud/prefab-cloud-node";
//import { MustacheStringType } from "./prefab-shared.js";

export const prefabSchema = z.object({
  postthing.api.token: z.string(),
  google.oauth.key: z.string(),
  google.oauth.client.id: z.string(),
  prefab.api.liveness.enabled: z.boolean(),
  recaptcha.key: z.string(),
  foo.internal.grpc.url: z.string(),
  beta-group: z.boolean(),
  internal-users: z.boolean(),
  c.google.oauth.client.id: z.string(),
  c.prefab.api.liveness.enabled: z.boolean(),
  c.google.oauth.key: z.string(),
  my.segment: z.boolean(),
  kafka.fetch.min.bytes: z.number(),
  redis.uri: z.string(),
  andrew-test-flag: z.any(),
  log-level.app.controllers: z.any(),
  http.timeout: z.number(),
  lsp-demo: z.boolean(),
  hello.flag: z.string(),
  andrew.flag: z.boolean(),
  log-level.rails.controller: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level.active_record: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  db.hostname: z.string(),
  kafka.max.poll.records: z.number(),
  log-level.app: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level.app.controllers.posts_controller: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level.sem-rails.ActionView: z.any(),
  log-level.sem-rails.Post: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level.sem-rails: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  int flag: z.number(),
  log-level.ruby: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level.ruby.rails-logging-test-app: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  log-level.prefab-cloud-ruby: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  234nas6234^&amp;#$__&#x2F;&#x2F;&#x2F;WHY_OH_WHY: z.boolean(),
  tex: z.any(),
  log-level.action_dispatch: z.enum([&quot;TRACE&quot;, &quot;DEBUG&quot;, &quot;INFO&quot;, &quot;WARN&quot;, &quot;ERROR&quot;]),
  stringlisttest: z.any(),
  whitespace.flag: z.boolean(),
  lifetime-access: z.boolean(),
  trial-extensions: z.boolean(),
  access-to.team-network: z.boolean(),
  expiring-trials-list: z.boolean(),
  can reactivate on another plan: z.boolean(),
  growth-tier: z.boolean(),
  enterprise-tier: z.boolean(),
  legacy-tier-7: z.boolean(),
  experiments.exp-32.new-checkout-flow: z.string(),
  features.host.reporting.advanced: z.boolean(),
  test.blacksmith: z.boolean(),
  tracking.mixpanel.enabled: z.boolean(),
  flag.tidelift: z.boolean(),
  ai.very-long: z.string(),
  conv: z.string(),
  some-json: z.string(),
  copilot.initial.qs: z.string(),
});

export type PrefabConfig = z.infer<typeof prefabSchema>;

export class PrefabTypesafe {
    constructor(private prefab: Prefab) { }

    get<K extends keyof PrefabConfig>(key: K): PrefabConfig[K] {
        const value = this.prefab.get(key);
        return prefabSchema.shape[key].parse(value) as PrefabConfig[K];
    }
}