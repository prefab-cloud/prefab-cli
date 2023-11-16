import {Command} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {ConfigValue} from './prefab-common/src/types.js'

import {getProjectEnvFromApiKey} from './prefab-common/src/getProjectEnvFromApiKey.js'

type Flags = {
  ['api-key']?: string
}

let apiKey: string
let prefab: Prefab

const DEFAULT_CONTEXT_USER_ID_NAMESPACE = 'prefab-api-key'
const DEFAULT_CONTEXT_USER_ID = 'user-id'

export const initPrefab = async (ctx: Command, flags: Flags) => {
  if (!flags['api-key']) {
    ctx.error('API key is required', {exit: 401})
  }

  apiKey = flags['api-key']

  prefab = new Prefab({
    apiKey: flags['api-key'],
    apiUrl: process.env.PREFAB_API_URL,
    cdnUrl: process.env.PREFAB_CDN_URL,
    collectEvaluationSummaries: false,
    collectLoggerCounts: false,
    contextUploadMode: 'none',
    enableSSE: false,
  })

  await prefab.init()

  return prefab
}

export const configValueType = (key: string): string | undefined => {
  const config = prefab.raw(key)
  const value = config.rows[0]?.values[0]?.value

  if (value) {
    return Object.keys(value)[0]
  }

  return undefined
}

const getUserId = (): string =>
  prefab.defaultContext().get(DEFAULT_CONTEXT_USER_ID_NAMESPACE)?.get(DEFAULT_CONTEXT_USER_ID) as string

export const overrideFor = (key: string): ConfigValue | undefined => {
  const envId = getProjectEnvFromApiKey(apiKey).id
  const userId = getUserId()

  let override: ConfigValue | undefined

  const config = prefab.raw(key)

  console.log(JSON.stringify(config, null, 2))

  for (const row of config.rows) {
    if (row.projectEnvId.toString() !== envId) continue

    for (const value of row.values) {
      for (const criterion of value.criteria) {
        if (
          criterion.propertyName === `${DEFAULT_CONTEXT_USER_ID_NAMESPACE}.${DEFAULT_CONTEXT_USER_ID}` &&
          criterion.valueToMatch?.stringList?.values.includes(userId)
        ) {
          override = value.value
        }
      }
    }
  }

  return override
}

export type GetValue = ReturnType<typeof Prefab.prototype.get>
