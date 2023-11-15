import {Client} from '../prefab-common/src/api/client.js'
import version from '../version.js'
import {log} from './log.js'

let clientInstance: Client | undefined

const getClient = () => {
  if (clientInstance) return clientInstance

  clientInstance = new Client({
    apiKey: process.env.PREFAB_API_KEY,
    apiUrl: process.env.PREFAB_API_URL,
    clientIdentifier: `prefab-cli-${version}`,
    log,
  })

  return clientInstance
}

export default getClient
