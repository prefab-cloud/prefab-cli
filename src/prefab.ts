import {Command} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {ConfigValue, GetValue} from './prefab-common/src/types.js'

type Flags = {
  ['api-key']?: string
}

let prefab: Prefab

const DEFAULT_CONTEXT_USER_ID_NAMESPACE = 'prefab-api-key'
const DEFAULT_CONTEXT_USER_ID = 'user-id'

export const initPrefab = async (ctx: Command, flags: Flags) => {
  if (!flags['api-key']) {
    return ctx.error('API key is required', {exit: 401})
  }

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

const getUserId = (): string =>
  prefab.defaultContext()?.get(DEFAULT_CONTEXT_USER_ID_NAMESPACE)?.get(DEFAULT_CONTEXT_USER_ID) as string

const getRowInEnvironment = ({desiredEnvId, key}: {desiredEnvId: string; key: string}) => {
  const envId = desiredEnvId

  const config = prefab.raw(key)

  if (!config) {
    return
  }

  return config.rows.find((row) => row.projectEnvId?.toString() === envId)
}

export const overrideFor = ({
  currentEnvironmentId,
  key,
}: {
  currentEnvironmentId: string
  key: string
}): ConfigValue | undefined => {
  const userId = getUserId()

  const row = getRowInEnvironment({desiredEnvId: currentEnvironmentId, key})

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

export const defaultValueFor = (envId: string, key: string): ConfigValue | undefined => {
  const row = getRowInEnvironment({desiredEnvId: envId, key})

  return row?.values.at(-1)?.value
}

export const unwrap = (value: ConfigValue): GetValue => {
  const valueToReturn = Object.values(value)[0]

  if (typeof valueToReturn === 'object' && !Array.isArray(valueToReturn)) {
    return unwrap(valueToReturn)
  }

  return valueToReturn
}
