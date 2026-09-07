import { spawn } from 'node:child_process'
import { openSync, closeSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
function argument(name) { const at = process.argv.indexOf(name); return at < 0 ? undefined : process.argv[at + 1] }
const hostModules = argument('--host-node-modules') || process.env.DSH_HOST_NODE_MODULES
if (!hostModules) throw new Error('Provide --host-node-modules <Harness node_modules>')
const cli = join(resolve(hostModules), '@deepseek-ai/dsh/lib/bin.js')
const env = { ...process.env, DSH_HOME: resolve(root, 'test-artifacts/dsh-host-home') }
const credentialsFile = argument('--model-credentials-file')
if (credentialsFile) {
  const require = createRequire(join(resolve(hostModules), 'yaml/package.json'))
  const { parse } = require('yaml')
  const document = parse(readFileSync(resolve(credentialsFile), 'utf8'))
  const key = document?.refs?.DEEPSEEK_API_KEY
  if (typeof key !== 'string' || !key.trim()) throw new Error('The selected Harness store has no DeepSeek API credential')
  env.DEEPSEEK_API_KEY = key
}
const stdout = openSync(resolve(root, 'test-artifacts/dsh-host2.log'), 'w')
const stderr = openSync(resolve(root, 'test-artifacts/dsh-host2-error.log'), 'w')
try {
  const child = spawn(process.execPath, [cli, '--profile', 'web', '--host', '127.0.0.1', '--port', argument('--port') || '0', '--no-open'], {
    cwd: root, env, detached: true, windowsHide: true, stdio: ['ignore', stdout, stderr],
  })
  child.unref()
  console.log(JSON.stringify({ processId: child.pid, modelCredentialInMemory: Boolean(credentialsFile), startupLog: 'test-artifacts/dsh-host2.log' }))
} finally { closeSync(stdout); closeSync(stderr) }
