import test from 'node:test'
import assert from 'node:assert/strict'
import { readArchives, upsertArchive } from '../.dsh-plugin/client/archives.mjs'

function storage() {
  const map = new Map()
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }
}

test('stores one GAL save per Harness session and updates it in place', () => {
  const db = storage()
  upsertArchive(db, { sessionId: 's1', title: '第一问', mode: 'collective', updatedAt: 1, createdAt: 1 })
  upsertArchive(db, { sessionId: 's2', title: '第二问', mode: 'single', updatedAt: 2, createdAt: 2 })
  upsertArchive(db, { sessionId: 's1', title: '继续第一问', mode: 'collective', updatedAt: 3, createdAt: 1 })
  assert.deepEqual(readArchives(db).map(item => [item.sessionId, item.title]), [['s1', '继续第一问'], ['s2', '第二问']])
})
