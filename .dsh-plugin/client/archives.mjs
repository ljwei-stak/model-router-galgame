/** Durable GAL save index. The Harness owns the transcript; this small index
 * adds GAL-facing title/mode/route metadata without duplicating conversation data. */
export const ARCHIVE_STORAGE_KEY = 'model-router-galgame:archives:v1'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
export function normalizeArchive(raw) {
  if (!isRecord(raw) || typeof raw.sessionId !== 'string' || raw.sessionId === '') return null
  return {
    sessionId: raw.sessionId,
    title: typeof raw.title === 'string' && raw.title.trim() !== '' ? raw.title.trim() : '未命名存档',
    mode: raw.mode === 'single' ? 'single' : 'collective',
    model: typeof raw.model === 'string' ? raw.model : '',
    taskType: typeof raw.taskType === 'string' ? raw.taskType : '',
    complexity: typeof raw.complexity === 'number' && Number.isFinite(raw.complexity) ? raw.complexity : 0,
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
    createdAt: typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
  }
}

export function readArchives(storage) {
  if (storage === null || storage === undefined) return []
  try {
    const parsed = JSON.parse(storage.getItem(ARCHIVE_STORAGE_KEY) ?? '[]')
    return (Array.isArray(parsed) ? parsed : [])
      .map(normalizeArchive)
      .filter(value => value !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt)
  } catch {
    return []
  }
}

export function writeArchives(storage, archives) {
  if (storage === null || storage === undefined) return
  try {
    storage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archives.map(normalizeArchive).filter(value => value !== null).slice(0, 100)))
  } catch {
    // Private browsing/quota errors do not affect the live conversation.
  }
}

export function upsertArchive(storage, archive) {
  const normalized = normalizeArchive(archive)
  if (normalized === null) return readArchives(storage)
  const next = [normalized, ...readArchives(storage).filter(item => item.sessionId !== normalized.sessionId)]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 100)
  writeArchives(storage, next)
  return next
}
