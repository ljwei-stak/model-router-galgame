import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PERSONA_MARKER,
  PERSONA_PROFILES,
  buildPersonaPrompt,
  isHighRiskTask,
  isPersonaPrompt,
  personaForModel,
  personaKeyForModel,
} from '../.dsh-plugin/shared/persona.mjs'

test('persona mapping follows the same model families as GAL portraits', () => {
  assert.equal(personaKeyForModel('Qwen3.7 Plus', 'opencode'), 'qwen')
  assert.equal(personaForModel('Claude Sonnet 5', 'zen').title, '月光图书管理员')
  assert.equal(personaForModel('GPT 5.6 Sol', 'zen').displayName, 'ChatGPT')
  assert.equal(personaForModel('DeepSeek V4 Pro', 'deepseek').key, 'deepseek')
  assert.equal(personaForModel('ernie-5.1', 'baidu').key, 'ernie')
  assert.equal(Object.keys(PERSONA_PROFILES).length, 14)
})

test('persona prompt is an expression-only boundary', () => {
  const prompt = buildPersonaPrompt({ model: 'GPT 5.6 Sol', provider: 'zen', taskText: '写一篇产品说明' })
  assert.match(prompt, new RegExp(PERSONA_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(prompt, /不要改变问题理解、复杂度判断、任务拆分、模型选择/)
  assert.match(prompt, /代码、Markdown、KaTeX 公式、引用、链接、表格/)
  assert.equal(isPersonaPrompt(prompt), true)
  assert.equal(isPersonaPrompt('普通回答'), false)
})

test('high-risk tasks reduce roleplay and preserve safety language', () => {
  const task = '请给出这份合同的法律风险和投资建议'
  assert.equal(isHighRiskTask(task), true)
  const prompt = buildPersonaPrompt({ model: 'Grok 4.6', provider: 'zen', taskText: task })
  assert.match(prompt, /现实风险较高/)
  assert.match(prompt, /不使用玩笑、戏剧化动作/)
})
