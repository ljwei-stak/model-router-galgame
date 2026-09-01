/**
 * Shared, deterministic routing model used by the Host and GAL client.
 * It intentionally exposes an auditable decision record, not private model
 * reasoning. The optimizer is a constrained assignment heuristic over a small
 * task DAG; this keeps plan generation bounded and reproducible in a desktop
 * process while retaining the same objective used in the thesis model.
 */

import { liveBenchRow } from './livebench.mjs'

export const OBJECTIVE_WEIGHTS = Object.freeze({
  simple: Object.freeze({ quality: 0.30, cost: 0.50, latency: 0.14, specialty: 0.04, risk: 0.02 }),
  balanced: Object.freeze({ quality: 0.45, cost: 0.30, latency: 0.10, specialty: 0.10, risk: 0.05 }),
  complex: Object.freeze({ quality: 0.55, cost: 0.16, latency: 0.06, specialty: 0.16, risk: 0.07 }),
})

/** Quality floor for a task node before a cost-saving substitution is allowed. */
export const QUALITY_FLOORS = Object.freeze({ simple: 0.64, balanced: 0.72, complex: 0.78 })

/** Host settings namespace used by the manual pricing editor. */
export const MODEL_ROUTER_SETTINGS_NAMESPACE = 'model-router'

/** Empty user layer means "use the experimental baseline". */
export const DEFAULT_ROUTER_SETTINGS = Object.freeze({
  pricing: Object.freeze({}),
  // The official site publishes versioned table/categories assets and the
  // adapter discovers the newest release from this root URL.
  liveBenchEndpoint: 'https://livebench.ai',
  liveBenchTtlMs: 900000,
  budgetUsd: 0,
  cacheReadRatio: 0,
  cacheWriteRatio: 0,
})

// USD per million tokens. Values are an initial catalog and can be replaced by
// a provider's live pricing without changing the scoring code.
export const MODEL_CATALOG = Object.freeze([
  { id: 'claude-fable-5', aliases: ['claude-fable-5', 'claude fable 5'], quality: 0.99, latency: 0.34, costIn: 10, costOut: 50, specialties: ['reasoning', 'writing', 'research'], risk: 0.06 },
  { id: 'claude-opus-4-8', aliases: ['claude-opus-4-8', 'claude opus 4.8'], quality: 0.97, latency: 0.39, costIn: 5, costOut: 25, specialties: ['reasoning', 'writing', 'code'], risk: 0.07 },
  { id: 'gpt-5.6-sol', aliases: ['gpt-5.6-sol', 'gpt 5.6 sol'], quality: 0.98, latency: 0.40, costIn: 5, costOut: 30, specialties: ['reasoning', 'code', 'math', 'vision'], risk: 0.06 },
  { id: 'gpt-5.5', aliases: ['gpt-5.5', 'gpt 5.5'], quality: 0.95, latency: 0.44, costIn: 5, costOut: 30, specialties: ['reasoning', 'code', 'math'], risk: 0.08 },
  { id: 'deepseek-v4-pro', aliases: ['deepseek-v4-pro', 'deepseek v4 pro'], quality: 0.93, latency: 0.52, costIn: 1.74, costOut: 3.48, specialties: ['code', 'math', 'reasoning'], risk: 0.10 },
  { id: 'deepseek-v4-flash', aliases: ['deepseek-v4-flash', 'deepseek v4 flash'], quality: 0.82, latency: 0.82, costIn: 0.14, costOut: 0.28, specialties: ['code', 'summarization', 'classification'], risk: 0.14 },
  { id: 'kimi-k3', aliases: ['kimi-k3', 'kimi k3'], quality: 0.91, latency: 0.56, costIn: 3, costOut: 15, specialties: ['reasoning', 'long-context', 'code'], risk: 0.10 },
  { id: 'qwen3.7-max', aliases: ['qwen3.7-max', 'qwen 3.7 max'], quality: 0.94, latency: 0.50, costIn: 2.5, costOut: 7.5, specialties: ['reasoning', 'math', 'code'], risk: 0.08 },
  { id: 'qwen3.7-plus', aliases: ['qwen3.7-plus', 'qwen 3.7 plus'], quality: 0.87, latency: 0.72, costIn: 0.4, costOut: 1.6, specialties: ['code', 'math', 'writing'], risk: 0.12 },
  { id: 'glm-5.2', aliases: ['glm-5.2', 'glm 5.2'], quality: 0.89, latency: 0.64, costIn: 1.4, costOut: 4.4, specialties: ['reasoning', 'writing', 'math'], risk: 0.11 },
  { id: 'gpt-5.6-luna', aliases: ['gpt-5.6-luna', 'gpt 5.6 luna'], quality: 0.84, latency: 0.86, costIn: 0.2, costOut: 1.2, specialties: ['classification', 'summarization', 'code'], risk: 0.14 },
  { id: 'gpt-5.6-terra', aliases: ['gpt-5.6-terra', 'gpt 5.6 terra'], quality: 0.91, latency: 0.66, costIn: 2, costOut: 12, specialties: ['code', 'writing', 'reasoning'], risk: 0.10 },
  { id: 'minimax-m3', aliases: ['minimax-m3', 'minimax m3'], quality: 0.86, latency: 0.69, costIn: 0.3, costOut: 1.2, specialties: ['writing', 'code', 'summarization'], risk: 0.13 },
  { id: 'gemini-3-flash', aliases: ['gemini 3 flash', 'gemini-3-flash'], quality: 0.88, latency: 0.73, costIn: 0.5, costOut: 3, specialties: ['vision', 'research', 'summarization'], risk: 0.12 },
  { id: 'big-pickle', aliases: ['big pickle'], quality: 0.70, latency: 0.88, costIn: 0, costOut: 0, specialties: ['classification', 'summarization'], risk: 0.24 },
])

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const routeKey = (provider, model) => `${String(provider ?? '')}/${String(model ?? '')}`

