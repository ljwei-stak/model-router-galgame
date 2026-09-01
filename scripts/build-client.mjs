import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const CHECKOUT = resolve(ROOT, '../..')
const HARNESS = resolve(ROOT, '../DSH-Desktop')
const UI_PRIMITIVES = join(HARNESS, 'packages', 'client', 'ui-primitives', 'lib', 'index.js')
const ENTRY = '.dsh-plugin/client/index.mjs'
const OUTPUT = join(ROOT, '.dsh-plugin', 'client.js')
const PLUGIN_ID = 'model-router-galgame'

function resolveEsbuildBin() {
  // pnpm's Windows layout exposes the native binary as `esbuild` (without
  // the .exe suffix), while a standalone install may use `esbuild.exe`.
  const platformBinary = 'esbuild'
  const pnpmRoot = join(CHECKOUT, 'node_modules', '.pnpm')
  const pnpmCandidates = (() => {
    try {
      return readdirSync(pnpmRoot)
        .filter(name => name.startsWith('esbuild@'))
        .map(name => join(pnpmRoot, name, 'node_modules', 'esbuild', 'bin', platformBinary))
    } catch { return [] }
  })()
  const nativeCandidates = (() => {
    try {
      const prefix = '@esbuild+' + process.platform + '-' + process.arch + '@'
      return readdirSync(pnpmRoot)
        .filter(name => name.startsWith(prefix))
        .map(name => join(pnpmRoot, name, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary + (process.platform === 'win32' ? '.exe' : '')))
        .reverse()
    } catch { return [] }
  })()
  const candidates = [
    ...nativeCandidates,
    ...(() => {
      try {
        const prefix = '@esbuild+' + process.platform + '-' + process.arch + '@'
        return readdirSync(join(HARNESS, 'node_modules', '.pnpm'))
          .filter(name => name.startsWith(prefix))
          .map(name => join(HARNESS, 'node_modules', '.pnpm', name, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary + (process.platform === 'win32' ? '.exe' : '')))
          .reverse()
      } catch { return [] }
    })(),
    join(ROOT, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary),
    join(ROOT, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary + '.exe'),
    join(HARNESS, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary),
    join(HARNESS, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary + '.exe'),
    join(CHECKOUT, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary),
    join(CHECKOUT, 'node_modules', '@esbuild', `${process.platform}-${process.arch}`, platformBinary + '.exe'),
    join(ROOT, 'node_modules/.bin/esbuild'),
    join(HARNESS, 'node_modules/.bin/esbuild'),
    join(CHECKOUT, 'node_modules/.bin/esbuild'),
    ...pnpmCandidates,
    ...(() => {
      try {
        return readdirSync(join(HARNESS, 'node_modules', '.pnpm'))
          .filter(name => name.startsWith('esbuild@'))
          .map(name => join(HARNESS, 'node_modules', '.pnpm', name, 'node_modules', 'esbuild', 'bin', platformBinary))
      } catch { return [] }
    })(),
  ]
  for (const candidate of candidates) {
    try { if (statSync(candidate).isFile()) return candidate } catch { /* try next */ }
  }
  return null
}

export function generate({ check = false } = {}) {
  const esbuild = resolveEsbuildBin()
  if (esbuild === null) return { ok: true, skipped: 'esbuild 不可用' }
  const temp = mkdtempSync(join(tmpdir(), 'model-router-galgame-'))
  const tempOut = join(temp, 'client.js')
  const args = [
    ENTRY, '--bundle', '--format=cjs', '--platform=browser', '--target=es2020',
    '--external:react', '--jsx=transform', '--jsx-factory=React.createElement',
    '--jsx-fragment=React.Fragment', '--loader:.png=dataurl', '--loader:.woff2=dataurl', '--loader:.woff=dataurl', '--loader:.ttf=dataurl',
    '--outfile=' + tempOut,
  ]
  try {
    if (statSync(UI_PRIMITIVES).isFile()) {
      args.splice(args.length - 1, 0, '--alias:@deepseek-ai/dsh-client-ui-primitives=' + UI_PRIMITIVES)
    }
  } catch { /* package may be provided through normal node resolution */ }
  const result = spawnSync(esbuild, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) return { ok: false, errors: ['esbuild 失败（exit ' + String(result.status) + '）：' + String(result.error?.message ?? '')] }
  const body = readFileSync(tempOut, 'utf8')
  let bundledCss = ''
  try { bundledCss = readFileSync(tempOut.replace(/\.js$/, '.css'), 'utf8') } catch { /* CSS is optional */ }
  const code = Buffer.from(
    'window.__ModuleLoader__.load({\n'
    + '\tid: ' + JSON.stringify(PLUGIN_ID) + ',\n'
    + '\tfactory: (require) => {\n'
    + '\t\tvar module = { exports: {} };\n'
    + '\t\tvar exports = module.exports;\n'
    + (bundledCss === '' ? '' : '\t\t{ if (typeof document !== "undefined" && document.querySelector("style[data-model-router-markdown]") === null) { const markdownStyleEl = document.createElement("style"); markdownStyleEl.setAttribute("data-model-router-markdown", ""); markdownStyleEl.textContent = ' + JSON.stringify(bundledCss) + '; document.head.append(markdownStyleEl); } }\n')
    + body.replace(/\n$/, '')
    + '\n\t\treturn module.exports;\n'
    + '\t}\n'
    + '});\n',
  )
  if (!check) {
    writeFileSync(OUTPUT, code)
    return { ok: true }
  }
  let committed
  try { committed = readFileSync(OUTPUT) } catch { return { ok: false, errors: ['client.js 不存在'] } }
  return Buffer.compare(committed, code) === 0
    ? { ok: true }
    : { ok: false, errors: ['client.js 与源码不一致'] }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = generate({ check: process.argv.includes('--check') })
  if (result.skipped) console.log('[build-client] SKIP：' + result.skipped)
  if (!result.ok) { for (const error of result.errors ?? []) console.error('[build-client] ' + error); process.exit(1) }
  else if (!result.skipped) console.log(process.argv.includes('--check') ? '[build-client] OK' : '[build-client] client.js 已生成')
}
