import test from 'node:test'
import assert from 'node:assert/strict'
import { createStory, advanceStory, currentStoryNode, normalizeStory, getStoryEpisode, STORY_EPISODES } from '../.dsh-plugin/shared/gal-story-catalog.mjs'
import { readStory, writeStory, readStorySlots, episodeStorageKey, selectedStoryEpisode, STORY_STORAGE_KEY } from '../.dsh-plugin/client/gal-story-storage.mjs'

const memory = () => {
  const data = new Map()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

test('fresh readers enter the new story while existing legacy readers retain their exact position', () => {
  const storage = memory()
  assert.equal(selectedStoryEpisode(storage), 'bridges')
  const old = advanceStory(createStory('legacy'))
  writeStory(storage, STORY_STORAGE_KEY, old, 'legacy')
  assert.equal(selectedStoryEpisode(storage), 'legacy')
  assert.deepEqual(readStory(storage, STORY_STORAGE_KEY, 'legacy'), old)
  storage.setItem(`${STORY_STORAGE_KEY}:episode`, 'bridges')
  assert.equal(selectedStoryEpisode(storage), 'bridges')
  assert.equal(readStory(storage, STORY_STORAGE_KEY, 'legacy').nodeId, old.nodeId)
})

test('new and legacy autosaves, manual slots and other game data remain isolated', () => {
  const storage = memory()
  const oldKey = episodeStorageKey(STORY_STORAGE_KEY, 'legacy')
  const newKey = episodeStorageKey(STORY_STORAGE_KEY, 'bridges')
  const old = advanceStory(createStory('legacy'))
  const fresh = advanceStory(createStory('bridges'))
  storage.setItem('model-router:gal-game:v1', 'free-mode-data')
  storage.setItem('gal-view:scene:v1', 'editor-data')
  writeStory(storage, oldKey, old, 'legacy')
  writeStory(storage, newKey, fresh, 'bridges')
  storage.setItem(`${oldKey}:slots`, JSON.stringify([{ state: old }]))
  storage.setItem(`${newKey}:slots`, JSON.stringify([{ state: fresh }]))
  assert.deepEqual(readStory(storage, oldKey, 'legacy'), old)
  assert.deepEqual(readStory(storage, newKey, 'bridges'), fresh)
  assert.equal(readStorySlots(storage, oldKey, 'legacy')[0].state.version, 1)
  assert.equal(readStorySlots(storage, newKey, 'bridges')[0].state.version, 2)
  assert.throws(() => writeStory(storage, oldKey, fresh, 'legacy'), /另一部剧目/)
  assert.deepEqual(readStory(storage, oldKey, 'legacy'), old)
  assert.equal(storage.getItem('model-router:gal-game:v1'), 'free-mode-data')
  assert.equal(storage.getItem('gal-view:scene:v1'), 'editor-data')
})

test('corrupt new saves are preserved and cannot cause replacement of legacy data', () => {
  const storage = memory()
  const newKey = episodeStorageKey(STORY_STORAGE_KEY, 'bridges')
  writeStory(storage, STORY_STORAGE_KEY, createStory('legacy'), 'legacy')
  const original = storage.getItem(STORY_STORAGE_KEY)
  storage.setItem(newKey, '{broken')
  assert.throws(() => readStory(storage, newKey, 'bridges'), /原存档已保留/)
  assert.equal(storage.getItem(newKey), '{broken')
  assert.equal(storage.getItem(STORY_STORAGE_KEY), original)
  storage.setItem(`${newKey}:slots`, JSON.stringify([{ state: createStory('legacy') }, { state: createStory('bridges') }]))
  assert.equal(readStorySlots(storage, newKey, 'bridges')[0].invalid, true)
  assert.equal(readStorySlots(storage, newKey, 'bridges')[1].state.version, 2)
})

test('catalog dispatches all four chapter starts and validates imported versions', () => {
  const episode = STORY_EPISODES.find(item => item.id === 'bridges')
  assert.equal(episode.chapters.length, 4)
  for (const chapter of episode.chapters) {
    const state = createStory('bridges', { chapterId: chapter.id })
    assert.equal(currentStoryNode(state).id, chapter.startNodeId)
    assert.equal(getStoryEpisode(state).id, 'bridges')
    assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(state))), state)
  }
  assert.throws(() => normalizeStory({ version: 99 }), /不支持/)
  assert.throws(() => createStory('missing'), /尚未开放/)
  assert.throws(() => episodeStorageKey('base', 'missing'), /未知/)
})
