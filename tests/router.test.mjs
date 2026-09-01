import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assessComplexity,
  buildPlan,
  classifyTask,
  collectOpenCodeEndpointRepairs,
  detectTaskTypes,
  isOfficialOpenCodeEndpoint,
  modelMetadata,
} from '../.dsh-plugin/shared/router.mjs'
import { fetchLiveBenchSnapshot, normalizeLiveBenchPayload, parseCsv } from '../.dsh-plugin/shared/livebench.mjs'

const routes = [
  { provider: 'zen', model: 'DeepSeek V4 Flash' },
  { provider: 'zen', model: 'GPT 5.6 Sol' },
  { provider: 'zen', model: 'Qwen3.7 Plus' },
]

test('classifies simple and specialized tasks', () => {
  assert.equal(classifyTask('请把这句话翻译成英文'), 'general')
  assert.equal(classifyTask('请证明这个数学定理并给出公式'), 'math')
  assert.equal(classifyTask('请实现一个带测试的 REST API'), 'code')
  assert.equal(assessComplexity('请简要解释什么是缓存').band, 'simple')
  assert.equal(assessComplexity('请设计系统架构，拆分模块并编写测试与部署方案').band, 'complex')
})

test('scores available routes and returns a cost estimate', () => {
  const plan = buildPlan({ text: '请设计系统架构，拆分模块并编写测试与部署方案', available: routes })
  assert.equal(plan.taskType, 'code')
  assert.equal(plan.complexity.band, 'complex')
  assert.equal(plan.candidates.length, 3)
  assert.ok(plan.selected)
  assert.ok(plan.estimatedCost > 0)
  assert.ok(plan.synthesizer)
  assert.equal(plan.subtasks.at(-1).purpose, 'synthesis')
  assert.equal(modelMetadata('GPT 5.6 Sol').id, 'gpt-5.6-sol')
  assert.ok(plan.optimization.qualityFloor >= 0.78)
  assert.ok(Number.isFinite(plan.optimization.estimatedSavings))
})

test('splits a mixed complex request into separate business directions', () => {
  const text = '请研究相关论文，证明核心数学结论，设计并实现代码接口，最后分析截图中的结果并给出完整报告。'
  const types = detectTaskTypes(text)
  assert.ok(types.includes('research'))
  assert.ok(types.includes('math'))
  assert.ok(types.includes('code'))
  assert.ok(types.includes('vision'))
  const plan = buildPlan({ text, available: routes })
  const executionTypes = plan.subtasks.filter(task => task.purpose === 'execution').map(task => task.type)
  assert.ok(executionTypes.includes('research'))
  assert.ok(executionTypes.includes('math'))
  assert.ok(executionTypes.includes('code'))
  assert.ok(executionTypes.includes('vision'))
  assert.ok(plan.taskTypes.length >= 4)
})

test('applies user pricing overrides and task-specific LiveBench scores', () => {
  const liveBench = normalizeLiveBenchPayload({ models: [
    { model: 'GPT 5.6 Sol', overall: 99, code: 98, math: 91 },
    { model: 'Qwen3.7 Plus', overall: 88, code: 84, math: 90 },
  ] }, 1700000000000)
  const plan = buildPlan({
    text: '请实现一个简单的代码格式转换器',
    available: routes,
    pricing: {
      'GPT 5.6 Sol': { input: 100, output: 100, cacheRead: 0, cacheWrite: 0, currency: 'USD' },
      'Qwen3.7 Plus': { input: 0.01, output: 0.02, cacheRead: 0, cacheWrite: 0, currency: 'USD' },
    },
    liveBench,
  })
  const gpt = plan.candidates.find(candidate => candidate.model === 'GPT 5.6 Sol')
  assert.equal(gpt.quality, 0.98)
  assert.equal(gpt.inputPrice, 100)
  assert.ok(plan.estimatedCost < 1)
  assert.ok(plan.optimization.liveBench.fetchedAt)

  const routeSpecific = buildPlan({
    text: '请实现一个简单的代码格式转换器',
    available: routes,
    pricing: {
      'GPT 5.6 Sol': { input: 100, output: 100, cacheRead: 0, cacheWrite: 0, currency: 'USD' },
      'zen/GPT 5.6 Sol': { input: 77, output: 88, cacheRead: 0, cacheWrite: 0, currency: 'USD' },
    },
    liveBench,
  })
  assert.equal(routeSpecific.candidates.find(candidate => candidate.model === 'GPT 5.6 Sol').inputPrice, 77)
})

test('budget fallback lowers low-criticality stage cost without violating quality floor', () => {
  const plan = buildPlan({
    text: '请设计一个复杂工程架构，拆分模块，编写代码和测试，并给出部署方案',
    available: routes,
    budgetUsd: 0.001,
  })
  assert.equal(plan.optimization.budgetUsd, 0.001)
  assert.ok(plan.subtasks.every(task => task.qualityFloor >= 0.78 || plan.optimization.constraintRelaxed))
  assert.ok(plan.optimization.budgetExceeded || plan.estimatedCost <= 0.001)
})

