import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import { createGame } from '../.dsh-plugin/shared/gal-game.mjs'
import { createPreviewServer, normalizeConfiguration } from '../scripts/gal-preview.mjs'

const SECRET = 'test-only-api-secret'
const playerText = '谢谢你等我，可以跟我说说你的想法。'
const requestBody = () => ({
  state: createGame(), text: playerText, requestId: 'preview-request-001',
  selection: { provider: 'preview', model: 'mock-model' },
})

async function fixture(t, responder, options = {}) {
  const calls = []
  const upstream = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const call = { headers: request.headers, path: request.url, body: JSON.parse(Buffer.concat(chunks).toString()) }
    calls.push(call)
    if (responder) return responder({ request, response, call, calls })
    const content = calls.length % 2 === 1 ? {
      affectionDelta: 2, trustDelta: 1, mood: '开心', reason: '玩家认真回应了她的顾虑。',
      evidenceQuote: playerText, eventId: null, eventResolved: false, consent: 'none', memory: null, boundary: 'none',
    } : { text: '嗯。我想先把这封信写完，你愿意听听吗？', narration: '她把信纸推近了一些。', emotion: 'happy' }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }))
  })
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const configuration = { baseUrl: `http://127.0.0.1:${upstream.address().port}/v1`, model: 'mock-model', apiKey: SECRET }
  const preview = await createPreviewServer({ configuration, ...options })
  const url = await preview.listen()
  t.after(async () => {
    await preview.close()
    upstream.closeAllConnections()
    await new Promise(resolve => upstream.close(resolve))
  })
  return { preview, upstream, calls, configuration, url }
}

function post(url, path, body, options = {}) {
  return fetch(url + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body), signal: options.signal,
  })
}

test('preview accepts HTTPS and explicit HTTP loopback APIs only', () => {
  for (const baseUrl of ['https://api.example.com/v1', 'http://127.0.0.1:1234/v1', 'http://localhost:1234/v1', 'http://[::1]:1234/v1']) {
    assert.equal(normalizeConfiguration({ baseUrl, model: 'test' }).baseUrl, baseUrl)
  }
  for (const baseUrl of ['http://api.example.com/v1', 'file:///tmp/model', 'https://secret@example.com/v1', 'https://example.com/v1?key=secret', 'https://example.com/v1#secret']) {
    assert.throws(() => normalizeConfiguration({ baseUrl, model: 'test' }))
  }
  assert.throws(() => normalizeConfiguration({ baseUrl: 'https://example.com/v1', model: 'test', apiKey: 'a\nb' }))
})

test('unconfigured preview serves its opening but cannot fabricate a turn', async t => {
  const { url, calls } = await fixture(t, null, { configuration: undefined })
  assert.equal((await fetch(url)).status, 200)
  const catalog = await (await fetch(url + '/api/catalog')).json()
  assert.equal(catalog.available, false)
  assert.equal(catalog.configured, false)
  assert.deepEqual(catalog.models, [])
  const response = await post(url, '/api/turn', requestBody())
  assert.equal(response.status, 409)
  assert.equal(calls.length, 0)
})

test('preview binds loopback and rejects foreign Host, Origin and fetch metadata', async t => {
  const { url, preview } = await fixture(t)
  assert.equal(preview.server.address().address, '127.0.0.1')
  for (const headers of [{ Host: 'attacker.example' }, { Origin: 'https://attacker.example' }, { Origin: 'null' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    const status = await new Promise((resolveStatus, reject) => {
      const request = httpRequest(url + '/api/catalog', { headers }, response => {
        response.resume()
        response.once('end', () => resolveStatus(response.statusCode))
      })
      request.on('error', reject)
      request.end()
    })
    assert.equal(status, 403, JSON.stringify(headers))
  }
  assert.equal((await fetch(url + '/api/catalog', { headers: { Origin: url } })).status, 200)
})

test('configuration returns catalog without exposing the API key', async t => {
  const { url, configuration } = await fixture(t, null, { configuration: undefined })
  const configured = await post(url, '/api/configure', configuration)
  assert.equal(configured.status, 200)
  const serialized = await configured.text()
  assert.equal(serialized.includes(SECRET), false)
  assert.equal(serialized.includes('apiKey'), false)
  const catalog = JSON.parse(serialized)
  assert.equal(catalog.available, true)
  assert.deepEqual(catalog.models, [{ provider: 'preview', model: 'mock-model', label: 'mock-model' }])
  assert.equal((await (await fetch(url + '/api/catalog')).text()).includes(SECRET), false)
})

test('real service evaluates then replies through the compatible HTTP gateway', async t => {
  const { url, calls } = await fixture(t)
  const input = requestBody()
  const response = await post(url, '/api/turn', input)
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(calls.length, 2)
  assert.equal(result.state.revision, input.state.revision + 1)
  assert.ok(result.state.affection > input.state.affection)
  assert.equal(result.reply.text, '嗯。我想先把这封信写完，你愿意听听吗？')
  for (const call of calls) {
    assert.equal(call.path, '/v1/chat/completions')
    assert.equal(call.headers.authorization, 'Bearer ' + SECRET)
    assert.equal(call.body.model, 'mock-model')
    assert.equal(call.body.stream, false)
    assert.equal(call.body.messages[0].role, 'system')
    assert.ok(call.body.messages.every(message => typeof message.content === 'string'))
  }
  assert.equal(calls[0].body.temperature, 0)
  assert.deepEqual(JSON.parse(calls[1].body.messages[1].content).evaluation, result.evaluation)
  assert.equal(JSON.stringify(result).includes(SECRET), false)
})

test('upstream errors are redacted and do not produce a game save', async t => {
  const { url, calls } = await fixture(t, ({ response }) => {
    response.writeHead(401, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ error: `incorrect api key: ${SECRET}` }))
  })
  const response = await post(url, '/api/turn', requestBody())
  assert.equal(response.status, 502)
  const error = await response.text()
  assert.match(error, /HTTP 401/)
  assert.equal(error.includes(SECRET), false)
  assert.equal(error.includes('"state"'), false)
  assert.equal(calls.length, 1)
})

test('timeout aborts the model request and does not submit late output', async t => {
  let upstreamClosed
  const closed = new Promise(resolve => { upstreamClosed = resolve })
  const { url } = await fixture(t, ({ response }) => {
    response.once('close', upstreamClosed)
  }, { timeoutMs: 100 })
  const response = await post(url, '/api/turn', requestBody())
  assert.equal(response.status, 504)
  assert.equal((await response.text()).includes('"state"'), false)
  await closed
})

test('API rejects non-JSON and oversized fixed or chunked requests', async t => {
  const { url } = await fixture(t)
  assert.equal((await fetch(url + '/api/configure', { method: 'POST', body: '{}' })).status, 415)
  const oversized = JSON.stringify({ data: 'x'.repeat(1024 * 1024) })
  assert.equal((await fetch(url + '/api/configure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: oversized })).status, 413)
  const status = await new Promise((resolveStatus, reject) => {
    const request = httpRequest(url + '/api/configure', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, response => {
      response.resume()
      response.once('end', () => resolveStatus(response.statusCode))
    })
    request.on('error', reject)
    request.write(oversized)
    request.end()
  })
  assert.equal(status, 413)
})
