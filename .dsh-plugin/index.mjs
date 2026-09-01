import {
  buildPlan,
  collaborationInstruction,
  collaborationStage,
  collectOpenCodeEndpointRepairs,
  DEFAULT_ROUTER_SETTINGS,
  MODEL_ROUTER_SETTINGS_NAMESPACE,
  nextCollaborationStage,
  textFromMessages,
} from './shared/router.mjs'
import { fetchLiveBenchSnapshot } from './shared/livebench.mjs'
import { buildPersonaPrompt, isPersonaPrompt } from './shared/persona.mjs'

let settingsRuntimePromise
let routerSettings = { ...DEFAULT_ROUTER_SETTINGS }
let routerSettingsReady = false
let routerSettingsPromise = Promise.resolve(false)

async function loadSettingsRuntime() {
  if (settingsRuntimePromise !== undefined) return settingsRuntimePromise
  settingsRuntimePromise = Promise.all([
    import('@deepseek-ai/schemastery').catch(() => import('../../../vendor/schemastery/lib/index.mjs')),
    import('@deepseek-ai/dsh-settings').catch(() => import('../../../packages/settings/settings/lib/index.js')),
  ]).then(([schemaModule, settingsModule]) => ({
    z: schemaModule.default ?? schemaModule,
    settingsNamespace: settingsModule.settingsNamespace,
  }))
  return settingsRuntimePromise
}

function routerSettingsSchema(z) {
  const price = z.object({
    input: z.number().min(0).default(0),
    output: z.number().min(0).default(0),
    cacheRead: z.number().min(0).default(0),
    cacheWrite: z.number().min(0).default(0),
    currency: z.string().default('USD'),
  })
  return z.object({
    pricing: z.dict(price).default({}),
    liveBenchEndpoint: z.string().default(DEFAULT_ROUTER_SETTINGS.liveBenchEndpoint),
    liveBenchTtlMs: z.number().min(30000).default(DEFAULT_ROUTER_SETTINGS.liveBenchTtlMs),
    budgetUsd: z.number().min(0).default(DEFAULT_ROUTER_SETTINGS.budgetUsd),
    cacheReadRatio: z.number().min(0).max(1).default(DEFAULT_ROUTER_SETTINGS.cacheReadRatio),
    cacheWriteRatio: z.number().min(0).max(1).default(DEFAULT_ROUTER_SETTINGS.cacheWriteRatio),
  })
}

function invalidateRouterPlans() {
  for (const state of allStates) {
    state.plan = null
    state.liveBenchPromise = null
    state.liveBenchError = null
  }
}

async function registerRouterSettings(ctx) {
  const settings = settingsService(ctx)
  if (settings === undefined || typeof settings.register !== 'function') return false
  try {
    const runtime = await loadSettingsRuntime()
    const namespace = runtime.settingsNamespace(MODEL_ROUTER_SETTINGS_NAMESPACE)
    const scope = settings.register(namespace, routerSettingsSchema(runtime.z), {
      base: DEFAULT_ROUTER_SETTINGS,
    })
    routerSettings = scope.get()
    routerSettingsReady = true
    scope.watch(next => {
      routerSettings = next
      invalidateRouterPlans()
    })
    return true
  } catch (error) {
    ctx.logger?.warn?.(`model-router: settings registration unavailable: ${String(error)}`)
    return false
  }
}

export const name = 'model-router-galgame'
export const inject = ['commands', 'llm', 'settings']

const LLM_SETTINGS_NAMESPACE = 'llm-pi-ai'
const OPEN_CODE_REPAIR_DELAYS_MS = Object.freeze([25, 100, 250, 500, 1000, 2000])

const states = new WeakMap()
const allStates = new Set()

function stateFor(agent) {
  let state = states.get(agent)
  if (state === undefined) {
    state = {
      mode: 'collective',
      plan: null,
      available: [],
      directoryPromise: null,
      turn: null,
      failedModels: new Set(),
      lastTarget: null,
      lastStep: 0,
      collaboration: null,
      taskText: '',
      personaInjected: false,
      liveBench: null,
      liveBenchFetchedAt: 0,
      liveBenchPromise: null,
      liveBenchError: null,
    }
    states.set(agent, state)
    allStates.add(state)
  }
  return state
}