/** OpenCode routes whose catalog entries carry their own protocol endpoint. */
export const OPENCODE_CATALOG_PROVIDERS = Object.freeze([
  'opencode',
  'opencode-go',
  // Some OpenCode-compatible configuration examples use the product name as
  // the route id. Treat those aliases as catalog routes too; the pi-ai catalog
  // still owns the actual model endpoints.
  'opencode-zen',
  'opencode-go-zen',
])

/** Normalize the route ids used by OpenCode-compatible settings. */
function normalizeOpenCodeProvider(provider) {
  const route = String(provider ?? '').trim().toLowerCase()
  return route.replace(/-zen$/, '')
}

/**
 * The pi-ai catalog stores different endpoints for OpenCode's wire families:
 * Anthropic models use /zen while OpenAI-compatible models use /zen/v1 (and
 * the Go route has the corresponding /zen/go variants). A provider-level URL
 * for the public website would overwrite those model endpoints and produce a
 * 404 HTML page. Only the official host is repaired; custom gateways remain
 * fully user-controlled.
 */
export function isOfficialOpenCodeEndpoint(provider, baseURL) {
  const route = String(provider ?? '').trim().toLowerCase()
  if (!['opencode', 'opencode-go'].includes(normalizeOpenCodeProvider(route))) return false
  if (typeof baseURL !== 'string' || baseURL.trim().length === 0) return false
  try {
    const parsed = new URL(baseURL.trim())
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return host === 'opencode.ai' || host === 'www.opencode.ai'
  } catch {
    return false
  }
}

/** Return settings mutations that restore the official catalog endpoints. */
export function collectOpenCodeEndpointRepairs(user) {
  if (user === null || typeof user !== 'object' || Array.isArray(user)) return []
  const providers = user.providers
  if (providers === null || typeof providers !== 'object' || Array.isArray(providers)) return []
  const ops = []
  for (const [provider, profile] of Object.entries(providers)) {
    if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) continue
    if (isOfficialOpenCodeEndpoint(provider, profile.baseURL)) {
      ops.push({ op: 'unset', path: ['providers', provider, 'baseURL'] })
    }
  }
  return ops
}

export function textFromMessages(messages) {
  if (!Array.isArray(messages)) return ''
  return messages.map(message => {
    if (!message || !Array.isArray(message.content)) return ''
    return message.content.map(block => typeof block?.text === 'string' ? block.text : '').join('\n')
  }).join('\n').trim()
}

