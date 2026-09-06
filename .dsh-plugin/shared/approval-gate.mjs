/**
 * Compatibility bridge for dsh-approval-gate.
 *
 * The approval-gate package owns the approval waterfall, Flash judgement,
 * learning, audit files, snapshots and UI. This module only produces a small,
 * deterministic safety context for the current Model Router work package.
 * Keeping the bridge stateless makes it safe when the gate is installed by
 * another profile layer as well as when it is bundled by this plugin.
 */

export const APPROVAL_GATE_PACKAGE = '@ljwei-stak/dsh-approval-gate'
export const APPROVAL_GATE_VERSION = '0.5.3'

const ESCALATION_RE = /escalate\s+sandbox\s+to\s+([^\s:]+):?\s*([\s\S]*)/i

function clean(value, max = 240) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

function stageFor(state, step) {
  const plan = state?.plan
  const tasks = Array.isArray(plan?.subtasks) ? plan.subtasks : []
  if (tasks.length === 0) return null
  const index = Math.max(0, Number(step || state?.lastStep || 1) - 1)
  return tasks[index] ?? tasks[tasks.length - 1] ?? null
}

/**
 * Return the router safety facts that are relevant to an approval request.
 * `bulk` is a candidate supplied as context; dsh-approval-gate still performs
 * the authoritative category decision and fail-safe human handoff.
 */
export function approvalSafetyContext(state, step) {
  const plan = state?.plan
  const tasks = Array.isArray(plan?.subtasks) ? plan.subtasks : []
  const stage = stageFor(state, step)
  const collective = state?.mode === 'collective'
  const multiTask = collective && plan?.complexity?.band === 'complex' && tasks.length >= 3
  return {
    mode: state?.mode ?? 'collective',
    complexity: plan?.complexity?.band ?? 'unknown',
    stage: stage?.id ?? null,
    stagePurpose: stage?.purpose ?? null,
    stageType: stage?.type ?? null,
    stageIndex: tasks.length === 0 ? 0 : Math.max(1, Number(step || state?.lastStep || 1)),
    stageCount: tasks.length,
    multiTask,
    candidateCategory: multiTask ? 'bulk' : 'neutral',
    selectedRoute: plan?.selected?.provider && plan?.selected?.model
      ? `${plan.selected.provider}/${plan.selected.model}`
      : null,
    activeRoute: state?.lastTarget?.provider && state?.lastTarget?.model
      ? `${state.lastTarget.provider}/${state.lastTarget.model}`
      : null,
  }
}

/**
 * Decorate the justification consumed by dsh-approval-gate. The original
 * escalation prefix remains intact, so the target plugin can parse it. The
 * marker is deliberately plain text because the target plugin's Flash model
 * judges only the justification string.
 */
export function decorateApprovalReason(reason, context) {
  const raw = String(reason ?? '')
  const match = raw.match(ESCALATION_RE)
  if (!match || context === null || context === undefined) return raw
  const mode = clean(match[1], 64)
  const justification = clean(match[2], 500)
  const stage = context.stage ? `${context.stage} ${context.stageIndex}/${context.stageCount}` : 'unknown'
  const route = context.activeRoute || context.selectedRoute || 'unassigned'
  const marker = [
    '[model-router safety context]',
    `mode=${context.mode}`,
    `complexity=${context.complexity}`,
    `stage=${stage}`,
    `purpose=${context.stagePurpose || 'unknown'}`,
    `route=${route}`,
    `task_count=${context.stageCount || 0}`,
    `risk_candidate=${context.candidateCategory}`,
    context.multiTask ? 'multi_task_review=required' : 'multi_task_review=not_applicable',
  ].join('; ')
  return `escalate sandbox to ${mode}: ${justification || 'router stage requires sandbox escalation'} ${marker}`.trim()
}

export function isApprovalGateReason(reason) {
  return ESCALATION_RE.test(String(reason ?? ''))
}

export function approvalGateStatus(ctx) {
  let approval = false
  let permissionPresets = false
  try {
    approval = Boolean(ctx?.get?.('approval'))
    permissionPresets = Boolean(ctx?.get?.('permissionPresets'))
  } catch {
    approval = false
    permissionPresets = false
  }
  return {
    package: APPROVAL_GATE_PACKAGE,
    version: APPROVAL_GATE_VERSION,
    bundled: true,
    approvalServiceDetected: approval,
    permissionPresetsDetected: permissionPresets,
    policy: 'hard-risk-human-review',
  }
}

