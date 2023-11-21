import {expect, test} from '@oclif/test'
import {HttpResponse, http} from 'msw'
import {setupServer} from 'msw/node'
import * as fs from 'node:fs'
import * as path from 'node:path'

import type {JsonObj} from '../../src/result.js'

const expectedFileName = 'prefab.test.588.config.json'

const savedContent = () => JSON.parse(fs.readFileSync(expectedFileName).toString())

const downloadStub: JsonObj = {
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

const environmentResponse = {
  envs: [
    {id: 588, name: 'test'},
    {id: 143, name: 'Production'},
  ],
  projectId: 124,
}

const server = setupServer(
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

describe('download', () => {
  before(() => {
    fs.rmSync(expectedFileName, {force: true})
    server.listen()
  })
  afterEach(() => server.resetHandlers())
  after(() => server.close())

  describe('when the download server responds successfully', () => {
    test
      .stdout()
      .command(['download', '--environment=test'])
      .it('saves the file and returns a success message', (ctx) => {
        expect(ctx.stdout).to.eql(`Successfully downloaded ${expectedFileName}\n`)
        expect(savedContent()).to.eql(downloadStub)
      })

    test
      .stdout()
      .command(['download', '--environment=test', '--json'])
      .it('saves the file and returns JSON', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          filePath: path.join(process.cwd(), expectedFileName),
          succes: true,
        })

        expect(savedContent()).to.eql(downloadStub)
      })
  })

  describe('when the download server does not respond successfully', () => {
    test
      .stderr()
      .command(['download', '--environment=Production'])
      .catch(/Failed to download file. Status=500/)
      .it('saves the file and returns a success message')

    test
      .stdout()
      .command(['download', '--environment=Production', '--json'])
      .it('saves the file and returns JSON', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          error: {
            message: 'something went wrong',
          },
        })
      })
  })

  describe('when the provided environment is invalid', () => {
    test
      .stderr()
      .command(['download', '--environment=this.does.not.exist'])
      .catch(/Environment `this.does.not.exist` not found. Valid environments: test, Production/)
      .it('saves the file and returns a success message')

    test
      .stdout()
      .command(['download', '--environment=this.does.not.exist', '--json'])
      .it('saves the file and returns JSON', (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          error: 'Environment `this.does.not.exist` not found. Valid environments: test, Production',
        })
      })
  })
})