export function classifyTask(text) {
  const value = String(text ?? '')
  if (value.length < 80 && /翻译|解释|translate|explain/i.test(value)) return 'general'
  return detectTaskTypes(value)[0] ?? 'general'
}

const TASK_TYPE_RULES = Object.freeze([
  ['vision', /图片|图像|照片|视觉|image|vision|截图|识图/i],
  ['math', /数学|证明|定理|公式|方程|math|proof|theorem/i],
  ['code', /代码|编程|工程|项目|架构|接口|api|debug|实现|部署|测试|code/i],
  ['research', /研究|论文|文献|联网|检索|research|source|引用/i],
  ['summarization', /总结|摘要|提炼|分类|翻译|summar|classif|extract/i],
  ['writing', /写作|润色|小说|文案|报告|writing|draft/i],
])

const TASK_TYPE_LABELS = Object.freeze({
  vision: '视觉处理',
  math: '数学推导',
  code: '工程与代码',
  research: '研究与检索',
  summarization: '摘要与整理',
  writing: '写作与表达',
})

/** Return all explicit business directions, ranked by signal count. */
export function detectTaskTypes(text) {
  const value = String(text ?? '')
  const ranked = TASK_TYPE_RULES.map(([type, pattern]) => ({
    type,
    signals: value.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))?.length ?? 0,
  })).filter(item => item.signals > 0)
  ranked.sort((left, right) => right.signals - left.signals || left.type.localeCompare(right.type))
  return ranked.map(item => item.type)
}

export function assessComplexity(text) {
  const value = String(text ?? '')
  const lengthScore = clamp(value.length / 2200)
  const requirementScore = clamp((value.match(/(?:^|\n)\s*(?:[-*]|\d+[.)]|[一二三四五六七八九十]+[、.])/g) ?? []).length / 8)
  const codeScore = /(代码|工程|架构|接口|实现|部署|测试|code|api|debug)/i.test(value) ? 0.22 : 0
  const highReasoningScore = /(数学|证明|定理|研究|论文|复杂|多步骤|约束|比较|评估|架构|模块|部署|math|proof|research)/i.test(value) ? 0.20 : 0
  const visionScore = /(图片|图像|照片|截图|视觉|image|vision)/i.test(value) ? 0.12 : 0
  const domainMarkers = (value.match(/代码|工程|架构|接口|实现|部署|测试|模块|拆分|约束|评估|证明|定理|研究|论文|图片|图像|照片|视觉|code|api|debug|proof|research|vision/gi) ?? []).length
  const domainComplexity = clamp(domainMarkers / 5) * 0.28
  const raw = clamp(0.10 + lengthScore * 0.30 + requirementScore * 0.18 + domainComplexity + codeScore + highReasoningScore + visionScore)
  const band = raw < 0.34 ? 'simple' : raw < 0.66 ? 'balanced' : 'complex'
  return { value: raw, band }
}

function specialtyMatch(model, taskType, liveScores = {}) {
  const benchmark = asScore(liveScores?.[taskType])
  if (benchmark !== undefined) return benchmark
  if (model.specialties.includes(taskType)) return 1
  if (taskType === 'general') return 0.58
  if (taskType === 'research' && model.specialties.includes('writing')) return 0.68
  if (taskType === 'writing' && model.specialties.includes('reasoning')) return 0.62
  return 0.38
}

function qualityForTask(row, taskType) {
  return asScore(row?.liveScores?.[taskType]) ?? asScore(row?.liveOverall) ?? row?.metadata?.quality ?? row?.quality ?? 0
}

function specialtyForTask(row, taskType) {
  return specialtyMatch(row.metadata, taskType, row.liveScores)
}

function asScore(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return undefined
  return clamp(number > 1 ? number / 100 : number)
}

function normalizePricing(pricing) {
  if (pricing === null || typeof pricing !== 'object' || Array.isArray(pricing)) return {}
  const normalized = {}
  for (const [id, raw] of Object.entries(pricing)) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue
    const input = Number(raw.input ?? raw.costIn)
    const output = Number(raw.output ?? raw.costOut)
    const cacheRead = Number(raw.cacheRead ?? 0)
    const cacheWrite = Number(raw.cacheWrite ?? 0)
    if (![input, output, cacheRead, cacheWrite].every(value => Number.isFinite(value) && value >= 0)) continue
    normalized[normalize(id)] = {
      input: input,
      output,
      cacheRead,
      cacheWrite,
      currency: String(raw.currency ?? 'USD').toUpperCase(),
    }
  }
  return normalized
}