test('recognizes an official OpenCode website override but preserves custom routes', () => {
  assert.equal(isOfficialOpenCodeEndpoint('opencode', 'https://opencode.ai'), true)
  assert.equal(isOfficialOpenCodeEndpoint('opencode', 'https://opencode.ai/zen/v1'), true)
  assert.equal(isOfficialOpenCodeEndpoint('opencode-go', 'https://www.opencode.ai/zen/go'), true)
  assert.equal(isOfficialOpenCodeEndpoint('opencode-zen', 'https://opencode.ai/zen'), true)
  assert.equal(isOfficialOpenCodeEndpoint('opencode-go-zen', 'https://opencode.ai/zen/go/v1'), true)
  assert.equal(isOfficialOpenCodeEndpoint('opencode', 'https://gateway.example/v1'), false)
  assert.equal(isOfficialOpenCodeEndpoint('openai', 'https://opencode.ai'), false)
  assert.equal(isOfficialOpenCodeEndpoint('opencode', 'https://opencode.ai'), true)
})

test('creates a path mutation only for user-owned catalog endpoint overrides', () => {
  assert.deepEqual(
    collectOpenCodeEndpointRepairs({
      providers: {
        opencode: { apiKeyEnv: 'OPENCODE_API_KEY', baseURL: 'https://opencode.ai/zen' },
        'opencode-zen': { baseURL: 'https://www.opencode.ai/zen/v1' },
        'opencode-go': { baseURL: 'https://gateway.example/v1' },
        openai: { baseURL: 'https://opencode.ai' },
      },
    }),
    [
      { op: 'unset', path: ['providers', 'opencode', 'baseURL'] },
      { op: 'unset', path: ['providers', 'opencode-zen', 'baseURL'] },
    ],
  )
  assert.deepEqual(
    collectOpenCodeEndpointRepairs({ providers: { opencode: { models: [{ id: 'catalog-model' }], baseURL: 'https://opencode.ai' } } }),
    [{ op: 'unset', path: ['providers', 'opencode', 'baseURL'] }],
  )
})

test('parses quoted CSV fields and normalizes an official LiveBench snapshot', async () => {
  const csv = 'model,code_generation,math_comp\n"GPT, 5.6",80,90\nDeepSeek V4 Pro,70,95\n'
  const rows = parseCsv(csv)
  assert.equal(rows[0].model, 'GPT, 5.6')
  assert.equal(rows[1].math_comp, '95')

  const responses = new Map([
    ['https://livebench.ai', '<script src="./static/js/main.test.js"></script>'],
    ['https://livebench.ai/static/js/main.test.js', 'const releases=["2025-11-25","2026-06-25"]'],
    ['https://livebench.ai/table_2026_06_25.csv', 'model,code_generation,math_comp\nDeepSeek V4 Pro,70,95\n'],
    ['https://livebench.ai/categories_2026_06_25.json', JSON.stringify({ Coding: ['code_generation'], Mathematics: ['math_comp'] })],
  ])
  const snapshot = await fetchLiveBenchSnapshot({
    endpoint: 'https://livebench.ai',
    fetchImpl: async url => {
      const body = responses.get(String(url))
      if (body === undefined) return { ok: false, status: 404, text: async () => '' }
      return { ok: true, status: 200, headers: { get: () => String(url).includes('.csv') ? 'text/csv' : 'application/json' }, text: async () => body }
    },
  })
  assert.equal(snapshot.source, 'livebench:2026-06-25')
  assert.equal(snapshot.models.deepseekv4pro.scores.code, 0.7)
  assert.equal(snapshot.models.deepseekv4pro.scores.math, 0.95)
})

test('accepts a user JSON or CSV mirror', async () => {
  const jsonSnapshot = await fetchLiveBenchSnapshot({
    endpoint: 'https://mirror.example/livebench.json',
    fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ models: [{ model: 'Qwen3.7 Plus', overall: 88, code: 84 }] }) }),
  })
  assert.equal(jsonSnapshot.source, 'livebench-json-mirror')
  assert.equal(jsonSnapshot.models.qwen37plus.scores.code, 0.84)

  const csvSnapshot = await fetchLiveBenchSnapshot({
    endpoint: 'https://mirror.example/livebench.csv',
    fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => 'text/csv' }, text: async () => 'model,code,math\nQwen3.7 Plus,84,90\n' }),
  })
  assert.equal(csvSnapshot.source, 'livebench-csv-mirror')
  assert.equal(csvSnapshot.models.qwen37plus.scores.math, 0.9)
})

test('includes optional cache read/write tokens in the cost model', () => {
  const base = buildPlan({
    text: '请总结这份短文',
    available: routes,
    pricing: {
      'Qwen3.7 Plus': { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0.2, currency: 'USD' },
    },
  })
  const cached = buildPlan({
    text: '请总结这份短文',
    available: routes,
    pricing: {
      'Qwen3.7 Plus': { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0.2, currency: 'USD' },
    },
    cacheReadRatio: 0.5,
    cacheWriteRatio: 0.1,
  })
  assert.ok(cached.costBreakdown[0].cacheReadTokens > 0)
  assert.ok(cached.costBreakdown[0].cacheWriteTokens > 0)
  assert.ok(cached.estimatedCost < base.estimatedCost)
})