async function discover(ctx, state) {
  if (state.directoryPromise !== null) return state.directoryPromise
  state.directoryPromise = (async () => {
    const routes = []
    let providers = []
    try { providers = ctx.llm.listProviders() } catch { providers = [] }
    for (const provider of providers) {
      try {
        const models = await ctx.llm.listModels(provider.id)
        for (const model of models) routes.push({ provider: provider.id, model: model.id })
      } catch (error) {
        ctx.logger?.debug?.(`model-router: model discovery failed for ${provider.id}: ${String(error)}`)
      }
    }
    state.available = routes
    return routes
  })().catch(error => {
    state.directoryPromise = null
    ctx.logger?.warn?.(`model-router: model discovery unavailable: ${String(error)}`)
    return state.available
  })
  return state.directoryPromise
}

function inputText(messages) {
  return textFromMessages(messages).slice(-12000)
}

async function liveBenchFor(ctx, state) {
  if (!routerSettingsReady) return state.liveBench
  const ttl = Math.max(30000, Number(routerSettings.liveBenchTtlMs) || DEFAULT_ROUTER_SETTINGS.liveBenchTtlMs)
  if (state.liveBench !== null && Date.now() - state.liveBenchFetchedAt < ttl) return state.liveBench
  if (state.liveBenchPromise !== null) return state.liveBenchPromise
  const configuredEndpoint = String(routerSettings.liveBenchEndpoint || DEFAULT_ROUTER_SETTINGS.liveBenchEndpoint)
  // Migrate the endpoint used by the first prototype; it returned 404 after
  // LiveBench moved to versioned CSV/JSON assets.
  const endpoint = configuredEndpoint === 'https://livebench.ai/api/leaderboard'
    ? DEFAULT_ROUTER_SETTINGS.liveBenchEndpoint
    : configuredEndpoint
  state.liveBenchPromise = fetchLiveBenchSnapshot({
    endpoint,
  }).then(snapshot => {
    state.liveBench = snapshot
    state.liveBenchFetchedAt = snapshot.fetchedAt
    state.liveBenchError = null
    return snapshot
  }).catch(error => {
    state.liveBenchError = String(error)
    ctx.logger?.warn?.(`model-router: LiveBench refresh failed; using ${state.liveBench === null ? 'experimental baseline' : 'last snapshot'}: ${String(error)}`)
    return state.liveBench
  }).finally(() => {
    state.liveBenchPromise = null
  })
  return state.liveBenchPromise
}

function newMessageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `model-router-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Create a durable model-facing context row for a collaboration stage. */
function stageMessage(plan, step) {
  const text = collaborationInstruction(plan, step)
  if (text === '') return null
  return {
    id: newMessageId(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: name, form: 'relay' },
  }
}

/**
 * Persona is a final-answer context only. It is intentionally a separate
 * message so the collaboration stages and their audit records remain free of
 * stylistic instructions.
 */
function personaMessage(state, agent, step) {
  const plan = state.plan
  const isCollective = state.mode === 'collective'
  const stage = isCollective ? collaborationStage(plan, step) : null
  const finalStage = !isCollective || stage === null || stage.purpose === 'synthesis'
    || plan?.complexity?.band !== 'complex'
  if (!finalStage) return null
  let route = state.lastTarget
  if (isCollective && plan !== null && plan !== undefined) {
    const task = plan.complexity?.band === 'complex' ? plan.subtasks?.[Math.max(1, Number(step) || 1) - 1] : plan.subtasks?.[0]
    if (task?.recommended) route = { provider: task.recommendedProvider, model: task.recommended }
    if (task?.purpose === 'synthesis' && plan.synthesizer?.model) route = plan.synthesizer
    if (route?.model === undefined || route?.model === '') route = plan.selected
  }
  if (!isCollective) {
    const header = typeof agent.session?.requestHeader === 'function' ? agent.session.requestHeader() : null
    route = route ?? header?.config ?? agent.options
  }
  const text = buildPersonaPrompt({
    provider: route?.provider ?? '',
    model: route?.model ?? '',
    mode: state.mode,
    stage: stage?.purpose === 'synthesis' ? 'synthesis' : 'answer',
    taskText: state.taskText,
  })
  return {
    id: newMessageId(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: name, form: 'persona', summary: '最终答复表达层' },
  }
}

/** A short, auditable routing explanation shown before the first work stage. */
function analysisMessage(plan) {
  if (plan === null || plan === undefined) return null
  const weights = plan.objectiveWeights ?? {}
  const selected = plan.selected === null || plan.selected === undefined
    ? '待发现模型'
    : `${plan.selected.provider}/${plan.selected.model}`
  const text = [
    '[Model Router 路由分析]',
    `任务类型：${plan.taskType}；复杂度：${plan.complexity?.band ?? 'unknown'}（${Math.round((plan.complexity?.value ?? 0) * 100)}%）`,
    Array.isArray(plan.taskTypes) && plan.taskTypes.length > 1 ? `业务方向：${plan.taskTypes.join('、')}（分别建立执行工作包）` : '',
    `本轮权重：质量 ${Math.round((weights.quality ?? 0) * 100)}%，成本 ${Math.round((weights.cost ?? 0) * 100)}%，延迟 ${Math.round((weights.latency ?? 0) * 100)}%，专长 ${Math.round((weights.specialty ?? 0) * 100)}%，风险 ${Math.round((weights.risk ?? 0) * 100)}%`,
    `质量下限：${Math.round(Number(plan.optimization?.qualityFloor ?? 0) * 100)}%；首选路由：${selected}`,
    `预计总费用：$${Number(plan.estimatedCost ?? 0).toFixed(6)}；相对全高质量基线节省：$${Number((plan.optimization?.baselineAllStrongCost ?? 0) - (plan.estimatedCost ?? 0)).toFixed(6)}`,
    `缓存计费比例：读取 ${Math.round(Number(plan.optimization?.cacheReadRatio ?? 0) * 100)}%，写入 ${Math.round(Number(plan.optimization?.cacheWriteRatio ?? 0) * 100)}%（未填写时按普通输入计费）`,
    Number(plan.optimization?.budgetUsd ?? 0) > 0 ? `预算上限：$${Number(plan.optimization.budgetUsd).toFixed(6)}；${plan.optimization.budgetExceeded ? '仍超预算，已在质量下限内尽量压缩' : '满足预算约束'}` : '',
    `LiveBench：${plan.optimization?.liveBench?.fetchedAt ? `快照于 ${new Date(Number(plan.optimization.liveBench.fetchedAt)).toISOString()}${plan.optimization.liveBench.stale ? '（本次刷新失败，沿用上次快照）' : ''}` : '未完成联网核验，使用实验基线'}`,
    String(plan.reason ?? ''),
  ].filter(Boolean).join('\n')
  return {
    id: newMessageId(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: name, form: 'notice', summary: '路由分析与任务分配' },
  }
}

function hasStageMarker(messages, step) {
  const marker = `[Model Router 协作阶段 ${step}/`
  return messages.some(message => message?.content?.some(block => typeof block?.text === 'string' && block.text.includes(marker)))
}

function shouldCollaborate(plan, available) {
  return plan?.complexity?.band === 'complex'
    && Array.isArray(plan.subtasks)
    && plan.subtasks.length >= 3
    && plan.selected !== null
    && plan.selected !== undefined
    && Array.isArray(available)
    && available.length > 0
}

function routeKey(provider, model) {
  return `${String(provider ?? '')}/${String(model ?? '')}`
}

function modelFallbackError(failure) {
  const text = `${String(failure?.code ?? '')} ${String(failure?.message ?? '')}`.toLowerCase()
  return /region|not available|not supported|freeusagelimit|rate limit|too many requests|\b(?:403|404|429)\b/.test(text)
}

function nextAvailableTarget(state) {
  const candidates = Array.isArray(state.plan?.candidates) ? state.plan.candidates : []
  for (const candidate of candidates) {
    const key = routeKey(candidate.provider, candidate.model)
    if (state.failedModels.has(key)) continue
    const route = state.available.find(entry => entry.provider === candidate.provider && entry.model === candidate.model)
    if (route !== undefined) return route
  }
  return null
}

function settingsService(ctx) {
  try {
    return ctx.get?.('settings') ?? ctx.settings
  } catch {
    return ctx.settings
  }
}

/**
 * Remove an official OpenCode website URL only when it is a user override and
 * the built-in model catalog is still in use. This lets the catalog restore
 * its per-model /zen and /zen/v1 endpoints without touching custom gateways.
 */
async function repairOpenCodeEndpoint(ctx) {
  const settings = settingsService(ctx)
  if (settings === undefined || typeof settings.describe !== 'function' || typeof settings.mutate !== 'function') {
    return 'unavailable'
  }
  let descriptor
  try {
    const descriptors = settings.describe()
    descriptor = (Array.isArray(descriptors) ? descriptors : [])
      .find(entry => String(entry?.ns) === LLM_SETTINGS_NAMESPACE)
  } catch (error) {
    ctx.logger?.debug?.(`model-router: settings inspection unavailable: ${String(error)}`)
    return 'unavailable'
  }
  // The settings service can be mounted after this plugin. Report this state
  // separately so the bounded startup retry can observe the namespace later.
  if (descriptor === undefined) return 'pending'
  const ops = collectOpenCodeEndpointRepairs(descriptor?.user)
  if (ops.length === 0) return 'clean'
  try {
    await settings.mutate(LLM_SETTINGS_NAMESPACE, ops, descriptor.revision)
    ctx.logger?.info?.(`model-router: restored OpenCode catalog endpoints for ${ops.length} route(s)`)
    return 'repaired'
  } catch (error) {
    // A concurrent settings write can make the revision stale. The next
    // settings/updated event retries the same repair against the new revision.
    ctx.logger?.warn?.(`model-router: could not repair OpenCode endpoint: ${String(error)}`)
    return 'retry'
  }
}

/**
 * Serialize endpoint repairs and retry only while the settings namespace is
 * coming online or a concurrent write makes the revision stale. A bounded
 * timer avoids leaving a desktop process alive indefinitely during shutdown.
 */
function createOpenCodeRepairScheduler(ctx) {
  const control = { inFlight: null, retryIndex: 0 }

  const wait = delay => new Promise(resolve => setTimeout(resolve, delay))

  /**
   * Keep one repair promise for all callers. Request hooks await the same
   * bounded retry sequence, so a startup registration race cannot leak a
   * stale OpenCode website URL into the next model request.
   */
  const run = async () => {
    let result = 'retry'
    for (let attempt = 0; attempt <= OPEN_CODE_REPAIR_DELAYS_MS.length; attempt += 1) {
      result = await repairOpenCodeEndpoint(ctx)
      if (result === 'clean' || result === 'repaired') {
        control.retryIndex = 0
        return result
      }
      if (attempt === OPEN_CODE_REPAIR_DELAYS_MS.length) return result
      control.retryIndex = attempt + 1
      await wait(OPEN_CODE_REPAIR_DELAYS_MS[attempt])
    }
    return result
  }

  const schedule = () => {
    if (control.inFlight !== null) return control.inFlight
    const promise = run().catch(error => {
      ctx.logger?.debug?.(`model-router: OpenCode repair scheduler failed: ${String(error)}`)
      return 'retry'
    })
    control.inFlight = promise
    void promise.finally(() => {
      if (control.inFlight === promise) control.inFlight = null
    })
    return promise
  }

  return schedule
}

export function apply(ctx) {
  // Settings are optional in headless test/minimal hosts. In a full Harness
  // process this registers the editable pricing, LiveBench and budget section;
  // the dynamic import keeps the standalone plugin loadable during bootstrap.
  if (typeof ctx.inject === 'function') {
    routerSettingsPromise = new Promise(resolve => {
      let settled = false
      const finish = value => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const timer = setTimeout(() => finish(false), 250)
      try {
        ctx.inject(['settings'], settingsCtx => {
          void registerRouterSettings(settingsCtx).then(value => {
            clearTimeout(timer)
            finish(value)
          })
        })
      } catch {
        clearTimeout(timer)
        finish(false)
      }
    })
  } else {
    routerSettingsPromise = registerRouterSettings(ctx)
  }
  const scheduleOpenCodeRepair = createOpenCodeRepairScheduler(ctx)
  ctx.commands.register({
    name: 'router',
    description: 'switch Model Router mode or inspect the latest routing plan',
    input: { hint: 'mode collective|single | plan' },
    recordInput: true,
    handler: ({ agent, rawInput }) => {
      const state = stateFor(agent)
      const value = String(rawInput ?? '').trim().toLowerCase()
      if (value === 'mode single' || value === 'single') {
        state.mode = 'single'
        if (state.plan !== null) state.plan = { ...state.plan, mode: 'single' }
        return { kind: 'success', text: 'Model Router 已切换到单独会话：保留你在原生模型选择器中的选择。' }
      }
      if (value === 'mode collective' || value === 'collective') {
        state.mode = 'collective'
        if (state.plan !== null) state.plan = { ...state.plan, mode: 'collective' }
        return { kind: 'success', text: 'Model Router 已切换到集体合作：下一条问题将按复杂度、专长、成本和延迟自动分配。' }
      }
      if (value === 'plan' || value === '') {
        return { kind: 'success', text: state.plan === null ? '还没有可展示的路由方案。' : JSON.stringify(state.plan) }
      }
      return { kind: 'error', text: '用法：/router mode collective、/router mode single 或 /router plan' }
    },
  })

  ctx.on('llm/adapters-updated', () => {
    for (const state of allStates) {
      state.directoryPromise = null
    }
    void scheduleOpenCodeRepair()
  })

  // Existing settings may have been loaded before this plugin mounted. The
  // event listener handles later edits; the initial call covers that startup
  // ordering without requiring users to remove and re-add the route.
  void scheduleOpenCodeRepair()
  ctx.on('settings/updated', (namespace) => {
    if (String(namespace) === LLM_SETTINGS_NAMESPACE) void scheduleOpenCodeRepair()
  })
  ctx.on('settings/document-updated', (namespace) => {
    if (String(namespace) === LLM_SETTINGS_NAMESPACE) void scheduleOpenCodeRepair()
  })

  ctx.on('agent/pre-step', async ({ agent, messages, signal, turn, step }, next) => {
    if (signal?.aborted) return next()
    // Repair before the mode check: single-session requests use the same
    // OpenCode catalog and must not inherit a stale route-level website URL.
    await scheduleOpenCodeRepair()
    const state = stateFor(agent)
    if (state.turn !== null && state.turn !== turn) {
      state.failedModels.clear()
      state.lastTarget = null
      state.lastStep = 0
      state.plan = null
      state.collaboration = null
      state.taskText = ''
      state.personaInjected = false
    }
    state.turn = turn
    if (state.mode !== 'collective' || signal?.aborted) {
      if (state.taskText === '') state.taskText = inputText(messages)
      const proposed = await next()
      if (signal?.aborted || proposed === undefined || proposed === null || proposed.kind !== 'enter') return proposed
      const hasPersona = proposed.messages.some(message => message?.content?.some(block => isPersonaPrompt(block?.text)))
      if (hasPersona) state.personaInjected = true
      const personaContext = state.personaInjected ? null : personaMessage(state, agent, Number.isFinite(Number(step)) ? Number(step) : 1)
      if (personaContext === null) return proposed
      state.personaInjected = true
      return { ...proposed, messages: [...proposed.messages, personaContext] }
    }
    const available = await discover(ctx, state)
    if (signal?.aborted) return next()
    if (state.plan === null || state.plan.mode !== state.mode) {
      await routerSettingsPromise
      state.taskText = inputText(messages)
      const liveBench = await liveBenchFor(ctx, state)
      state.plan = buildPlan({
        text: state.taskText,
        available,
        mode: state.mode,
        pricing: routerSettings.pricing,
        liveBench,
        liveBenchError: state.liveBenchError,
        budgetUsd: routerSettings.budgetUsd,
        cacheReadRatio: routerSettings.cacheReadRatio,
        cacheWriteRatio: routerSettings.cacheWriteRatio,
      })
      state.collaboration = shouldCollaborate(state.plan, available)
        ? { lastStep: 0, queuedStep: null }
        : null
    }
    if (state.plan.selected !== null) {
      ctx.logger?.info?.(`model-router: ${state.plan.selected.provider}/${state.plan.selected.model} selected (${state.plan.reason})`)
    }
    const proposed = await next()
    if (proposed === undefined || proposed === null || proposed.kind !== 'enter') return proposed
    const currentStep = Number.isFinite(Number(step)) ? Number(step) : state.lastStep + 1
    const stageContext = stageMessage(state.plan, currentStep)
    const analysisContext = currentStep === 1 ? analysisMessage(state.plan) : null
    const hasPersona = proposed.messages.some(message => message?.content?.some(block => isPersonaPrompt(block?.text)))
    if (hasPersona) state.personaInjected = true
    const personaContext = state.personaInjected ? null : personaMessage(state, agent, currentStep)
    const additions = []
    if (analysisContext !== null && !hasStageMarker(proposed.messages, currentStep)) additions.push(analysisContext)
    if (personaContext !== null) {
      additions.push(personaContext)
      state.personaInjected = true
    }
    if (stageContext !== null && !hasStageMarker(proposed.messages, currentStep)) additions.push(stageContext)
    state.lastStep = currentStep
    return additions.length === 0 ? proposed : { ...proposed, messages: [...proposed.messages, ...additions] }
  })

  ctx.on('agent/request', async ({ agent, step, signal }, next) => {
    // `agent/pre-step` normally runs first, but a request can be resumed while
    // settings are still being registered. This second guard closes that race.
    await scheduleOpenCodeRepair()
    const proposed = await next()
    if (signal?.aborted) return proposed
    const state = stateFor(agent)
    if (state.mode !== 'collective' || state.plan?.selected === null || state.plan?.selected === undefined) return proposed
    let target = state.plan.selected
    if (state.plan.complexity?.band === 'complex' && state.plan.subtasks?.length > 1) {
      const assignment = state.plan.subtasks[(Math.max(1, step) - 1) % state.plan.subtasks.length]
      const assignedRoute = state.available.find(route => route.provider === assignment?.recommendedProvider && route.model === assignment?.recommended)
        ?? state.available.find(route => route.model === assignment?.recommended)
      if (assignedRoute !== undefined) {
        target = { provider: assignedRoute.provider, model: assignedRoute.model, estimatedCost: target.estimatedCost }
      }
      // The final subtask is the public answer synthesis. Prefer the user's
      // requested DeepSeek V4 Pro when it is actually available; otherwise the
      // deterministic plan's fallback remains in force and is shown in the UI.
      const synthesis = state.plan.synthesizer
      if (assignment?.purpose === 'synthesis' && synthesis?.provider && synthesis?.model) {
        const synthesisRoute = state.available.find(route => route.provider === synthesis.provider && route.model === synthesis.model)
        if (synthesisRoute !== undefined) {
          target = { provider: synthesisRoute.provider, model: synthesisRoute.model, estimatedCost: target.estimatedCost }
        }
      }
    }
    if (state.failedModels.has(routeKey(target.provider, target.model))) {
      const fallback = nextAvailableTarget(state)
      if (fallback !== null) {
        target = { provider: fallback.provider, model: fallback.model, estimatedCost: target.estimatedCost }
      }
    }
    state.lastTarget = { provider: target.provider, model: target.model }
    state.lastStep = step
    // Keep all non-routing request fields intact. If a route disappeared after
    // discovery, the LLM runtime will validate the proposal and the original
    // model remains available on the next step.
    return { ...proposed, provider: target.provider, model: target.model }
  })

  // A completed work step would normally close the turn immediately. Queue the
  // next real collaboration stage at that boundary so the Harness agent loop
  // executes it as another logged model call. The final stage is the only one
  // allowed to answer the owner directly.
  ctx.on('agent/turn-stopping', ({ agent, signal }) => {
    const state = stateFor(agent)
    if (signal?.aborted || state.mode !== 'collective' || state.collaboration === null || state.plan === null) return
    const nextStage = nextCollaborationStage(state.plan, state.lastStep)
    if (nextStage === null) return
    const nextStep = state.lastStep + 1
    const message = stageMessage(state.plan, nextStep)
    if (message === null) return
    agent.inject(message)
    state.collaboration.queuedStep = nextStep
    ctx.logger?.info?.(`model-router: collaboration stage ${nextStep}/${state.plan.subtasks.length} queued`)
  })

  ctx.on('agent/request-error', async ({ agent, provider, failure, signal }, next) => {
    const state = stateFor(agent)
    if (signal?.aborted || state.mode !== 'collective' || !modelFallbackError(failure)) return next()
    const failed = state.lastTarget?.provider === provider ? state.lastTarget : null
    if (failed === null) return next()
    state.failedModels.add(routeKey(failed.provider, failed.model))
    const fallback = nextAvailableTarget(state)
    if (fallback === null) return next()
    if (state.plan !== null) {
      const plan = state.plan
      const failedStage = plan.subtasks?.[Math.max(0, state.lastStep - 1)]
      const isSynthesisFailure = failedStage?.purpose === 'synthesis'
      state.plan = {
        ...plan,
        ...(plan.selected === null ? {} : { selected: { ...plan.selected, provider: fallback.provider, model: fallback.model } }),
        ...(isSynthesisFailure ? {
          synthesizer: { provider: fallback.provider, model: fallback.model },
          subtasks: plan.subtasks.map((task, index) => index === plan.subtasks.length - 1
            ? { ...task, recommendedProvider: fallback.provider, recommended: fallback.model }
            : task),
        } : {}),
      }
    }
    ctx.logger?.warn?.(`model-router: ${routeKey(failed.provider, failed.model)} unavailable; retrying with ${routeKey(fallback.provider, fallback.model)}`)
    return { kind: 'retry' }
  })

  ctx.on('agent/error', ({ agent, error }) => {
    ctx.logger?.warn?.(`model-router: agent ${String(agent.id)} failed: ${String(error)}`)
  })
}
