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

type Json = Record<string, unknown> & {success: boolean}

export const unwrapRequest = async (promise: Promise<Response>) => {
  const request = await promise

  if (request.status.toString().startsWith('2')) {
    const json = await request.json()
    log('ApiClient', {response: json})

    return {success: true, ...json} as Json
  }

  const error = jsonMaybe(await request.text())

  return {error, status: request.status, success: false}
}

export default getClient
