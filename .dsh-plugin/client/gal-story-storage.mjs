import { createStory, normalizeStory } from '../shared/gal-story.mjs'

export const STORY_STORAGE_KEY = 'model-router:gal-story:v1'
export const storyStorageKey = freeKey => freeKey === 'model-router:gal-game:v1' ? STORY_STORAGE_KEY : `${freeKey}:story`

export function readStory(storage, key = STORY_STORAGE_KEY) {
  const source = storage?.getItem(key)
  if (!source) return createStory()
  try { return normalizeStory(JSON.parse(source)) }
  catch { throw new Error('剧情存档无法读取，原存档已保留。可导入备份或重新开始。') }
}

export function writeStory(storage, key, state) {
  if (!storage) throw new Error('浏览器存储不可用，请导出剧情存档。')
  storage.setItem(key, JSON.stringify(normalizeStory(state)))
}

export function readStorySlots(storage, key = STORY_STORAGE_KEY) {
  const raw = JSON.parse(storage?.getItem(`${key}:slots`) || '[]')
  if (!Array.isArray(raw)) throw new Error('剧情手动存档无法读取。')
  return Array.from({ length: 3 }, (_, index) => {
    const slot = raw[index]
    if (!slot) return null
    try { return { state: normalizeStory(slot.state), savedAt: typeof slot.savedAt === 'string' ? slot.savedAt : '' } }
    catch { return { invalid: true } }
  })
}