function pricingFor(model, pricing, provider = '') {
  const normalizedPricing = normalizePricing(pricing)
  const providerOverride = provider === '' ? undefined : normalizedPricing[normalize(`${provider}/${model.id}`)]
  const override = providerOverride ?? normalizedPricing[normalize(model.id)]
  return override ?? {
    input: Number(model.costIn ?? 0),
    output: Number(model.costOut ?? 0),
    cacheRead: Number(model.cacheRead ?? 0),
    cacheWrite: Number(model.cacheWrite ?? 0),
    currency: 'USD',
  }
}

function normalizedCacheRatios(cacheReadRatio = 0, cacheWriteRatio = 0) {
  const read = Number.isFinite(Number(cacheReadRatio)) ? clamp(Number(cacheReadRatio)) : 0
  const write = Number.isFinite(Number(cacheWriteRatio)) ? Math.min(clamp(Number(cacheWriteRatio)), 1 - read) : 0
  return { read, write }
}

function effectivePricing(pricing, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const { read, write } = normalizedCacheRatios(cacheReadRatio, cacheWriteRatio)
  return {
    input: (1 - read - write) * Number(pricing.input)
      + read * Number(pricing.cacheRead)
      + write * Number(pricing.cacheWrite),
    output: Number(pricing.output),
  }
}

function costScore(pricing, maxCost, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const effective = effectivePricing(pricing, cacheReadRatio, cacheWriteRatio)
  const mean = (effective.input + effective.output) / 2
  if (maxCost <= 0) return mean === 0 ? 1 : 0
  return clamp(1 - mean / maxCost)
}

export function estimateCost(model, text, outputTokens = 900, pricingOverrides = {}, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const pricing = pricingFor(model, pricingOverrides)
  const inputTokens = Math.max(80, Math.ceil(String(text ?? '').length / 3.7))
  const ratios = normalizedCacheRatios(cacheReadRatio, cacheWriteRatio)
  const cacheReadTokens = Math.min(inputTokens, Math.max(0, Math.round(inputTokens * ratios.read)))
  const cacheWriteTokens = Math.min(inputTokens - cacheReadTokens, Math.max(0, Math.round(inputTokens * ratios.write)))
  const billableInputTokens = inputTokens - cacheReadTokens - cacheWriteTokens
  return ((billableInputTokens * pricing.input)
    + (cacheReadTokens * pricing.cacheRead)
    + (cacheWriteTokens * pricing.cacheWrite)
    + (outputTokens * pricing.output)) / 1_000_000
}

export function modelMetadata(name) {
  const key = normalize(name)
  return MODEL_CATALOG.find(model => model.aliases.some(alias => {
    const candidate = normalize(alias)
    return key === candidate || key.includes(candidate) || candidate.includes(key)
  })) ?? null
}

/**
 * Return the staged collaboration task for one agent-loop step.
 * Complex turns deliberately use the loop's real steps: each work report is
 * logged as an assistant message, then the synthesis step receives the full
 * durable history. This keeps the plan auditable without exposing private
 * chain-of-thought.
 */
export function collaborationStage(plan, step) {
  if (plan?.complexity?.band !== 'complex' || !Array.isArray(plan.subtasks)) return null
  const index = Math.max(1, Number(step) || 1) - 1
  const task = plan.subtasks[index]
  return task === undefined ? null : { ...task, index: index + 1, total: plan.subtasks.length }
}

/** Return the next staged task after a completed step, or null at synthesis end. */
export function nextCollaborationStage(plan, step) {
  return collaborationStage(plan, (Number(step) || 0) + 1)
}

/**
 * Build a visible, model-facing stage instruction. It asks for a concise work
 * report rather than hidden reasoning; the report is persisted and passed to
 * later stages by the normal session history.
 */
