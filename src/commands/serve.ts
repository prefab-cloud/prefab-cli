import {Args, Flags} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'
import * as fs from 'node:fs'
import http, {IncomingMessage, ServerResponse} from 'node:http'

import {BaseCommand} from '../index.js'
import {initPrefab} from '../prefab.js'
import {valueTypeString} from '../prefab-common/src/valueType.js'
import {javaScriptClientFormattedContextToContext} from '../util/context.js'

const allowCORSPreflight = (res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-prefabcloud-client-version, authorization')
}

export default class Serve extends BaseCommand {
  static args = {
    'data-file': Args.string({description: 'file to read', required: true}),
  }

  static description = 'Serve a datafile on a local port'

  static examples = ['<%= config.bin %> <%= command.id %> ./prefab.test.588.config.json --port=3099 ']

  static flags = {
    port: Flags.integer({default: 3099, description: 'port to serve on'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Serve)

    const file = args['data-file']

    if (!fs.existsSync(file)) {
      return this.error(`File not found: ${file}`)
    }

    let prefab: Prefab

    try {
      prefab = await initPrefab(this, file)
    } catch (error_) {
      const error = error_ as Error

      if (/No projectEnvId found in config/.test(error.message) || /Unexpected end of JSON input/.test(error.message)) {
        return this.error(
          `${error.message}\nYour download file seems invalid or corrupt. Please redownload your datafile.`,
        )
      }

      return this.error(error as Error)
    }

    const {port} = flags

    const server = http.createServer(this.requestHandler(prefab))

    server.listen(port, (err?: Error) => {
      if (err) {
        return this.err(err)
      }

      console.log(`Server is listening on ${port}. Press ctrl-c to stop.`)
    })
  }

  private requestHandler(prefab: Prefab) {
    return (req: IncomingMessage, res: ServerResponse) => {
      allowCORSPreflight(res)

      // Handle CORS preflight request
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const match = req.url?.match(/^\/configs\/eval-with-context\/(.+)$/)

      if (req.method === 'GET' && match) {
        const encodedContext = match[1]

        const decoded = Buffer.from(decodeURIComponent(encodedContext), 'base64').toString('utf8')

        const context = javaScriptClientFormattedContextToContext(JSON.parse(decoded))

        this.log(`${new Date().toISOString()}: Provided context: ${JSON.stringify(context)}`)

        const config: Record<string, Record<string, unknown>> = {}

        for (const key of prefab.keys()) {
          const raw = prefab.raw(key)

          if (raw) {
            const valueType = valueTypeString(raw.valueType) ?? '?'

            config[key] = {[valueType]: prefab.get(key, context)}
          }
        }

        res.writeHead(200, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({values: config}))
      } else {
        this.verboseLog(`No handler for ${req.method} ${req.url}`)
        res.writeHead(404, {'Content-Type': 'text/plain'})
        res.end('Not Found')
      }
    }
  }
}
