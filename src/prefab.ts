import {Command} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

type Flags = {
  ['api-key']?: string
}

export const initPrefab = async (ctx: Command, flags: Flags) => {
  if (!flags['api-key']) {
    ctx.error('Error: API key is required', {exit: 401})
  }

  const prefab = new Prefab({
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

export type GetValue = ReturnType<typeof Prefab.prototype.get>
