import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { resolveDshHome } from './liangshen-compat.mjs'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const ROUTER_PLUGIN = 'model-router-galgame'
const ALLOWED_FORMS = new Set(['instructions', 'catalog', 'snapshot', 'notice', 'relay', 'recall'])
const LEGACY_FORMS = new Set(['persona', 'web-capability'])
const LEGACY_INSTRUCTION_SUMMARIES = new Set([
  '\u8054\u7f51\u4e0e\u53ef\u89c1\u6d4f\u89c8\u5668\u7b56\u7565',
  '\u6700\u7ec8\u7b54\u590d\u8868\u8fbe\u5c42',
])

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function splitFrames(compressed) {
  const offsets = []
  for (let offset = 0; offset < compressed.length;) {
    offset = compressed.indexOf(ZSTD_MAGIC, offset)
    if (offset < 0) break
    offsets.push(offset)
    offset += ZSTD_MAGIC.length
  }
  if (offsets.length === 0 || offsets[0] !== 0) throw new Error('not a concatenated Zstandard stream')
  return offsets.map((offset, index) => compressed.subarray(offset, offsets[index + 1] ?? compressed.length))
}

function linesWithEndings(text) {
  return text.match(/[^\n]*(?:\n|$)/g)?.filter(Boolean) ?? []
}

function parseLine(part) {
  const ending = part.endsWith('\r\n') ? '\r\n' : part.endsWith('\n') ? '\n' : ''
  const body = ending === '' ? part : part.slice(0, -ending.length)
  return { ending, event: body === '' ? null : JSON.parse(body) }
}

function isValidSource(source) {
  return ALLOWED_FORMS.has(source.form)
    && (source.summary === undefined || source.form === 'notice')
    && (source.sections === undefined || source.form === 'snapshot')
}

function classifySource(source) {
  if (source?.kind !== 'plugin' || source.plugin !== ROUTER_PLUGIN || isValidSource(source)) return 'current'
  const knownLegacy = LEGACY_FORMS.has(source.form)
    || (source.form === 'instructions' && LEGACY_INSTRUCTION_SUMMARIES.has(source.summary))
  if (!knownLegacy || source.sections !== undefined) return 'unsupported'
  return 'repair'
}

function collectSources(value, path = '$', sources = [], seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return sources
  seen.add(value)
  if (value.kind === 'plugin' && value.plugin === ROUTER_PLUGIN) sources.push({ path, source: value })
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSources(item, `${path}[${index}]`, sources, seen))
  } else {
    Object.entries(value).forEach(([key, item]) => collectSources(item, `${path}.${key}`, sources, seen))
  }
  return sources
}

function findSessions(root) {
  const sessions = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) pending.push(entryPath)
      else if (entry.isFile() && entry.name === 'session.jsonl.zstd') sessions.push(entryPath)
    }
  }
  return sessions.sort()
}

function inspectSession(sessionPath) {
  const compressed = readFileSync(sessionPath)
  const frames = splitFrames(compressed)
  const frameTexts = frames.map(frame => zstdDecompressSync(frame).toString('utf8'))
  const parsedFrames = frameTexts.map(frameText => linesWithEndings(frameText).map(parseLine))
  const repairs = []
  const unsupported = []
  parsedFrames.forEach((records, frameIndex) => records.forEach(({ event }, recordIndex) => {
    for (const match of collectSources(event)) {
      const kind = classifySource(match.source)
      const detail = {
        frame: frameIndex + 1,
        record: recordIndex + 1,
        path: match.path,
        form: match.source.form,
        summary: match.source.summary,
      }
      if (kind === 'repair') repairs.push({ ...detail, source: match.source })
      else if (kind === 'unsupported') unsupported.push(detail)
    }
  }))
  return { sessionPath, compressed, frames, parsedFrames, repairs, unsupported }
}

function backupDestination(backupRoot, sessionPath) {
  const sessionId = basename(dirname(sessionPath))
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  let destination = join(backupRoot, `${sessionId}-${stamp}`)
  let suffix = 1
  while (existsSync(destination)) {
    destination = join(backupRoot, `${sessionId}-${stamp}-${suffix}`)
    suffix += 1
  }
  mkdirSync(destination, { recursive: true })
  return destination
}

