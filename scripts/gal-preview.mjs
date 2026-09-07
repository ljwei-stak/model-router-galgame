import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const MAX_REQUEST_BYTES = 1024 * 1024
const MAX_RESPONSE_BYTES = 1024 * 1024
const DEFAULT_TIMEOUT_MS = 180_000

class PreviewError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export function normalizeConfiguration(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PreviewError('模型配置格式不正确')
  const baseUrl = typeof value.baseUrl === 'string' ? value.baseUrl.trim() : ''
  const model = typeof value.model === 'string' ? value.model.trim() : ''
  const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : ''
  if (!baseUrl || !model) throw new PreviewError('请填写 API 地址和模型名称')
  if (baseUrl.length > 2048 || model.length > 200 || apiKey.length > 16384 || /[\r\n]/.test(model + apiKey)) {
    throw new PreviewError('模型配置长度或格式不正确')
  }
  let url
  try { url = new URL(baseUrl) } catch { throw new PreviewError('API 地址不是有效的 URL') }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new PreviewError('远程 API 必须使用 HTTPS；本机 API 可以使用 HTTP')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new PreviewError('请在 API 密钥栏填写密钥，API 地址不能包含认证信息、查询参数或片段')
  }
  return { baseUrl: url.href.replace(/\/$/, ''), model, apiKey }
}

function textContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text).join('\n')
  return ''
}

async function readLimited(stream, maxBytes) {
  const chunks = []
  let bytes = 0
  for await (const chunk of stream) {
    const data = Buffer.from(chunk)
    bytes += data.length
    if (bytes > maxBytes) throw new PreviewError('请求或模型响应过大，请缩短内容后重试', 413)
    chunks.push(data)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function readRequest(request, signal) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    let size = 0
    const cleanup = () => {
      request.removeListener('data', onData)
      request.removeListener('end', onEnd)
      request.removeListener('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const onError = error => { cleanup(); reject(error) }
    const onAbort = () => { onError(signal.reason); request.resume() }
    const onData = chunk => {
      size += chunk.length
      if (size > MAX_REQUEST_BYTES) {
        onError(new PreviewError('请求过大', 413))
        request.resume()
      } else chunks.push(chunk)
    }
    const onEnd = () => { cleanup(); resolveBody(Buffer.concat(chunks).toString('utf8')) }
    request.on('data', onData)
    request.once('end', onEnd)
    request.once('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()
  })
}

export function createCompatibleGenerate(getConfiguration, { fetchImpl = fetch } = {}) {
  return async ({ system, messages = [], signal, maxTokens, temperature }) => {
    const configuration = getConfiguration()
    if (!configuration) throw new PreviewError('请先在模型设置中连接一个模型', 409)
    const endpoint = configuration.baseUrl.endsWith('/chat/completions')
      ? configuration.baseUrl
      : configuration.baseUrl + '/chat/completions'
    let response
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(configuration.apiKey ? { Authorization: 'Bearer ' + configuration.apiKey } : {}),
        },
        body: JSON.stringify({
          model: configuration.model,
          messages: [
            { role: 'system', content: textContent(system) },
            ...messages.filter(message => ['user', 'assistant', 'system'].includes(message.role)).map(message => ({ role: message.role, content: textContent(message.content) })),
          ],
          stream: false,
          max_tokens: Number.isFinite(maxTokens) ? Math.max(128, Math.min(8192, Math.round(maxTokens))) : 2048,
          temperature: Number.isFinite(temperature) ? Math.max(0, Math.min(2, temperature)) : 0.8,
        }),
        signal,
        redirect: 'error',
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new PreviewError('无法连接模型 API，请检查地址和网络', 502)
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new PreviewError(`模型 API 返回 HTTP ${response.status}，请检查地址、模型和密钥`, 502)
    }
    let completion
    try {
      completion = JSON.parse(await readLimited(response.body, MAX_RESPONSE_BYTES))
    } catch (error) {
      if (signal?.aborted || error instanceof PreviewError) throw error
      throw new PreviewError('模型 API 返回了无法解析的响应', 502)
    }
    const text = textContent(completion?.choices?.[0]?.message?.content)
    if (!text.trim()) throw new PreviewError('模型 API 没有返回文本，请确认模型支持聊天补全接口', 502)
    return text
  }
}

export async function buildPreviewBundle() {
  const { build } = await import('esbuild')
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: ['preview/main.jsx'],
    bundle: true,
    write: false,
    outfile: 'preview.js',
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'transform',
    define: { 'process.env.NODE_ENV': '"development"' },
    loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' },
    alias: {
      react: resolve(ROOT, 'node_modules/react'),
      'react-dom': resolve(ROOT, 'node_modules/react-dom'),
      ...(process.env.DSH_UI_PRIMITIVES_PATH ? { '@deepseek-ai/dsh-client-ui-primitives': resolve(process.env.DSH_UI_PRIMITIVES_PATH) } : {}),
    },
    logLevel: 'warning',
  })
  const script = result.outputFiles.find(file => file.path.endsWith('.js'))
  const css = result.outputFiles.find(file => file.path.endsWith('.css'))
  const styles = css ? `const galMarkdownStyles = document.createElement('style'); galMarkdownStyles.textContent = ${JSON.stringify(css.text)}; document.head.append(galMarkdownStyles);\n` : ''
  return Buffer.from(styles + script.text)
}

