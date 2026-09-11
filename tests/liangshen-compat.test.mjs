import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { repairLiangshenPreset } from '../.dsh-plugin/shared/liangshen-compat.mjs'

const PERSONA_OLD = '    text: You are a helpful software engineer assistant.'
const PERSONA_CURRENT = '    prefix: You are a helpful software engineer assistant.'
const SECTIONS_OLD = "const PERSONA_SECTION_NAMES = new Set(['deployment:persona', 'persona'])"
const SECTIONS_CURRENT = "const PERSONA_SECTION_NAMES = new Set(['deployment:persona-prefix', 'deployment:persona', 'persona'])"

async function fixture(agent = PERSONA_OLD, bootstrap = SECTIONS_OLD) {
  const root = await mkdtemp(join(tmpdir(), 'model-router-liangshen-'))
  const preset = join(root, '.agent-presets', 'liangshen')
  await mkdir(preset, { recursive: true })
  await writeFile(join(preset, 'agent.cordis.yml'), `- id: persona\n  config:\n${agent}\n`)
  await writeFile(join(preset, 'tool-bootstrap.mjs'), `${bootstrap}\n`)
  return { root, preset }
}

test('repairs the exact dsh-liangshen 0.3.20 DSH 0.1.5 incompatibilities', async t => {
  const { root, preset } = await fixture()
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(repairLiangshenPreset({ dshHome: root }).kind, 'repaired')
  assert.match(await readFile(join(preset, 'agent.cordis.yml'), 'utf8'), /prefix: You are a helpful software engineer assistant\./)
  assert.match(await readFile(join(preset, 'tool-bootstrap.mjs'), 'utf8'), /deployment:persona-prefix/)
  assert.equal(repairLiangshenPreset({ dshHome: root }).kind, 'current')
})

test('leaves an unknown future LiangShen layout byte-identical', async t => {
  const { root, preset } = await fixture('    content: future persona', SECTIONS_CURRENT)
  t.after(() => rm(root, { recursive: true, force: true }))
  const agentPath = join(preset, 'agent.cordis.yml')
  const bootstrapPath = join(preset, 'tool-bootstrap.mjs')
  const before = await Promise.all([readFile(agentPath), readFile(bootstrapPath)])

  assert.equal(repairLiangshenPreset({ dshHome: root }).kind, 'unsupported')
  const after = await Promise.all([readFile(agentPath), readFile(bootstrapPath)])
  assert.deepEqual(after, before)
})

test('reports an absent preset without creating files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'model-router-liangshen-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  assert.equal(repairLiangshenPreset({ dshHome: root }).kind, 'absent')
})

test('accepts a fully updated preset without rewriting it', async t => {
  const { root, preset } = await fixture(PERSONA_CURRENT, SECTIONS_CURRENT)
  t.after(() => rm(root, { recursive: true, force: true }))
  const agentPath = join(preset, 'agent.cordis.yml')
  const before = await readFile(agentPath)
  assert.equal(repairLiangshenPreset({ dshHome: root }).kind, 'current')
  assert.deepEqual(await readFile(agentPath), before)
})
