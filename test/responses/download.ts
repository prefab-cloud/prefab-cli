import {HttpResponse, http} from 'msw'
import {setupServer} from 'msw/node'

import type {JsonObj} from '../../src/result.js'

const environmentResponse = {
  envs: [
    {id: 588, name: 'test'},
    {id: 143, name: 'Production'},
  ],
  projectId: 124,
}

export const downloadStub: JsonObj = {
  configs: [
    {
      changedBy: {apiKeyId: '', email: 'jdwyer@prefab.cloud', userId: '0'},
      configType: 'CONFIG',
      draftid: '2',
      id: '16777738077090689',
      key: 'intprop',
      projectId: '2',
      rows: [{values: [{value: {int: '3'}}]}],
      valueType: 'NOT_SET_VALUE_TYPE',
    },
  ],
}

export const server = setupServer(
  http.get('https://api.staging-prefab.cloud/api/v1/project-environments', () =>
    HttpResponse.json(environmentResponse),
  ),

  http.get('https://api.staging-prefab.cloud/api/v1/configs/download', ({request}) => {
    const url = new URL(request.url)
    const envId = url.searchParams.get('envId')

    if (envId === '588') {
      return HttpResponse.json(downloadStub)
    }

    return HttpResponse.json({message: 'something went wrong'}, {status: 500})
  }),
)
