import {Flags} from '@oclif/core'

import type {Config} from '../prefab-common/src/types.js'

import {DEFAULT_ENVIRONMENT_NAME, INHERIT} from '../constants.js'
import {APICommand} from '../index.js'
import {overrideFor, unwrap} from '../prefab.js'
import {getConfigFromApi} from '../prefab-common/src/api/getConfigFromApi.js'
import {Environment, getEnvironmentsFromApi} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import {configValuesInEnvironments} from '../prefab-common/src/configValuesInEnvironments.js'
import {EvaluationStats, getEvaluationStats} from '../prefab-common/src/evaluations/stats.js'
import {urlFor} from '../prefab-common/src/urlFor.js'
import {valueOf, valueOfToString} from '../prefab-common/src/valueOf.js'
import {JsonObj} from '../result.js'
import getKey from '../ui/get-key.js'
import nameArg from '../util/name-arg.js'

export default class Info extends APICommand {
  static args = {...nameArg}

  static description = 'Show details about the provided config/feature-flag/etc.'

  static examples = ['<%= config.bin %> <%= command.id %> my.config.name']

  static flags = {
    'exclude-evaluations': Flags.boolean({default: false, description: 'Exclude evaluation data'}),
  }

  public async run(): Promise<JsonObj | void> {
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

      const json: JsonObj = {url}

      const client = this.rawApiClient

      const [fullConfig, environments, evaluations] = await Promise.all([
        getConfigFromApi({
          client,
          errorLog: this.verboseLog,
          key,
        }),
        getEnvironmentsFromApi({
          client,
          log: this.verboseLog,
        }),
        getEvaluationStats({
          client,
          key,
          log: this.verboseLog,
        }),
      ])

      if (fullConfig) {
        this.verboseLog('Full config:', fullConfig)
        json.values = this.parseConfig(fullConfig, environments, url)
        this.log('')
      } else {
        return this.err(`No config found for ${key}`)
      }

      if (evaluations) {
        json.evaluations = this.parseEvaluations(evaluations)
      } else {
        const message = `No evaluations in the past 24 hours`
        this.log(message)
        json.evaluations = {error: message}
      }

      return {[key]: json}
    }
  }

  private parseConfig(config: Config, environments: Environment[], url: string) {
    const values = configValuesInEnvironments(config, environments, this.verboseLog)
    const override = overrideFor({currentEnvironmentId: this.currentEnvironment.id, key: config.key})

    const contents: string[] = []
    const json: JsonObj = {}

    const sortedValues = values.sort((a, b) =>
      (a.environment?.name ?? DEFAULT_ENVIRONMENT_NAME).localeCompare(b.environment?.name ?? DEFAULT_ENVIRONMENT_NAME),
    )

    for (const value of sortedValues) {
      const isCurrentEnv = value.environment?.id === this.currentEnvironment.id

      const overrideStr = isCurrentEnv && override ? ` [override] ${unwrap(override)}` : ''

      if (value.hasRules) {
        json[value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME] = {
          override: isCurrentEnv && override ? unwrap(override) : undefined,
          url: url + `?environment=${value.environment?.id}`,
          value: '[see rules]',
        }

        contents.push(
          `- ${value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME}:${overrideStr || ' [see rules]'} ${
            url + `?environment=${value.environment?.id}`
          }`,
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

        if (value.rawValue?.provided?.source?.toString() === 'ENV_VAR') {
          valueStr += ` via ENV`
        }

        json[value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME] = {
          override: isCurrentEnv && override ? unwrap(override) : undefined,
          url: url + `?environment=${value.environment?.id}`,
          value: value.value,
        }

        contents.push(`- ${value.environment?.name ?? DEFAULT_ENVIRONMENT_NAME}: ${valueStr}${overrideStr}`)
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
