import test from 'node:test'
import assert from 'node:assert/strict'
import {
  contentHasImage,
  modLensUpstream,
  routeThroughModLens,
} from '../.dsh-plugin/shared/modlens-routing.mjs'

const available = [
  { provider: 'deepseek-official', model: 'deepseek-v4-pro', inputModalities: ['text'] },
  { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp', inputModalities: ['text', 'image'] },
]
const visionBridges = [
  { provider: 'deepseek-modlens', upstream: 'deepseek-official', model: 'deepseek-v4-pro' },
]

test('recognizes official ModLens provider ids', () => {
  assert.equal(modLensUpstream('deepseek-modlens'), 'deepseek-official')
  assert.equal(modLensUpstream('modlens-opencode-go'), 'opencode-go')
  assert.equal(modLensUpstream('deepseek-official'), null)
})

test('detects direct and nested image blocks', () => {
  assert.equal(contentHasImage([{ type: 'image', attachment: { id: 'a' } }]), true)
  assert.equal(contentHasImage([{ type: 'tool-result', content: [{ type: 'image', attachment: { id: 'b' } }] }]), true)
  assert.equal(contentHasImage([{ type: 'text', text: 'no image' }]), false)
})

test('routes a text-only image request through the matching ModLens wrapper', () => {
  assert.deepEqual(routeThroughModLens({
    target: { provider: 'deepseek-official', model: 'deepseek-v4-pro', estimatedCost: 0.001 },
    available,
    visionBridges,
    hasImageBlocks: true,
  }), {
    provider: 'deepseek-modlens',
    model: 'deepseek-v4-pro',
    estimatedCost: 0.001,
  })
})

test('keeps native vision, text-only turns, and unmatched providers unchanged', () => {
  const nativeVision = { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' }
  assert.equal(routeThroughModLens({ target: nativeVision, available, visionBridges, hasImageBlocks: true }), nativeVision)

  const textOnly = { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
  assert.equal(routeThroughModLens({ target: textOnly, available, visionBridges, hasImageBlocks: false }), textOnly)

  const unmatched = { provider: 'other', model: 'plain' }
  assert.equal(routeThroughModLens({ target: unmatched, available, visionBridges, hasImageBlocks: true }), unmatched)
})