export function collaborationInstruction(plan, step) {
  const stage = collaborationStage(plan, step)
  if (stage === null) return ''
  const taskType = String(plan.taskType ?? 'general')
  if (stage.purpose === 'synthesis') {
    return [
      `[Model Router 协作阶段 ${stage.index}/${stage.total}：结果校验与整合]`,
      `你是最终汇总模型。请阅读主人原问题以及前序协作阶段的工作报告，完成${taskType}任务的交叉校验、冲突处理和最终回答。`,
      '只输出面向主人的最终答案，不要复述内部调度指令，不要编造不存在的证据。',
      '回答必须使用 Markdown；数学公式使用 KaTeX 兼容的 $...$ 或 $$...$$。',
    ].join('\n')
  }
  if (stage.purpose === 'analysis') {
    return [
      `[Model Router 协作阶段 ${stage.index}/${stage.total}：问题建模与约束提取]`,
      `请针对主人的 ${taskType} 问题完成问题建模：提取目标、约束、输入输出、验收标准和关键风险。`,
      '只提交结构化工作报告，供后续模型使用；不要直接替主人给最终答案，也不要输出隐私化的逐步思维链。',
    ].join('\n')
  }
  return [
    `[Model Router 协作阶段 ${stage.index}/${stage.total}：${stage.name}]`,
    `请阅读主人原问题和上一阶段报告，完成 ${taskType} 任务中负责的资料、代码、证据或方案处理。`,
    '只提交可核验的结构化工作报告，列出结论、依据、待确认项和可直接复用的产物；不要直接替主人输出最终答案。',
  ].join('\n')
}

function taskTokenBudget(text, task, complexity, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const inputTokens = Math.max(80, Math.ceil(String(text ?? '').length / 3.7))
  const multipliers = {
    analysis: { input: 0.90, output: 0.55 },
    execution: { input: 1.20, output: complexity === 'complex' ? 1.45 : 1.00 },
    verification: { input: 1.15, output: 0.70 },
    synthesis: { input: 1.65, output: 1.30 },
  }
  const multiplier = multipliers[task.purpose] ?? { input: 1, output: 1 }
  const totalInputTokens = Math.max(80, Math.round(inputTokens * multiplier.input))
  const ratios = normalizedCacheRatios(cacheReadRatio, cacheWriteRatio)
  const cacheReadTokens = Math.min(totalInputTokens, Math.max(0, Math.round(totalInputTokens * ratios.read)))
  const cacheWriteTokens = Math.min(totalInputTokens - cacheReadTokens, Math.max(0, Math.round(totalInputTokens * ratios.write)))
  return {
    inputTokens: totalInputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    outputTokens: Math.max(220, Math.round(900 * multiplier.output)),
  }
}

function taskQualityFloor(band, task) {
  const base = QUALITY_FLOORS[band] ?? QUALITY_FLOORS.balanced
  if (task.purpose === 'synthesis') return Math.max(base, band === 'complex' ? 0.84 : base)
  if (band !== 'complex') return base
  return clamp(base + Math.max(0, Number(task.criticality ?? 0.75) - 0.65) * 0.12)
}

function taskPackages(taskType, text, band) {
  if (band !== 'complex') {
    const task = { name: '直接回答与必要校验', type: taskType, purpose: 'execution', criticality: 0.65 }
    return [{ ...task, qualityFloor: taskQualityFloor(band, task) }]
  }
  const value = String(text ?? '')
  const packages = [
    { name: '问题建模与约束提取', type: 'reasoning', purpose: 'analysis', criticality: 0.92 },
  ]
  const domains = [...new Set([...(detectTaskTypes(text)), taskType].filter(type => type !== 'general'))]
  for (const type of domains.length > 0 ? domains : [taskType]) {
    packages.push({
      name: `${TASK_TYPE_LABELS[type] ?? type}方向处理`,
      type,
      purpose: 'execution',
      criticality: domains.length > 1 ? 0.80 : 0.78,
    })
  }
  if (/(测试|验证|评估|对比|benchmark|test|verify|audit)/i.test(value)) {
    packages.push({ name: '验证、反例与风险审查', type: 'reasoning', purpose: 'verification', criticality: 0.88 })
  }
  packages.push({ name: '结果校验与整合', type: 'reasoning', purpose: 'synthesis', criticality: 1 })
  return packages.map(task => ({ ...task, qualityFloor: taskQualityFloor(band, task) }))
}

