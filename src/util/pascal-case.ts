import camelCase from 'lodash.camelcase'

export default function pascalCase(str: string): string {
  const camelCaseField = camelCase(str)

  return camelCaseField[0].toUpperCase() + camelCaseField.slice(1)
}
