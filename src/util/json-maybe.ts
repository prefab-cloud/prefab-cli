// Sometimes we get JSON from the server but if there's an exception, we might get a string.
// This function will try to parse the string as JSON and return the parsed object or the original string.
const jsonMaybe = (json: object | string) => {
  if (typeof json === 'string') {
    try {
      return JSON.parse(json)
    } catch {
      return json
    }
  }

  return json
}

export default jsonMaybe