export async function createPreviewServer({
  configuration,
  bundle = Buffer.from(''),
  html,
  fetchImpl,
  serviceFactory,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  let currentConfiguration = configuration ? normalizeConfiguration(configuration) : null
  let activeTurns = 0
  const factory = serviceFactory ?? (await import('../.dsh-plugin/shared/gal-game-service.mjs')).createGalGameService
  const service = factory({ generate: createCompatibleGenerate(() => currentConfiguration, { fetchImpl }) })
  const page = html ?? await readFile(resolve(ROOT, 'preview/index.html'))
  const catalog = () => ({
    available: Boolean(currentConfiguration),
    configured: Boolean(currentConfiguration),
    baseUrl: currentConfiguration?.baseUrl ?? '',
    model: currentConfiguration?.model ?? '',
    models: currentConfiguration ? [{ provider: 'preview', model: currentConfiguration.model, label: currentConfiguration.model }] : [],
  })

  function reply(response, status, value, type = 'application/json; charset=utf-8') {
    if (response.destroyed || response.writableEnded) return
    response.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    })
    response.end(type.startsWith('application/json') ? JSON.stringify(value) : value)
  }

  const server = createServer(async (request, response) => {
    const port = server.address()?.port
    const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`]
    if (!allowedHosts.includes(request.headers.host) || (request.headers.origin && !allowedHosts.map(host => `http://${host}`).includes(request.headers.origin)) || request.headers['sec-fetch-site'] === 'cross-site') {
      reply(response, 403, { error: '仅允许从本地预览页面访问' })
      return
    }
    const path = request.url
    if (request.method === 'GET' && path === '/') return reply(response, 200, page, 'text/html; charset=utf-8')
    if (request.method === 'GET' && path === '/preview.js') return reply(response, 200, bundle, 'text/javascript; charset=utf-8')
    if (request.method === 'GET' && path === '/api/catalog') return reply(response, 200, catalog())
    if (request.method !== 'POST' || !['/api/configure', '/api/turn'].includes(path)) return reply(response, 404, { error: '页面不存在' })
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) return reply(response, 415, { error: '请求必须使用 JSON 格式' })
    if (Number(request.headers['content-length']) > MAX_REQUEST_BYTES) return reply(response, 413, { error: '请求过大' })
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort(new Error('preview request timeout'))
      reply(response, 504, { error: '模型响应超时，请稍后重试' })
    }, timeoutMs)
    const disconnected = () => {
      if (!response.writableEnded) controller.abort(new Error('preview client disconnected'))
    }
    request.once('aborted', disconnected)
    response.once('close', disconnected)
    try {
      let payload
      try { payload = JSON.parse(await readRequest(request, controller.signal)) } catch (error) {
        if (error instanceof PreviewError) throw error
        throw new PreviewError('请求不是有效的 JSON')
      }
      if (controller.signal.aborted) return
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new PreviewError('请求格式不正确')
      if (path === '/api/configure') {
        if (activeTurns) throw new PreviewError('请等待当前对话完成后再更换模型', 409)
        currentConfiguration = normalizeConfiguration(payload)
        reply(response, 200, catalog())
      } else {
        if (!currentConfiguration) throw new PreviewError('请先在模型设置中连接一个模型', 409)
        activeTurns += 1
        try {
          const result = await service.turn(payload, { signal: controller.signal })
          if (!controller.signal.aborted) reply(response, 200, result)
        } finally { activeTurns -= 1 }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const knownFailure = typeof error?.code === 'string' && error.code.startsWith('gal/')
        reply(response, error instanceof PreviewError ? error.status : 400, {
          error: error instanceof PreviewError || knownFailure ? error.message : '剧情生成或关系判定未完成，本轮未保存。请重试或检查模型设置。',
        })
      }
    } finally {
      clearTimeout(timeout)
      request.removeListener('aborted', disconnected)
      response.removeListener('close', disconnected)
    }
  })
  server.requestTimeout = timeoutMs + 5_000
  server.headersTimeout = Math.min(15_000, server.requestTimeout)
  server.keepAliveTimeout = 5_000
  return {
    server,
    async listen(port = 0) {
      await new Promise((resolveListen, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => {
          server.removeListener('error', reject)
          resolveListen()
        })
      })
      return `http://127.0.0.1:${server.address().port}`
    },
    async close() {
      server.closeAllConnections()
      await new Promise(resolveClose => server.close(resolveClose))
    },
  }
}

async function main() {
  const portIndex = process.argv.indexOf('--port')
  const port = Number(portIndex === -1 ? process.env.GAL_PREVIEW_PORT ?? 0 : process.argv[portIndex + 1])
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('预览端口必须是 0 到 65535 之间的整数')
  const configured = process.env.GAL_MODEL || process.env.GAL_BASE_URL || process.env.GAL_API_KEY
  const configuration = configured ? {
    baseUrl: process.env.GAL_BASE_URL,
    model: process.env.GAL_MODEL,
    apiKey: process.env.GAL_API_KEY,
  } : undefined
  const preview = await createPreviewServer({ configuration, bundle: await buildPreviewBundle() })
  const url = await preview.listen(port)
  console.log(`[gal-preview] ${url}`)
  const stop = async () => { await preview.close(); process.exit(0) }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error('[gal-preview] ' + (error instanceof PreviewError ? error.message : '本地预览启动失败，请检查依赖、端口与源文件'))
    process.exitCode = 1
  })
}
