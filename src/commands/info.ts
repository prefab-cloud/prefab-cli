import {Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import getKey from '../pickers/get-key.js'
import {getEvaluationStats} from '../prefab-common/src/evaluations/stats.js'
import {urlFor} from '../prefab-common/src/urlFor.js'
import {valueOfToString} from '../prefab-common/src/valueOf.js'
import {log} from '../util/log.js'
import nameArg from '../util/name-arg.js'

export default class Info extends APICommand {
  static args = {...nameArg}

  static description = 'Show details about the provided config/feature-flag/etc.'

  static examples = ['<%= config.bin %> <%= command.id %> my.config.name']

  static flags = {
    'exclude-evaluations': Flags.boolean({default: false, description: 'Exclude evaluation data'}),
  }

  public async run(): Promise<Record<string, unknown> | void> {
    const {args, flags} = await this.parse(Info)

    const {key, prefab} = await getKey({args, command: this, flags, message: 'Which item would you like to see?'})

    if (key && prefab) {
      if (!prefab.keys().includes(key)) {
        return this.err(`Key ${key} not found`)
      }

      const url = urlFor(prefab, process.env.PREFAB_API_URL, key)

      if (url) {
        this.log(url)
        this.log('')
      }

      const evaluations = await getEvaluationStats({
        client: await this.getApiClient(),
        key,
        log,
      })

      if (!evaluations) {
        return this.ok(`No evaluations found for ${key} in the past 24 hours`)
      }

      this.log('Evaluations over the last 24 hours:\n')

      const contents = []

      for (const env of evaluations.environments) {
        contents.push(`${env.name}: ${env.total.toLocaleString()}`)

        const counts: string[] = []

        for (const count of env.counts) {
          counts.push(`- ${percent(count.count / env.total)} - ${valueOfToString(count.configValue)}`)
        }

        for (const count of counts) {
          contents.push(count)
        }

        contents.push('')
      }

      this.log(contents.join('\n').trim())

      if (!evaluations) {
        throw {[key]: null, message: `No evaluations found for ${key} in the past 24 hours`}
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {key: _, ...json} = evaluations

      return {[key]: {...json, url}}
    }
  }
}

const percent = (value: number) => `${Math.round(value * 100)}%`