function candidateUtility(row, task, weights, maxCost, usedRoutes, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const quality = qualityForTask(row, task.type)
  const floor = Number(task.qualityFloor ?? taskQualityFloor('complex', task))
  const qualityGap = Math.max(0, floor - quality)
  const duplicatePenalty = usedRoutes.has(routeKey(row.provider, row.model)) ? 0.08 : 0
  const cost = costScore(row.pricing, maxCost, cacheReadRatio, cacheWriteRatio)
  const score = weights.quality * quality
    + weights.cost * cost
    + weights.latency * (1 - clamp(row.latency))
    + weights.specialty * specialtyForTask(row, task.type)
    - weights.risk * row.risk
    - duplicatePenalty
    - qualityGap * (task.criticality ?? 0.75)
  return { score, floor, qualityGap }
}

function chooseAssignment(rows, task, weights, maxCost, usedRoutes, preferred, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const ordered = rows
    .map(row => ({ row, decision: candidateUtility(row, task, weights, maxCost, usedRoutes, cacheReadRatio, cacheWriteRatio) }))
    .sort((left, right) => right.decision.score - left.decision.score)
  const feasible = ordered.filter(item => qualityForTask(item.row, task.type) >= item.decision.floor)
  const chosen = (preferred === true ? feasible : feasible.filter(item => !usedRoutes.has(routeKey(item.row.provider, item.row.model))))[0]
    ?? feasible[0]
    ?? ordered[0]
  if (chosen === undefined) return { row: null, relaxed: true, floor: 0, qualityGap: 1 }
  return { row: chosen.row, relaxed: qualityForTask(chosen.row, task.type) < chosen.decision.floor, floor: chosen.decision.floor, qualityGap: chosen.decision.qualityGap }
}

function taskCost(row, task, text, complexity, cacheReadRatio = 0, cacheWriteRatio = 0) {
  const tokens = taskTokenBudget(text, task, complexity, cacheReadRatio, cacheWriteRatio)
  return row === null
    ? 0
    : (((tokens.inputTokens - tokens.cacheReadTokens - tokens.cacheWriteTokens) * row.pricing.input)
      + (tokens.cacheReadTokens * row.pricing.cacheRead)
      + (tokens.cacheWriteTokens * row.pricing.cacheWrite)
      + (tokens.outputTokens * row.pricing.output)) / 1_000_000
}

