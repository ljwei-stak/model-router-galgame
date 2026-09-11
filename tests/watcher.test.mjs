import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../.dsh-plugin/index.mjs'
import { watcherStatus } from '../.dsh-plugin/shared/watcher.mjs'

test('Watcher reads only the current native session and detaches returned statistics', () => {
  const session = Object.freeze({ id: 'session-a' })
  const insights = { sessionId: session.id, totals: { calls: 2 }, models: [
    { provider: 'provider-a', model: 'shared-model', calls: 1 },
    { provider: 'provider-b', model: 'shared-model', calls: 1 },
  ] }
  const status = watcherStatus({ sessionProjections: {
    snapshot: (target, keys) => {
      assert.equal(target, session)
      assert.deepEqual(keys, ['watcherInsights'])
      return { asOfSeq: 12, values: { watcherInsights: insights } }
    },
  } }, { session })
  assert.equal(status.status, 'ready')
  assert.equal(status.readOnly, true)
  assert.deepEqual(status.insights, insights)
  status.insights.totals.calls = 99
  assert.equal(insights.totals.calls, 2)
})

test('Watcher distinguishes missing host service, session, and projection', () => {
  assert.equal(watcherStatus({}, {}).status, 'unavailable')
  const ctx = { sessionProjections: { snapshot: () => ({ values: {} }) } }
  assert.equal(watcherStatus(ctx, {}).status, 'no-session')
  assert.equal(watcherStatus(ctx, { session: { id: 's' } }).status, 'not-loaded')
})

test('Watcher never returns another session or a failed projection as valid data', () => {
  const session = { id: 'current' }
  const mismatch = watcherStatus({ sessionProjections: {
    snapshot: () => ({ values: { watcherInsights: { sessionId: 'other' } } }),
  } }, { session })
  assert.equal(mismatch.status, 'session-mismatch')
  assert.equal(mismatch.insights, undefined)
  const failed = watcherStatus({ sessionProjections: {
    snapshot: () => { throw new Error('invalid projection') },
  } }, { session })
  assert.equal(failed.status, 'error')
  assert.equal(failed.insights, undefined)
})

test('router watcher command exposes native insights without model or session writes', () => {
  let command
  const session = Object.freeze({ id: 'session-command' })
  const insights = { sessionId: session.id, totals: { calls: 1 },
    turn: { route: { provider: 'actual-provider', model: 'actual-model' } } }
  const settings = { describe: () => [{ ns: 'llm-pi-ai', user: {}, revision: 1 }] }
  apply({
    settings,
    sessionProjections: { snapshot: () => ({ asOfSeq: -1, values: { watcherInsights: insights } }) },
    commands: { register: value => { command = value } },
    on: () => () => {},
  })
  const result = command.handler({ agent: { session }, rawInput: 'watcher' })
  assert.equal(result.kind, 'success')
  const body = JSON.parse(result.text)
  assert.equal(body.status, 'ready')
  assert.equal(body.sessionId, session.id)
  assert.deepEqual(body.insights, insights)
  assert.equal(body.router.mode, 'collective')
  assert.deepEqual(body.router.lastRoute, insights.turn.route)
})
