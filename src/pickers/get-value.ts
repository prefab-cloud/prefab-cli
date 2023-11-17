import {ux} from '@oclif/core'
import {Prefab} from '@prefab-cloud/prefab-cloud-node'

import type {Environment} from '../prefab-common/src/api/getEnvironmentsFromApi.js'
import type {GetValue, PrefabConfig} from '../prefab-common/src/types.js'

import {defaultValueFor} from '../prefab.js'
import {valueOfToString} from '../prefab-common/src/valueOf.js'
import {Result, failure, noop} from '../result.js'
import autocomplete from '../util/autocomplete.js'
import validateValue from '../validations/value.js'

const getValue = async ({
  desiredValue,
  environment,
  flags,
  key,
  prefab,
  message,
}: {
  desiredValue: string | undefined
  environment?: Environment
  flags: {interactive: boolean}
  key: string
  prefab: Prefab
  message: string
}): Promise<Result<string>> => {
  if (desiredValue === undefined && !flags.interactive) {
    return failure(`No value provided for ${key}`)
  }

  const currentDefault = environment ? defaultValueFor(key, environment.id) : undefined

  const config = prefab.raw(key)

  if (!config) {
    return failure(`Could not find config named ${key}`)
  }

  const selectedValue = desiredValue ?? (await promptForValue({config, currentDefault, message}))

  if (selectedValue === undefined) {
    return noop()
  }

  if (selectedValue === currentDefault?.toString()) {
    return noop(`The default is already \`${selectedValue}\``)
  }

  return validateValue(prefab, key, selectedValue)
}

const promptForValue = async ({
  config,
  currentDefault,
  message,
}: {
  config: PrefabConfig
  currentDefault: GetValue | undefined
  message: string
}) => {
  const choices = config.allowableValues.map((v) => valueOfToString(v))

  if (choices.length === 0) {
    return ux.prompt(message)
  }

  const autoCompleteMessage =
    currentDefault === undefined
      ? `Choose your new default.`
      : `The current default is \`${currentDefault}\`. Choose your new default.`

  return autocomplete({
    message: autoCompleteMessage,
    source: choices.filter((v) => v.toString() !== currentDefault?.toString()),
  })
}

export default getValue