export function buildPlan({ text = '', available = [], mode = 'collective', pricing = {}, liveBench = null, liveBenchError = '', budgetUsd = 0, cacheReadRatio = 0, cacheWriteRatio = 0 } = {}) {
  const complexity = assessComplexity(text)
  const taskType = classifyTask(text)
  const weights = OBJECTIVE_WEIGHTS[complexity.band]
  const discovered = Array.isArray(available)
    ? available.map(entry => ({ provider: String(entry.provider ?? ''), model: String(entry.model ?? '') }))
    : []
  const rows = []
  const normalizedPrices = normalizePricing(pricing)
  const maxCost = Math.max(1, ...MODEL_CATALOG.map(model => {
    const row = pricingFor(model, normalizedPrices)
    const effective = effectivePricing(row, cacheReadRatio, cacheWriteRatio)
    return effective.input + effective.output
  }), ...Object.values(normalizedPrices).map(row => {
    const effective = effectivePricing(row, cacheReadRatio, cacheWriteRatio)
    return effective.input + effective.output
  }))
  for (const route of discovered) {
    const metadata = modelMetadata(route.model) ?? {
      id: route.model, aliases: [route.model], quality: 0.66, latency: 0.55,
      costIn: 1, costOut: 4, specialties: [], risk: 0.24,
    }
    const live = liveBenchRow(liveBench, route.model)
    const liveScores = live?.scores ?? {}
    const liveOverall = asScore(live?.overall)
    const quality = asScore(liveScores?.[taskType]) ?? liveOverall ?? metadata.quality
    const pricingRow = pricingFor(metadata, normalizedPrices, route.provider)
    const specialty = specialtyMatch(metadata, taskType, liveScores)
    rows.push({
      provider: route.provider,
      model: route.model,
      metadata,
      quality,
      liveScores,
      liveOverall,
      latency: metadata.latency,
      risk: metadata.risk,
      specialty,
      pricing: pricingRow,
      score: 0,
      estimatedCost: estimateCost(metadata, text, 900, normalizedPrices, cacheReadRatio, cacheWriteRatio),
    })
  }
  const taskNodes = taskPackages(taskType, text, complexity.band)
  const usedRoutes = new Set()
  let constraintRelaxed = false
  const assignments = []
  for (const task of taskNodes) {
    const preferred = task.purpose === 'synthesis'
      ? rows.find(row => /deepseek[- ]?v4[- ]?pro/i.test(row.model))
        ?? rows.find(row => /deepseek/i.test(row.model))
      : null
    const selectedAssignment = preferred === null
      ? chooseAssignment(rows, task, weights, maxCost, usedRoutes, false, cacheReadRatio, cacheWriteRatio)
      : { row: preferred, relaxed: qualityForTask(preferred, task.type) < task.qualityFloor, floor: task.qualityFloor, qualityGap: Math.max(0, task.qualityFloor - qualityForTask(preferred, task.type)) }
    const row = selectedAssignment.row
    if (row !== null) {
      row.score = candidateUtility(row, task, weights, maxCost, usedRoutes, cacheReadRatio, cacheWriteRatio).score
      usedRoutes.add(routeKey(row.provider, row.model))
    }
    constraintRelaxed ||= selectedAssignment.relaxed
    assignments.push({ task, row, decision: selectedAssignment })
  }

  // A user budget is a hard secondary constraint. If the first utility pass
  // exceeds it, progressively replace the least-critical non-synthesis stage
  // with the cheapest candidate that still satisfies its quality floor.
  const budget = Number(budgetUsd)
  const totalFor = () => assignments.reduce((sum, assignment) => sum + taskCost(assignment.row, assignment.task, text, complexity.band, cacheReadRatio, cacheWriteRatio), 0)
  if (budget > 0 && totalFor() > budget) {
    const movable = assignments
      .filter(assignment => assignment.task.purpose !== 'synthesis')
      .sort((left, right) => (left.task.criticality ?? 0) - (right.task.criticality ?? 0))
    for (const assignment of movable) {
      if (totalFor() <= budget) break
      const alternatives = rows
        .filter(row => row !== assignment.row && qualityForTask(row, assignment.task.type) >= assignment.task.qualityFloor)
        .sort((left, right) => taskCost(left, assignment.task, text, complexity.band, cacheReadRatio, cacheWriteRatio) - taskCost(right, assignment.task, text, complexity.band, cacheReadRatio, cacheWriteRatio))
      const replacement = alternatives.find(row => taskCost(row, assignment.task, text, complexity.band, cacheReadRatio, cacheWriteRatio) < taskCost(assignment.row, assignment.task, text, complexity.band, cacheReadRatio, cacheWriteRatio))
      if (replacement !== undefined) assignment.row = replacement
    }
  }
  usedRoutes.clear()
  for (const assignment of assignments) if (assignment.row !== null) usedRoutes.add(routeKey(assignment.row.provider, assignment.row.model))
  rows.sort((a, b) => b.score - a.score)
  const selected = assignments[0]?.row ?? rows[0] ?? null
  const synthesizer = assignments.at(-1)?.row ?? rows.find(row => /deepseek/i.test(row.model)) ?? rows[0]
  const subtasks = assignments.map(({ task, row }) => ({
    name: task.name,
    type: task.type,
    recommended: row?.model ?? '待发现模型',
    recommendedProvider: row?.provider ?? '',
    purpose: task.purpose,
    criticality: task.criticality,
    qualityFloor: Number(task.qualityFloor.toFixed(3)),
  }))
  const costBreakdown = assignments.map(({ task, row }, index) => {
    const tokens = taskTokenBudget(text, task, complexity.band, cacheReadRatio, cacheWriteRatio)
    const estimatedCost = taskCost(row, task, text, complexity.band, cacheReadRatio, cacheWriteRatio)
    return {
      stage: index + 1,
      purpose: task.purpose,
      model: row?.model ?? '待发现模型',
      provider: row?.provider ?? '',
      inputTokens: tokens.inputTokens,
      cacheReadTokens: tokens.cacheReadTokens,
      cacheWriteTokens: tokens.cacheWriteTokens,
      outputTokens: tokens.outputTokens,
      estimatedCost: Number(estimatedCost.toFixed(6)),
      quality: Number((row === null ? 0 : qualityForTask(row, task.type)).toFixed(3)),
    }
  })
  const totalEstimate = costBreakdown.reduce((sum, row) => sum + row.estimatedCost, 0)
  const baselineCost = assignments.reduce((sum, { task }) => {
    const strongest = rows.reduce((best, row) => qualityForTask(row, task.type) > (best === null ? -1 : qualityForTask(best, task.type)) ? row : best, null)
    const tokens = taskTokenBudget(text, task, complexity.band, cacheReadRatio, cacheWriteRatio)
    return sum + (strongest === null ? 0 : (((tokens.inputTokens - tokens.cacheReadTokens - tokens.cacheWriteTokens) * strongest.pricing.input)
      + (tokens.cacheReadTokens * strongest.pricing.cacheRead)
      + (tokens.cacheWriteTokens * strongest.pricing.cacheWrite)
      + (tokens.outputTokens * strongest.pricing.output)) / 1_000_000)
  }, 0)
  const budgetExceeded = Number(budgetUsd) > 0 && totalEstimate > Number(budgetUsd)
  const savings = baselineCost <= 0 ? 0 : clamp((baselineCost - totalEstimate) / baselineCost)
  const reason = selected === null
    ? '尚未发现可用模型，保留 Harness 原始模型选择。'
    : `${complexity.band === 'simple' ? '低复杂度优先成本与响应速度' : complexity.band === 'balanced' ? '在质量、成本、延迟与风险之间平衡' : '高复杂度按关键度设置质量下限，再在可行候选中最小化费用'}；任务类型为 ${taskType}，已对 ${String(subtasks.length)} 个工作包进行约束指派。`
  return {
    mode,
    complexity: { value: Number(complexity.value.toFixed(3)), band: complexity.band },
    taskType,
    taskTypes: [...new Set(taskNodes.map(task => task.type).filter(type => type !== 'reasoning'))],
    objectiveWeights: weights,
    candidates: rows.slice(0, 8).map(row => ({ provider: row.provider, model: row.model, score: Number(row.score.toFixed(3)), quality: Number(row.quality.toFixed(3)), specialty: Number(row.specialty.toFixed(3)), estimatedCost: Number(row.estimatedCost.toFixed(6)), inputPrice: row.pricing.input, outputPrice: row.pricing.output })),
    selected: selected === null ? null : { provider: selected.provider, model: selected.model, estimatedCost: Number(selected.estimatedCost.toFixed(6)) },
    subtasks,
    synthesizer: synthesizer === undefined ? null : { provider: synthesizer.provider, model: synthesizer.model },
    estimatedCost: Number(totalEstimate.toFixed(6)),
    costBreakdown,
    optimization: {
      solver: 'quality-constrained greedy assignment with diversity penalty',
      qualityFloor: QUALITY_FLOORS[complexity.band],
      budgetUsd: Number(Number(budgetUsd) > 0 ? Number(budgetUsd) : 0),
      cacheReadRatio: normalizedCacheRatios(cacheReadRatio, cacheWriteRatio).read,
      cacheWriteRatio: normalizedCacheRatios(cacheReadRatio, cacheWriteRatio).write,
      budgetExceeded,
      constraintRelaxed,
      baselineAllStrongCost: Number(baselineCost.toFixed(6)),
      estimatedSavings: Number(savings.toFixed(4)),
      distinctRoutes: usedRoutes.size,
      liveBench: liveBench?.fetchedAt
        ? { source: liveBench.source ?? 'livebench', fetchedAt: liveBench.fetchedAt, models: Object.keys(liveBench.models ?? {}).length, stale: String(liveBenchError).length > 0, error: String(liveBenchError || '') }
        : { source: 'experimental-baseline', fetchedAt: null, models: 0, stale: false, error: String(liveBenchError || '') },
    },
    reason,
    generatedAt: new Date().toISOString(),
  }
}
