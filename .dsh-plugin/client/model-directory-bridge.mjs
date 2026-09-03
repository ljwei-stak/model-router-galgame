/** Flatten the Host model catalog into the GAL view's compact router state. */
export function catalogSnapshot(catalog, previous = {}) {
  const value = catalog ?? {}
  const loadedGroups = Array.isArray(value.groups) ? value.groups : []
  const groups = loadedGroups.length > 0 ? loadedGroups : (previous.groups ?? [])
  const flattened = []
  for (const group of groups) {
    for (const model of group.models ?? []) {
      flattened.push({ provider: group.id, model: model.id })
    }
  }
  return {
    available: flattened.length > 0 ? flattened : (previous.available ?? []),
    groups,
    current: value.default ?? previous.current ?? null,
  }
}

/** Select a model through the same Host Remote used by Harness' native picker. */
export async function selectModelThroughRemote(remote, sessionId, selection) {
  if (typeof remote?.session?.selectModel !== 'function') return false
  const response = await remote.session.selectModel({
    sessionId,
    provider: selection.provider,
    model: selection.model,
    ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
  })
  return response?.ok === true
}
