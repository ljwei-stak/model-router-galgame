/** Return the upstream provider encoded by an official ModLens wrapper id. */
export function modLensUpstream(provider) {
  const value = String(provider ?? '')
  if (value === 'deepseek-modlens') return 'deepseek-official'
  return value.startsWith('modlens-') ? value.slice('modlens-'.length) : null
}

/** Match the same image nesting handled by the official ModLens bridge. */
export function contentHasImage(content) {
  return Array.isArray(content) && content.some(block => block?.type === 'image'
    || (block?.type === 'tool-result' && contentHasImage(block.content)))
}

/** Route image-bearing collective calls through the official wrapper when needed. */
export function routeThroughModLens({ target, available, visionBridges, hasImageBlocks }) {
  if (!hasImageBlocks || target === null || target === undefined) return target
  const plannedRoute = available.find(route => route.provider === target.provider && route.model === target.model)
  if (plannedRoute?.inputModalities?.includes('image')) return target
  const bridge = visionBridges.find(route => route.upstream === target.provider && route.model === target.model)
  return bridge === undefined ? target : { ...target, provider: bridge.provider }
}
