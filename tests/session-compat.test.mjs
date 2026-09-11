import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib'
import { repairRouterSessions } from '../.dsh-plugin/shared/session-compat.mjs'

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

function packed(records) {
  return Buffer.concat(records.map(record => zstdCompressSync(Buffer.from(`${JSON.stringify(record)}\n`))))
}

function unpack(compressed) {
  const offsets = []
  for (let offset = 0; offset < compressed.length;) {
    offset = compressed.indexOf(MAGIC, offset)
    if (offset < 0) break
    offsets.push(offset)
    offset += MAGIC.length
  }
  return offsets.map((offset, index) => (
    zstdDecompressSync(compressed.subarray(offset, offsets[index + 1] ?? compressed.length)).toString('utf8')
  )).join('').trimEnd().split('\n').map(JSON.parse)
}

async function fixture(records) {
  const root = await mkdtemp(join(tmpdir(), 'model-router-session-'))
  const sessionDir = join(root, 'sessions', 'workspace', 'session-example')
  await mkdir(sessionDir, { recursive: true })
  const sessionPath = join(sessionDir, 'session.jsonl.zstd')
  await writeFile(sessionPath, packed(records))
  return { root, sessionPath }
}

test('repairs known Router records, verifies a backup, and is idempotent', async t => {
  const records = [
    { type: 'session', version: 0, id: 'session-example' },
    { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'model-router-galgame', form: 'persona', summary: 'final persona' } } },
    { type: 'user/message', data: { message: { source: { kind: 'plugin', plugin: 'model-router-galgame', form: 'web-capability', summary: 'web policy' } } } },
    { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'model-router-galgame', form: 'instructions', summary: '\u6700\u7ec8\u7b54\u590d\u8868\u8fbe\u5c42' } } },
  ]
  const { root, sessionPath } = await fixture(records)
  t.after(() => rm(root, { recursive: true, force: true }))
  const original = await readFile(sessionPath)

  const result = repairRouterSessions({ dshHome: root })
  assert.equal(result.kind, 'migrated')
  assert.equal(result.migratedSessions, 1)
  assert.equal(result.repairedRecords, 3)
  assert.deepEqual(unpack(await readFile(sessionPath)).slice(1).map(event => (
    event.data.source?.form ?? event.data.message.source.form
  )), ['notice', 'notice', 'notice'])
  assert.deepEqual(await readFile(result.migrated[0].backupPath), original)
  assert.equal(repairRouterSessions({ dshHome: root }).kind, 'current')
})

test('leaves a session byte-identical when an unknown Router format is present', async t => {
  const { root, sessionPath } = await fixture([
    { type: 'session', version: 0, id: 'session-example' },
    { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'model-router-galgame', form: 'persona' } } },
    { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'model-router-galgame', form: 'future-format' } } },
  ])
  t.after(() => rm(root, { recursive: true, force: true }))
  const original = await readFile(sessionPath)

  const result = repairRouterSessions({ dshHome: root })
  assert.equal(result.kind, 'unsupported')
  assert.equal(result.migratedSessions, 0)
  assert.deepEqual(await readFile(sessionPath), original)
  assert.equal(existsSync(join(root, '.model-router-backups')), false)
})

test('reports an absent session root without creating backup directories', async t => {
  const root = await mkdtemp(join(tmpdir(), 'model-router-session-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  assert.equal(repairRouterSessions({ dshHome: root }).kind, 'absent')
  assert.equal((await readdir(root)).length, 0)
})