function migrateSession(inspection, backupRoot) {
  const { sessionPath, compressed, frames, parsedFrames, repairs } = inspection
  const beforeHash = sha256(compressed)
  const destination = backupDestination(backupRoot, sessionPath)
  const backupPath = join(destination, 'session.jsonl.zstd')
  copyFileSync(sessionPath, backupPath)
  if (sha256(readFileSync(backupPath)) !== beforeHash) throw new Error('session backup verification failed')

  repairs.forEach(({ source }) => { source.form = 'notice' })
  const updatedFrameTexts = parsedFrames.map(records => records.map(({ ending, event }) => (
    event === null ? ending : `${JSON.stringify(event)}${ending}`
  )).join(''))
  const updated = Buffer.concat(updatedFrameTexts.map(text => zstdCompressSync(Buffer.from(text))))
  const tempPath = `${sessionPath}.model-router-${process.pid}.tmp`
  try {
    writeFileSync(tempPath, updated, { flag: 'wx' })
    const verified = splitFrames(readFileSync(tempPath)).map(frame => zstdDecompressSync(frame).toString('utf8'))
    if (verified.length !== frames.length || verified.join('') !== updatedFrameTexts.join('')) {
      throw new Error('migrated session verification failed')
    }
    if (sha256(readFileSync(sessionPath)) !== beforeHash) throw new Error('session changed during migration')
    renameSync(tempPath, sessionPath)
  } finally {
    if (existsSync(tempPath)) rmSync(tempPath)
  }

  const manifest = {
    migratedAt: new Date().toISOString(),
    sessionPath,
    backupPath,
    originalSha256: beforeHash,
    migratedSha256: sha256(readFileSync(sessionPath)),
    zstdFrames: frames.length,
    repairedRecords: repairs.map(({ source: _source, ...detail }) => detail),
  }
  writeFileSync(join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

export function repairRouterSessions(options = {}) {
  const root = options.dshHome ?? resolveDshHome(options.env, options.home, options.cwd)
  const sessionsRoot = join(root, 'sessions')
  const backupRoot = options.backupRoot ?? join(root, '.model-router-backups', 'session-compat-v0.4.27')
  if (!existsSync(sessionsRoot)) {
    return { kind: 'absent', sessionsRoot, scannedSessions: 0, migratedSessions: 0, repairedRecords: 0 }
  }
  if (!statSync(sessionsRoot).isDirectory()) {
    return { kind: 'unsupported', sessionsRoot, scannedSessions: 0, migratedSessions: 0, repairedRecords: 0 }
  }

  const migrated = []
  const unsupported = []
  const errors = []
  const sessionPaths = findSessions(sessionsRoot)
  for (const sessionPath of sessionPaths) {
    try {
      const inspection = inspectSession(sessionPath)
      if (inspection.unsupported.length > 0) {
        unsupported.push({ sessionPath, records: inspection.unsupported })
      } else if (inspection.repairs.length > 0) {
        migrated.push(migrateSession(inspection, backupRoot))
      }
    } catch (error) {
      errors.push({ sessionPath, message: error instanceof Error ? error.message : String(error) })
    }
  }
  const repairedRecords = migrated.reduce((total, item) => total + item.repairedRecords.length, 0)
  const kind = errors.length > 0 ? 'error'
    : unsupported.length > 0 ? 'unsupported'
      : migrated.length > 0 ? 'migrated'
        : 'current'
  return {
    kind,
    sessionsRoot,
    scannedSessions: sessionPaths.length,
    migratedSessions: migrated.length,
    repairedRecords,
    migrated,
    unsupported,
    errors,
  }
}

export function reportRouterSessionCompatibility(ctx, result) {
  if (result.migratedSessions > 0) {
    ctx.logger?.info?.(`model-router: repaired ${result.repairedRecords} legacy records in ${result.migratedSessions} session(s)`)
  }
  if (result.unsupported?.length > 0) {
    ctx.logger?.warn?.(`model-router: ${result.unsupported.length} session(s) contain unknown Router source formats and were left unchanged`)
  }
  if (result.errors?.length > 0) {
    ctx.logger?.warn?.(`model-router: ${result.errors.length} legacy session migration(s) failed and were left unchanged`)
  }
  return result
}
