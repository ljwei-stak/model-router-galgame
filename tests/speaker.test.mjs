import test from 'node:test'
import assert from 'node:assert/strict'
import { lineFromNode, nodesToLines, normalizeNodes, routeFromNode, shouldRenderMarkdown } from '../.dsh-plugin/client/transcript.mjs'
import { characterKeyForModel, characterLabelForModel } from '../.dsh-plugin/client/character-identity.mjs'
import { shouldFallbackToPlainText } from '../.dsh-plugin/client/markdown-safe.mjs'

test('assistant transcript lines retain the actual routed model', () => {
  const line = lineFromNode({
    kind: 'assistant',
    seq: 7,
    requestConfig: { provider: 'dashscope', model: 'qwen3.7-plus' },
    blocks: [{ kind: 'text', text: '**已完成**' }],
  })
  assert.deepEqual(
    { provider: line.provider, model: line.model },
    { provider: 'dashscope', model: 'qwen3.7-plus' },
  )
})

test('model names select the model maid even when routed through OpenCode Zen', () => {
  assert.equal(characterLabelForModel('GPT 5.6 Sol', 'zen'), 'ChatGPT')
  assert.equal(characterLabelForModel('Qwen3.7 Plus', 'opencode'), 'Qwen')
  assert.equal(characterLabelForModel('DeepSeek V4 Pro', 'zen'), 'DeepSeek')
  assert.equal(characterLabelForModel('Claude Sonnet 5', 'opencode'), 'Claude')
  assert.equal(characterLabelForModel('ernie-5.1', 'ernie'), 'ERNIE')
  assert.equal(characterKeyForModel('ERNIE 5.1', 'baidu'), 'ernie')
  assert.equal(characterKeyForModel('Big Pickle', 'opencode'), 'opencode')
})

test('only AI replies use Markdown rendering', () => {
  assert.equal(shouldRenderMarkdown({ kind: 'assistant' }), true)
  assert.equal(shouldRenderMarkdown({ kind: 'player' }), false)
  assert.equal(shouldRenderMarkdown({ kind: 'system' }), false)
})

test('route extraction falls back to provenance when requestConfig is incomplete', () => {
  assert.deepEqual(
    routeFromNode({ requestConfig: { provider: 'zen' }, provenance: { provider: 'deepseek', model: 'DeepSeek V4 Pro' } }),
    { provider: 'deepseek', model: 'DeepSeek V4 Pro' },
  )
})

test('persona context is hidden from the player transcript', () => {
  const line = lineFromNode({
    kind: 'user',
    seq: 9,
    content: [{ type: 'text', text: '[Model Router Persona 表达层]\n只调整最终答复措辞。' }],
  })
  assert.equal(line, null)
})

test('an empty session snapshot supplies a stable empty node list', () => {
  const first = normalizeNodes(undefined)
  const second = normalizeNodes(null)

  assert.deepEqual(first, [])
  assert.equal(first, second)
  assert.deepEqual(nodesToLines(undefined), [])
})

test('unsafe streamed Markdown falls back to plain text without taking down GAL', () => {
  assert.equal(shouldFallbackToPlainText('normal **reply**'), false)
  assert.equal(shouldFallbackToPlainText('```mermaid\nflowchart TB\n```'), true)
  assert.equal(shouldFallbackToPlainText('~~~code~~~'), true)
  assert.equal(shouldFallbackToPlainText('normal **reply**', true), true)
})
