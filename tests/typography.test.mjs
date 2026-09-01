import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { defaultScene, findDialogue, makeElement, normalizeScene } from '../.dsh-plugin/client/scene.mjs'
import { CSS } from '../.dsh-plugin/client/styles.mjs'

test('new GAL scenes use readable dialogue typography', () => {
  const scene = defaultScene()
  const dialogue = findDialogue(scene)
  const text = scene.elements.find(element => element.type === 'dialogue-text')
  const speaker = scene.elements.find(element => element.type === 'speaker-name')

  assert.ok(dialogue.fontSize >= 20)
  assert.ok(text.fontSize >= 24)
  assert.ok(speaker.fontSize >= 18)
  assert.equal(makeElement('dialogue-text').fontSize, 24)
})

test('existing saved scenes are upgraded without shrinking larger user sizes', () => {
  const scene = normalizeScene({
    settings: {},
    elements: [
      { id: 'old-dialogue', type: 'dialogue', fontSize: 12 },
      { id: 'old-text', type: 'dialogue-text', fontSize: 17 },
      { id: 'large-text', type: 'dialogue-text', fontSize: 42 },
      { id: 'old-speaker', type: 'speaker-name', fontSize: 10 },
    ],
  })
  assert.equal(scene.elements.find(element => element.id === 'old-dialogue').fontSize, 20)
  assert.equal(scene.elements.find(element => element.id === 'old-text').fontSize, 24)
  assert.equal(scene.elements.find(element => element.id === 'large-text').fontSize, 42)
  assert.equal(scene.elements.find(element => element.id === 'old-speaker').fontSize, 18)
})

test('GAL Markdown inherits the scene element font and color', () => {
  assert.match(
    CSS,
    /\.gv-dtext > div, \.gv-dialogue-body > div \{[^}]*font: inherit !important;[^}]*color: inherit !important;/s,
  )
  assert.match(CSS, /\.gv-dtext \.katex-display[^}]*max-width: 100%;[^}]*overflow-x: auto;/s)
  assert.match(CSS, /\.gv-dtext \[class\*="tableScroll"\][^}]*overflow-x: auto;/s)
  assert.match(CSS, /\.gv-dtext pre, \.gv-dialogue-body pre[^}]*max-width: 100%;[^}]*overflow: auto;/s)
})

test('standalone client bundle keeps the host React bridge and Markdown styles', () => {
  const bundle = readFileSync(new URL('../.dsh-plugin/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /require\("react"\)/)
  assert.match(bundle, /require\("react\/jsx-runtime"\)/)
  assert.match(bundle, /data-model-router-markdown/)
  assert.match(bundle, /katex-display/)
})
