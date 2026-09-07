import { createGame, normalizeGame, GAME_VERSION } from '../shared/gal-game.mjs'

export const GAME_STORAGE_KEY = 'model-router:gal-game:v1'

export function readGame(storage, key = GAME_STORAGE_KEY) {
  const source = storage?.getItem(key)
  if (!source) return createGame({ id: globalThis.crypto?.randomUUID?.() })
  const raw = JSON.parse(source)
  if (raw?.version !== GAME_VERSION || raw?.characterId !== 'deepseek') throw new Error('存档版本不兼容，原存档已保留。')
  return normalizeGame(raw)
}

export function writeGame(storage, key, state) {
  if (!storage) throw new Error('浏览器存储不可用，当前进度尚未保存。')
  storage.setItem(key, JSON.stringify(state))
}

export function readSlots(storage, key) {
  const raw = JSON.parse(storage?.getItem(key + ':slots') || '[]')
  if (!Array.isArray(raw)) throw new Error('手动存档无法读取。')
  return Array.from({ length: 3 }, (_, index) => {
    const slot = raw[index]
    if (!slot) return null
    if (slot.state?.version !== GAME_VERSION || slot.state?.characterId !== 'deepseek') return { invalid: true }
    return { savedAt: typeof slot.savedAt === 'string' ? slot.savedAt : '', state: normalizeGame(slot.state) }
  })
}
