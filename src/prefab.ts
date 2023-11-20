import {Command} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {ConfigValue, GetValue} from './prefab-common/src/types.js'

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
    return ctx.error('API key is required', {exit: 401})
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
  const value = config?.rows[0]?.values[0]?.value

  if (value) {
    return Object.keys(value)[0]
  }
}

const getUserId = (): string =>
  prefab.defaultContext()?.get(DEFAULT_CONTEXT_USER_ID_NAMESPACE)?.get(DEFAULT_CONTEXT_USER_ID) as string

const getRowInEnvironment = (key: string, desiredEnvId?: string) => {
  const envId = desiredEnvId ?? getProjectEnvFromApiKey(apiKey).id

  const config = prefab.raw(key)

  if (!config) {
    return
  }

  return config.rows.find((row) => row.projectEnvId?.toString() === envId)
}

export const overrideFor = (key: string): ConfigValue | undefined => {
  const userId = getUserId()

  const row = getRowInEnvironment(key)

  if (row) {
    for (const value of row.values) {
      for (const criterion of value.criteria) {
        if (
          criterion.propertyName === `${DEFAULT_CONTEXT_USER_ID_NAMESPACE}.${DEFAULT_CONTEXT_USER_ID}` &&
          criterion.valueToMatch?.stringList?.values.includes(userId)
        ) {
          return value.value
        }
      }
    }
  }
}

export const defaultValueFor = (key: string, envId: string): GetValue | undefined => {
  const row = getRowInEnvironment(key, envId)

  const value = row?.values.at(-1)?.value

  if (value) {
    return Object.values(value)[0]
  }
}
