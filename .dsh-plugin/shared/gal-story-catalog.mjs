import * as legacy from './gal-story.mjs'
import * as bridges from './gal-story-v2.mjs'

export const STORY_EPISODES = Object.freeze([
  Object.freeze({ id: 'bridges', title: '未写完的约定：千桥协议', label: '千桥协议', description: '第一阶段 · 序章、百模协会开放日、月桂审议、千桥之夜', chapters: bridges.STORY_CHAPTERS }),
  Object.freeze({ id: 'legacy', title: legacy.STORY_TITLE, label: '旧城迁移篇', description: '第一版完整故事 · 旧城迁移与 DeepSeek 的约定', chapters: [] }),
])
export const STORY_CHARACTERS = Object.freeze({ ...legacy.STORY_CHARACTERS, ...bridges.STORY_CHARACTERS })
export function getStoryEpisode(state) {
  return STORY_EPISODES.find(episode => episode.id === (state?.version === 2 ? 'bridges' : 'legacy'))
}
function engine(raw) {
  if (raw?.version === 2) return bridges
  if (raw?.version === 1) return legacy
  throw new Error('不支持的剧情存档版本。')
}
export function createStory(episodeId = 'bridges', options = {}) {
  if (episodeId === 'bridges') return bridges.createStory(options)
  if (episodeId === 'legacy') return legacy.createStory()
  throw new Error('这部剧目尚未开放。')
}
export const normalizeStory = raw => engine(raw).normalizeStory(raw)
export const currentStoryNode = raw => engine(raw).currentStoryNode(raw)
export const advanceStory = (raw, choiceId = null) => engine(raw).advanceStory(raw, choiceId)
export const storyHistory = raw => engine(raw).storyHistory(raw)
