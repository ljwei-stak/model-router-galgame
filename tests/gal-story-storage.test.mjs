import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createStory, currentStoryNode, advanceStory } from '../.dsh-plugin/shared/gal-story.mjs'
import { readStory, readStorySlots, writeStory, storyStorageKey, STORY_STORAGE_KEY } from '../.dsh-plugin/client/gal-story-storage.mjs'

const memoryStorage = () => {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
const legacySaves = JSON.parse(readFileSync(new URL('./fixtures/gal-story-v1-saves.json', import.meta.url), 'utf8')).saves

test('story saves resume the authored path without changing free-mode or editor data', () => {
  const storage = memoryStorage()
  storage.setItem('model-router:gal-game:v1', 'existing-free-game')
  storage.setItem('gal-view:scene:v1', 'existing-editor-scene')
  const first = createStory()
  const node = currentStoryNode(first)
  const next = advanceStory(first, node.choices?.[0]?.id ?? null)
  assert.notEqual(next.nodeId, first.nodeId)
  writeStory(storage, STORY_STORAGE_KEY, next)
  assert.deepEqual(readStory(storage), next)
  assert.equal(storage.getItem('model-router:gal-game:v1'), 'existing-free-game')
  assert.equal(storage.getItem('gal-view:scene:v1'), 'existing-editor-scene')
  assert.equal(storyStorageKey('model-router:gal-game:v1'), STORY_STORAGE_KEY)
  assert.equal(storyStorageKey('preview'), 'preview:story')
})

test('corrupt story autosave is preserved and malformed manual slots do not erase valid slots', () => {
  const storage = memoryStorage()
  storage.setItem(STORY_STORAGE_KEY, '{broken')
  assert.throws(() => readStory(storage), /原存档已保留/)
  assert.equal(storage.getItem(STORY_STORAGE_KEY), '{broken')
  storage.setItem(`${STORY_STORAGE_KEY}:slots`, JSON.stringify([{ state: createStory(), savedAt: '2026-09-07' }, { state: { invalid: true } }]))
  const slots = readStorySlots(storage)
  assert.equal(slots[0].state.nodeId, createStory().nodeId)
  assert.equal(slots[1].invalid, true)
  assert.equal(slots[2], null)
  assert.throws(() => writeStory(null, STORY_STORAGE_KEY, createStory()), /存储不可用/)
})

test('previous 200-node autosaves and manual slots remain readable and can be saved again', () => {
  const storage = memoryStorage()
  storage.setItem('model-router:gal-game:v1', 'existing-free-game')
  storage.setItem('gal-view:scene:v1', 'existing-editor-scene')
  const oldSlots = Object.values(legacySaves).map(state => ({ state, savedAt: '2026-09-07T00:00:00.000Z' }))
  storage.setItem(`${STORY_STORAGE_KEY}:slots`, JSON.stringify(oldSlots))
  for (const [index, [label, original]] of Object.entries(legacySaves).entries()) {
    storage.setItem(STORY_STORAGE_KEY, JSON.stringify(original))
    const restored = readStory(storage)
    assert.equal(restored.nodeId, original.nodeId, `${label} legacy autosave moved to another line`)
    assert.deepEqual(readStorySlots(storage)[index].state, restored)
    const node = currentStoryNode(restored)
    const continued = node.ending ? restored : advanceStory(restored, node.choices?.[0]?.id ?? null)
    writeStory(storage, STORY_STORAGE_KEY, continued)
    assert.deepEqual(readStory(storage), continued, `${label} legacy save cannot be written and reloaded`)
    if (label === 'complete') assert.equal(currentStoryNode(readStory(storage)).ending.id, 'romance')
  }
  assert.equal(storage.getItem(`${STORY_STORAGE_KEY}:slots`), JSON.stringify(oldSlots), 'reading legacy slots modified the originals')
  assert.equal(storage.getItem('model-router:gal-game:v1'), 'existing-free-game')
  assert.equal(storage.getItem('gal-view:scene:v1'), 'existing-editor-scene')
})
