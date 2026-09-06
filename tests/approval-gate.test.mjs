import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../.dsh-plugin/index.mjs'
import {
  approvalGateStatus,
  approvalSafetyContext,
  decorateApprovalReason,
  isApprovalGateReason,
} from '../.dsh-plugin/shared/approval-gate.mjs'

function complexState(mode = 'collective') {
  return {
    mode,
    lastStep: 2,
    lastTarget: { provider: 'zen', model: 'Qwen3.7 Plus' },
    plan: {
      selected: { provider: 'zen', model: 'GPT 5.6 Sol' },
      complexity: { band: 'complex' },
      subtasks: [
        { id: 'analysis', type: 'reasoning', purpose: 'analysis' },
        { id: 'code', type: 'code', purpose: 'execution' },
        { id: 'synthesis', type: 'writing', purpose: 'synthesis' },
      ],
    },
  }
}

test('collective multi-task context is marked as a bulk-risk candidate', () => {
  const context = approvalSafetyContext(complexState(), 2)
  assert.equal(context.multiTask, true)
  assert.equal(context.candidateCategory, 'bulk')
  assert.equal(context.stage, 'code')
  assert.equal(context.stageIndex, 2)
  assert.equal(context.stageCount, 3)
})

test('single-session requests are never marked as bulk by the adapter', () => {
  const context = approvalSafetyContext(complexState('single'), 2)
  assert.equal(context.multiTask, false)
  assert.equal(context.candidateCategory, 'neutral')
})

test('approval reason keeps the target gate prefix and adds auditable router facts', () => {
  const reason = 'escalate sandbox to workspace-write: update the generated files'
  assert.equal(isApprovalGateReason(reason), true)
  const decorated = decorateApprovalReason(reason, approvalSafetyContext(complexState(), 2))
  assert.match(decorated, /^escalate sandbox to workspace-write:/)
  assert.match(decorated, /risk_candidate=bulk/)
  assert.match(decorated, /stage=code 2\/3/)
  assert.match(decorated, /route=zen\/Qwen3\.7 Plus/)
})

test('non-escalation reasons stay byte-for-byte unchanged', () => {
  const reason = 'ordinary approval request'
  assert.equal(isApprovalGateReason(reason), false)
  assert.equal(decorateApprovalReason(reason, approvalSafetyContext(complexState(), 2)), reason)
})

test('status reports host approval capabilities without requiring a private marker', () => {
  const status = approvalGateStatus({ get: () => undefined })
  assert.deepEqual(status, {
    package: '@ljwei-stak/dsh-approval-gate',
    version: '0.5.3',
    bundled: true,
    approvalServiceDetected: false,
    permissionPresetsDetected: false,
    policy: 'hard-risk-human-review',
  })
})

test('host approval waterfall receives the current collective stage context', async () => {
  const listeners = new Map()
  const routes = [
    { provider: 'zen', model: 'GPT 5.6 Sol' },
    { provider: 'zen', model: 'Qwen3.7 Plus' },
    { provider: 'zen', model: 'DeepSeek V4 Pro' },
  ]
  const settings = { describe: () => [{ ns: 'llm-pi-ai', user: {}, revision: 1 }], mutate: async () => undefined }
  const ctx = {
    get: key => key === 'settings' ? settings : undefined,
    settings,
    commands: { register: () => undefined },
    llm: {
      listProviders: () => [{ id: 'zen' }],
      listModels: async () => routes.map(route => ({ id: route.model })),
    },
    logger: { debug: () => undefined, info: () => undefined, warn: () => undefined },
    on: (event, callback) => { listeners.set(event, callback); return () => listeners.delete(event) },
  }
  apply(ctx)
  const agent = { inject: () => undefined }
  const user = {
    id: 'approval-adapter-user',
    role: 'user',
    content: [{ type: 'text', text: '请设计架构、编写代码、测试、部署并给出研究说明' }],
    source: { kind: 'user' },
  }
  await listeners.get('agent/pre-step')({
    agent,
    messages: [user],
    signal: new AbortController().signal,
    turn: 1,
    step: 1,
  }, async () => ({ kind: 'enter', messages: [] }))
  const request = { agent, reason: 'escalate sandbox to workspace-write: write the generated files' }
  await listeners.get('approval/request')(request, async () => 'unavailable')
  assert.match(request.reason, /model-router safety context/)
  assert.match(request.reason, /risk_candidate=bulk/)
})

