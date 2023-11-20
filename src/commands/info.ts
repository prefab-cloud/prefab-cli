import {Flags} from '@oclif/core'

import type {PrefabConfig} from '../prefab-common/src/types.js'

import {DEFAULT_ENVIRONMENT_NAME, INHERIT} from '../constants.js'
import {APICommand} from '../index.js'
import getKey from '../pickers/get-key.js'
import {getConfigFromApi} from '../prefab-common/src/api/getConfigFromApi.js'
import {Environment, getEnvironmentsFromApi} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import {configValuesInEnvironments} from '../prefab-common/src/configValuesInEnvironments.js'
import {EvaluationStats, getEvaluationStats} from '../prefab-common/src/evaluations/stats.js'
import {urlFor} from '../prefab-common/src/urlFor.js'
import {Provided, valueOf, valueOfToString} from '../prefab-common/src/valueOf.js'
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
      const config = prefab.raw(key)
      if (!config) {
        return this.err(`Key ${key} not found`)
      }

      const url = urlFor(process.env.PREFAB_API_URL, config)

      this.log(url)
      this.log('')

      const json: Record<string, unknown> = {url}

      const client = await this.getApiClient()

      const [fullConfig, environments, evaluations] = await Promise.all([
        getConfigFromApi({
          client,
          errorLog: log,
          key,
        }),
        getEnvironmentsFromApi({
          client,
          log,
        }),
        getEvaluationStats({
          client,
          key,
          log,
        }),
      ])

      if (fullConfig) {
        json.values = this.parseConfig(fullConfig, environments, url)
        this.log('')
      } else {
        return this.err(`No config found for ${key}`)
      }

      if (evaluations) {
        json.evaluations = this.parseEvaluations(evaluations)
      } else {
        this.log(`No evaluations found for ${key} in the past 24 hours`)
        json.evaluations = {error: `No evaluations found for ${key} in the past 24 hours`}
      }

      return {[key]: json}
    }
  }

  private parseConfig(config: PrefabConfig, environments: Environment[], url: string) {
    const values = configValuesInEnvironments(config, environments, log)

    const contents: string[] = []
    const json: Record<string, unknown> = {}

    for (const value of values) {
      if (value.hasRules) {
        json[value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME] = '[see rules]'

        contents.push(
          `- ${value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME}: [see rules](${
            url + `?environment=${value.environment?.id}`
          })`,
        )
      } else {
        let valueStr = `${value.value ?? INHERIT}`

        if (value.rawValue?.weightedValues) {
          valueStr = value.rawValue.weightedValues.weightedValues
            .sort((a, b) => b.weight - a.weight)
            .map((weightedValue) => {
              const value = weightedValue.value ? valueOf(weightedValue.value) : ''
              return `${weightedValue.weight}% ${value}`
            })
            .join(', ')
        }

        // eslint-disable-next-line no-warning-comments
        // TODO: remove this check on `provided` is in the proto
        if ('provided' in (value.rawValue ?? {})) {
          valueStr = `\`${(value.rawValue as Provided).provided.lookup}\` via ENV`
        }

        json[value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME] = value.value

        contents.push(`- ${value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME}: ${valueStr}`)
      }
    }

    this.log(contents.join('\n').trim())

    return json
  }

  private parseEvaluations(evaluations: EvaluationStats) {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {key: _, ...evals} = evaluations

    return evals
  }
}

const percent = (value: number) => `${Math.round(value * 100)}%`
