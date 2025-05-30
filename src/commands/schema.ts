// eslint-disable-next-line n/no-extraneous-import
import type Long from 'long'

import {Args, Flags} from '@oclif/core'

import {APICommand} from '../index.js'
import {ConfigType, ConfigValue} from '../prefab-common/src/types.js'
// import { Schema_SchemaType } from '@prefab-cloud/prefab-cloud-node'
import {JsonObj} from '../result.js'
import {checkmark} from '../util/color.js'

// TODO: this is a temporary fix for the schema type
export enum Schema_SchemaType {
  JSON_SCHEMA = 2,
  UNKNOWN = 0,
  UNRECOGNIZED = -1,
  ZOD = 1,
}

interface SchemaResponse {
  rows: Array<{
    values: Array<{
      value: {
        schema: {
          schema: string
        }
      }
    }>
  }>
}

export default class Schema extends APICommand {
  static args = {
    name: Args.string({description: 'name of the schema', required: true}),
  }

  static description = 'Manage schemas for Prefab configs'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-schema --set-zod="z.object({url: z.string()})"',
    '<%= config.bin %> <%= command.id %> my-schema --get',
  ]

  static flags = {
    get: Flags.boolean({description: 'get the schema definition'}),
    'set-zod': Flags.string({description: 'set a Zod schema definition'}),
  }

  public async run(): Promise<JsonObj | void> {
    const {args, flags} = await this.parse(Schema)

    if (flags.get) {
      const getRequest = await this.apiClient.get(`/api/v1/config/key/${args.name}`)

      if (!getRequest.ok) {
        return this.err(`Failed to get schema: ${getRequest.status} | ${JSON.stringify(getRequest.error)}`, {
          name: args.name,
          phase: 'get',
          serverError: getRequest.error,
        })
      }

      const schemaString = (getRequest.json as unknown as SchemaResponse)?.rows?.[0]?.values?.[0]?.value?.schema?.schema

      return this.ok(`Schema for: ${args.name} is ${schemaString}`, getRequest.json)
    }

    if (flags['set-zod']) {
      const configValue: ConfigValue = {
        schema: {
          schema: flags['set-zod'],
          schemaType: Schema_SchemaType.ZOD,
        },
      }

      const createPayload = {
        configType: ConfigType.SCHEMA,
        key: args.name,
        projectId: this.currentEnvironment.projectId as unknown as Long,
        rows: [
          {
            properties: {},
            values: [{criteria: [], value: configValue}],
          },
        ],
      }

      const createRequest = await this.apiClient.post('/api/v1/config/', createPayload)

      if (!createRequest.ok) {
        if (createRequest.status === 409) {
          // Handle existing schema by updating it
          const updatePayload = {
            configKey: args.name,
            value: configValue,
          }

          const updateRequest = await this.apiClient.post('/api/v1/config/set-default/', updatePayload)

          if (!updateRequest.ok) {
            return this.err(
              `Failed to update schema: ${updateRequest.status} | ${JSON.stringify(updateRequest.error)}`,
              {name: args.name, phase: 'update', serverError: updateRequest.error},
            )
          }

          const message = `${checkmark} Updated schema: ${args.name}`
          return this.ok(message, {name: args.name, ...updateRequest.json})
        }

        return this.err(`Failed to create schema: ${createRequest.status} | ${JSON.stringify(createRequest.error)}`, {
          name: args.name,
          phase: 'creation',
          serverError: createRequest.error,
        })
      }

      const message = `${checkmark} Created schema: ${args.name}`
      return this.ok(message, {name: args.name, ...createRequest.json})
    }

    return this.err('No action specified. Try --get or --set-zod')
  }
}
