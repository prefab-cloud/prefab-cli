import * as fs from 'node:fs'
import path from 'node:path'

import {Client} from '../prefab-common/src/api/client.js'
import {log} from './log.js'

let clientInstance: Client | undefined

const getClient = () => {
  if (clientInstance) return clientInstance

  const {version} = JSON.parse(fs.readFileSync(path.join(path.dirname(''), './package.json'), 'utf8'))

  clientInstance = new Client({
    apiKey: process.env.PREFAB_API_KEY,
    apiUrl: process.env.PREFAB_API_URL,
    clientIdentifier: `prefab-cli-${version}`,
    log,
  })

  return clientInstance
}

export default getClient
