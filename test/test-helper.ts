import {DefaultBodyType, HttpResponse, StrictRequest} from 'msw'

import type {JsonObj} from '../src/result.js'

export type CannedResponse = [JsonObj, JsonObj, number]
export type CannedResponses = Record<string, CannedResponse[]>

export const ANY = Symbol('any')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepCompare = (obj1: any, obj2: any): boolean => {
  // Check if either of the values is ANY
  //
  // Realistically only the stub should have `ANY` but we don't want to care
  // about argument order.
  if (obj1 === ANY || obj2 === ANY) {
    return true
  }

  // If both are the same value/primitive
  if (obj1 === obj2) {
    return true
  }

  // If both are objects (including arrays)
  if (obj1 && obj2 && typeof obj1 === 'object' && typeof obj2 === 'object') {
    // Check if both are arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) {
        return false
      }

      for (const [i, element] of obj1.entries()) {
        if (!deepCompare(element, obj2[i])) {
          return false
        }
      }

      return true
    }

    // If both are objects (but not arrays)
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false
      }

      if (!deepCompare(obj1[key], obj2[key])) {
        return false
      }
    }

    return true
  }

  // If none of the above, the objects are not equal
  return false
}

export const getCannedResponse = async (
  request: StrictRequest<DefaultBodyType>,
  cannedResponses: CannedResponses,
): Promise<HttpResponse> => {
  const body = await request.json()

  if (!body || typeof body !== 'object') {
    throw new Error('Expected http body to be an object')
  }

  const cannedResponsesForUrl = cannedResponses[request.url]

  if (!cannedResponsesForUrl) {
    console.log(JSON.stringify(body, null, 2))

    throw new Error('No canned responses for url')
  }

  const cannedResponse = cannedResponsesForUrl.find(([payload]) => deepCompare(payload, body))

  if (!cannedResponse) {
    console.log(JSON.stringify(body, null, 2))

    throw new Error('No canned response for payload')
  }

  const [, response, status] = cannedResponse

  return HttpResponse.json(response, {status})
}
