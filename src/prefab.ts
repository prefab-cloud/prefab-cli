import {Command} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

type Flags = {
  ['api-key']?: string
}

export const initPrefab = async (ctx: Command, flags: Flags) => {
  if (!flags['api-key']) {
    ctx.logToStderr('Error: API key is required')
    ctx.exit(401)
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
