// eslint-disable-next-line node/no-extraneous-import
import chalk from 'chalk'
// eslint-disable-next-line import/default
import fuzzy from 'fuzzy'
import internalAutocomplete from 'inquirer-autocomplete-standalone'

const options = {
  post: '\u001B[0m',
  pre: '\u001B[31m',
}

const unformat = (str: string) => str.replaceAll(options.pre, '').replaceAll(options.post, '')

const autocomplete = async ({message, source}: {message: string; source: (() => string[]) | string[]}) => {
  try {
    const result = await internalAutocomplete({
      message: chalk.green(message),
      async source(input: string | undefined) {
        const list = typeof source === 'function' ? source() : source

        // eslint-disable-next-line import/no-named-as-default-member
        return fuzzy.filter(input ?? '', list, options).map((el) => ({value: el.string}))
      },
    })

    return unformat(result)
  } catch {}
}

export default autocomplete
