import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createAttachmentApi,
  createInputAttachmentActions,
  inputAttachmentIds,
} from '../.dsh-plugin/client/attachment-bridge.mjs'
import { formatErrorChain } from '../.dsh-plugin/shared/error-diagnostics.mjs'

test('attachment bridge uses the DSH 0.1.5 session-scoped draft API', () => {
  const calls = []
  const image = { id: 'image-1', kind: 'image', previewUrl: 'blob:image' }
  const file = { id: 'file-1', kind: 'file' }
  const conversation = {
    createDrafts(sessionId, files) {
      calls.push(['create', sessionId, files])
      return [image]
    },
    resolveDraftAttachments(ids) {
      calls.push(['resolve', ids])
      return [image, file]
    },
    releaseDraftAttachment(id) { calls.push(['release-one', id]) },
    releaseDraftAttachments(items) { calls.push(['release-many', items]) },
  }
  const api = createAttachmentApi(conversation, 'session-0207')
  const files = [{ name: 'a.png' }]
  assert.deepEqual(api.createDraftImages(files), [image])
  assert.deepEqual(api.draftImages(['image-1']), [image])
  api.releaseDraftImage('image-1')
  api.releaseDraftImages([image])
  assert.deepEqual(calls, [
    ['create', 'session-0207', files],
    ['resolve', ['image-1']],
    ['release-one', 'image-1'],
    ['release-many', [image]],
  ])
})

test('attachment bridge retains the legacy image-only API', () => {
  const calls = []
  const image = { id: 'legacy-1' }
  const conversation = {
    createDraftImages(files) { calls.push(['create', files]); return [image] },
    draftImages(ids) { calls.push(['resolve', ids]); return [image] },
    releaseDraftImage(id) { calls.push(['release-one', id]) },
    releaseDraftImages(items) { calls.push(['release-many', items]) },
  }
  const api = createAttachmentApi(conversation, 'ignored')
  assert.deepEqual(api.createDraftImages([]), [image])
  assert.deepEqual(api.draftImages(['legacy-1']), [image])
  api.releaseDraftImage('legacy-1')
  api.releaseDraftImages([image])
  assert.deepEqual(calls.map(call => call[0]), ['create', 'resolve', 'release-one', 'release-many'])
})

test('input attachment actions use DSH 0.1.5 names', () => {
  const calls = []
  const actions = createInputAttachmentActions({
    addAttachments(ids) { calls.push(['add', ids]); return true },
    removeAttachment(id) { calls.push(['remove', id]); return true },
  })
  assert.equal(actions.add(['image-1']), true)
  assert.equal(actions.remove('image-1'), true)
  assert.deepEqual(calls, [
    ['add', ['image-1']],
    ['remove', 'image-1'],
  ])
  assert.deepEqual(inputAttachmentIds({ attachmentIds: ['image-1'] }), ['image-1'])
})

test('input attachment actions retain legacy image names', () => {
  const calls = []
  const actions = createInputAttachmentActions({
    addImages(ids) { calls.push(['add', ids]); return true },
    removeImage(id) { calls.push(['remove', id]); return true },
  })
  assert.equal(actions.add(['legacy-1']), true)
  assert.equal(actions.remove('legacy-1'), true)
  assert.deepEqual(calls.map(call => call[0]), ['add', 'remove'])
  assert.deepEqual(inputAttachmentIds({ imageIds: ['legacy-1'] }), ['legacy-1'])
})

test('error diagnostics include codes and causes without object payloads', () => {
  const cause = Object.assign(new Error('cannot resolve active package "example"'), { code: 'PACKAGE_RESOLVE' })
  const outer = Object.assign(new Error('DeepSeek request extension preparation failed', { cause }), {
    name: 'LlmError',
    code: 'REQUEST_EXTENSION',
    request: { apiKey: 'must-not-appear', prompt: 'must-not-appear' },
  })
  const output = formatErrorChain(outer)
  assert.equal(output, 'LlmError code=REQUEST_EXTENSION: DeepSeek request extension preparation failed <- caused by Error code=PACKAGE_RESOLVE: cannot resolve active package "example"')
  assert.doesNotMatch(output, /apiKey|prompt|must-not-appear/)
})

test('DSH 0.1.5 package inventory cannot block official DeepSeek requests', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(patch, /id:\s*plugin-package-inventory-deepseek[\s\S]*?enabled:\s*false/)
})
