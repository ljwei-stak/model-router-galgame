/** Flatten exact Host model capabilities without inventing effort ids. */
export function catalogRoutes(groups) {
  const flattened = []
  for (const group of Array.isArray(groups) ? groups : []) {
    for (const model of group.models ?? []) {
      const reasoning = model.reasoning
      flattened.push({
        provider: group.id,
        model: model.id,
        reasoningKnown: true,
        reasoningEfforts: Array.isArray(reasoning?.efforts) ? reasoning.efforts.map(effort => effort.id) : [],
        ...(reasoning?.defaultEffort === undefined ? {} : { defaultReasoningEffort: reasoning.defaultEffort }),
      })
    }
  }
  return flattened
}

/** Flatten the Host model catalog into the GAL view's compact router state. */
export function catalogSnapshot(catalog, previous = {}) {
  const value = catalog ?? {}
  const loadedGroups = Array.isArray(value.groups) ? value.groups : []
  const groups = loadedGroups.length > 0 ? loadedGroups : (previous.groups ?? [])
  const flattened = catalogRoutes(groups)
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
