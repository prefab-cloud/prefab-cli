// eslint-disable-next-line node/no-extraneous-import
import chalk from 'chalk'

const verbose = process.argv.includes('--verbose')

const formatOutput = (output: unknown) => {
  if (typeof output !== 'object') return output

  return JSON.stringify(output)
}

const stderr = (color: typeof chalk.Color, ...args: unknown[]) =>
  process.stderr.write(chalk[color](args.map((arg) => formatOutput(arg)).join(': ') + '\n'))

export const log = verbose ? (...args: unknown[]) => stderr('white', ...args) : () => {}
