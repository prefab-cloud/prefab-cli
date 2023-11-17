import {DefaultBodyType, HttpResponse, StrictRequest} from 'msw'

import type {JsonObj} from '../src/result.js'

export type CannedResponse = [JsonObj, JsonObj, number]
export type CannedResponses = Record<string, CannedResponse[]>

// NOTE: This is a bit brittle in that it can break if currentVersionId changes
// We can cross that bridge when we get there (possibly by iterating over the
// object and comparing keys/values and having a special ANY or NUMBER
// placeholder. Alternatively we could just ignore currentVersionId
// specifically)
export const getCannedResponse = async (
  request: StrictRequest<DefaultBodyType>,
  cannedResponses: CannedResponses,
): Promise<HttpResponse> => {
  const body = await request.json()

  const cannedResponsesForUrl = cannedResponses[request.url]

  if (!cannedResponsesForUrl) {
    console.log(JSON.stringify(body, null, 2))

    throw new Error('No canned responses for url')
  }

  const cannedResponse = cannedResponsesForUrl.find(([payload]) => JSON.stringify(payload) === JSON.stringify(body))

  if (!cannedResponse) {
    console.log(JSON.stringify(body, null, 2))

    throw new Error('No canned response found')
  }

  const [, response, status] = cannedResponse

  return HttpResponse.json(response, {status})
}
