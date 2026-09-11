/** Read the current agent's native Watcher projection without changing its session. */
export const WATCHER_PACKAGE = '@ljwei-stak/dsh-watcher-for-mrg'
export const WATCHER_VERSION = '0.4.0'
export const WATCHER_PROJECTION = 'watcherInsights'

export function watcherStatus(ctx, agent) {
  const status = {
    package: WATCHER_PACKAGE,
    version: WATCHER_VERSION,
    bundled: true,
    readOnly: true,
    projection: WATCHER_PROJECTION,
    sessionId: agent?.session?.id ?? null,
  }
  let projections
  try { projections = ctx.get?.('sessionProjections') ?? ctx.sessionProjections } catch {}
  if (typeof projections?.snapshot !== 'function') return { ...status, status: 'unavailable' }
  if (!agent?.session) return { ...status, status: 'no-session' }
  try {
    const snapshot = projections.snapshot(agent.session, [WATCHER_PROJECTION])
    const insights = snapshot?.values?.[WATCHER_PROJECTION]
    if (!insights) return { ...status, status: 'not-loaded' }
    if (insights.sessionId !== status.sessionId) return { ...status, status: 'session-mismatch' }
    return { ...status, status: 'ready', asOfSeq: snapshot.asOfSeq, insights: structuredClone(insights) }
  } catch (error) {
    ctx.logger?.warn?.(`model-router: Watcher projection failed: ${String(error)}`)
    return { ...status, status: 'error' }
  }
}
