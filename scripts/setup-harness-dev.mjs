import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const hostIndex = process.argv.indexOf('--host-node-modules')
const hostPath = hostIndex === -1 ? process.env.DSH_HOST_NODE_MODULES : process.argv[hostIndex + 1]
if (!hostPath) throw new Error('Provide --host-node-modules <installed Harness node_modules directory>')

const hostModules = realpathSync(resolve(hostPath))
const sourceScope = join(hostModules, '@deepseek-ai')
const destinationScope = join(ROOT, 'node_modules', '@deepseek-ai')
const hostCordis = JSON.parse(readFileSync(join(sourceScope, 'cordis', 'package.json'), 'utf8'))
if (hostCordis.name !== '@deepseek-ai/cordis') throw new Error('The supplied directory does not contain the Harness Cordis runtime')
mkdirSync(destinationScope, { recursive: true })

let linked = 0
let retained = 0
for (const entry of readdirSync(sourceScope, { withFileTypes: true })) {
  if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
  const destination = join(destinationScope, entry.name)
  try { lstatSync(destination); retained += 1; continue } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const source = realpathSync(join(sourceScope, entry.name))
  let manifest
  try { manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')) } catch { continue }
  if (manifest.name !== `@deepseek-ai/${entry.name}`) continue
  symlinkSync(source, destination, process.platform === 'win32' ? 'junction' : 'dir')
  linked += 1
}

console.log(`[setup-harness-dev] Linked ${linked} missing Harness packages; retained ${retained} existing packages.`)
console.log(`[setup-harness-dev] Host Cordis ${hostCordis.version}. Links exist only in the ignored node_modules directory.`)
