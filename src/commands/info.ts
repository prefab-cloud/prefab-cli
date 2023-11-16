import {Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import {EvaluationStats, getEvaluationStats} from '../prefab-common/src/evaluations/stats.js'
import {valueOfToString} from '../prefab-common/src/valueOf.js'
import getKey from '../util/get-key.js'
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
      const evaluations = await getEvaluationStats({
        client: await this.getApiClient(),
        key,
        log,
      })

      if (!evaluations) {
        this.errorForCurrentFormat(`No evaluations found for ${key} in the past 24 hours`)
      }

      this.log('Evaluations over the last 24 hours:\n')

      const contents = []

      // Sort environments by most to least number of evaluations
      const sortedKeys = Object.keys(evaluations.environments)
        .sort((a, b) => evaluations.environments[a].total - evaluations.environments[b].total)
        .reverse()

      for (const envId of sortedKeys) {
        const env = evaluations.environments[envId] as EvaluationStats['environments'][0]
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

      return {[key]: json}
    }
  }
}

const percent = (value: number) => `${Math.round(value * 100)}%`
