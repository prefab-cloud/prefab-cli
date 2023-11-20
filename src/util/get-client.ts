import type {JsonObj,RequestResult} from '../result.js'

import {Client} from '../prefab-common/src/api/client.js'
import jsonMaybe from '../util/json-maybe.js'
import version from '../version.js'
import {log} from './log.js'

let clientInstance: Client | undefined

const getClient = (apiKey: string) => {
  if (clientInstance) return clientInstance

  clientInstance = new Client({
    apiKey,
    apiUrl: process.env.PREFAB_API_URL,
    clientIdentifier: `prefab-cli-${version}`,
    log,
  })

  return clientInstance
}

export const unwrapRequest = async (promise: Promise<Response>): Promise<RequestResult> => {
  const request = await promise

  if (request.status.toString().startsWith('2')) {
    const json = (await request.json()) as JsonObj
    log('ApiClient', {response: json})

    return {json, ok: true, status: request.status}
  }

  const error = jsonMaybe(await request.text())

  if (typeof error === 'string') {
    return {error: {error}, ok: false, status: request.status}
  }

  return {error, ok: false, status: request.status}
}

export default getClient
