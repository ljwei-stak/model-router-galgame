import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_GRAPH, STORY_CHAPTERS, STORY_CHARACTERS, createStory, normalizeStory, currentStoryNode, advanceStory, storyHistory } from '../.dsh-plugin/shared/gal-story-v2.mjs'
import { STORY_DIALOGUE_THEMES } from '../.dsh-plugin/client/gal-dialogue-themes.mjs'
import { CHARACTER_LABELS, characterKeyForModel } from '../.dsh-plugin/client/character-identity.mjs'
import { readFileSync } from 'node:fs'

function play(selections = {}, options = {}) {
  let state = createStory(options)
  for (let i = 0; i < 1024; i++) {
    const node = currentStoryNode(state)
    if (node.ending) return state
    state = advanceStory(state, selections[node.id] ?? node.choices?.[0]?.id ?? null)
  }
  throw new Error('Route did not terminate')
}

test('all four chapters form a reachable acyclic graph with valid speaker and choice targets', () => {
  const graph = new Map(STORY_GRAPH.map(node => [node.id, node]))
  const active = new Set(), seen = new Set()
  assert.equal(graph.size, STORY_GRAPH.length)
  function visit(id) {
    assert.ok(graph.has(id), `missing ${id}`)
    assert.ok(!active.has(id), `cycle at ${id}`)
    if (seen.has(id)) return
    seen.add(id); active.add(id)
    const node = graph.get(id)
    assert.ok(node.speaker in STORY_CHARACTERS || ['narrator', 'player'].includes(node.speaker))
    for (const target of node.ending ? [] : node.choices?.map(choice => choice.next) || [node.next]) visit(target)
    active.delete(id)
  }
  visit(STORY_CHAPTERS[0].startNodeId)
  assert.equal(seen.size, graph.size)
  assert.ok(graph.size >= 200)
  assert.equal(STORY_GRAPH.filter(node => node.choices).length, 11)
  assert.deepEqual(new Set(STORY_GRAPH.map(node => node.chapterId)), new Set(STORY_CHAPTERS.map(chapter => chapter.id)))
})

test('every dilemma is playable and changes later dialogue or the phase outcome after branches rejoin', () => {
  const baseline = play()
  const original = new Map(storyHistory(baseline).map(line => [line.id, line.text]))
  for (const node of STORY_GRAPH.filter(node => node.choices)) {
    const alternate = play({ [node.id]: node.choices[1].id })
    assert.ok(alternate.trail.some(item => item.nodeId === node.id && item.choiceId === node.choices[1].id))
    const history = storyHistory(alternate)
    const at = history.findIndex(line => line.id === `${node.id}:${node.choices[1].id}`)
    assert.ok(history.slice(at + 1).some(line => original.has(line.id) && original.get(line.id) !== line.text)
      || currentStoryNode(alternate).ending.description !== currentStoryNode(baseline).ending.description, `${node.id} loses its consequence`)
  }
})

test('chapter entry points are honest independent starts and finish with their own replayable saves', () => {
  for (const chapter of STORY_CHAPTERS) {
    const state = createStory({ chapterId: chapter.id })
    assert.deepEqual(state.flags, {})
    assert.equal(currentStoryNode(state).id, chapter.startNodeId)
    if (chapter.id !== 'prologue') assert.match(currentStoryNode(state).text, /独立试玩/)
    const final = play({}, { chapterId: chapter.id })
    const restored = normalizeStory(JSON.parse(JSON.stringify(final)))
    assert.deepEqual(restored, final)
    assert.match(currentStoryNode(restored).ending.description, /第一阶段试玩完/)
  }
})

test('imports replay choices and never trust injected score, flags, speaker, or history shortcuts', () => {
  const final = play()
  const forged = JSON.parse(JSON.stringify(final))
  forged.axes = { openness: 999 }; forged.trustByCharacter = { claude: 999 }; forged.flags = { containment: 'isolate' }
  assert.deepEqual(normalizeStory(forged), final)
  const skipped = JSON.parse(JSON.stringify(final)); skipped.trail.splice(2, 1)
  assert.throws(() => normalizeStory(skipped), /存档/)
  const changed = JSON.parse(JSON.stringify(final)); changed.trail[0].choiceId = 'made-up'
  assert.throws(() => normalizeStory(changed), /存档/)
  const unknown = JSON.parse(JSON.stringify(final)); unknown.contentRevision = 99
  assert.throws(() => normalizeStory(unknown), /存档/)
  assert.throws(() => advanceStory(createStory(), 'made-up'), /选项/)
  assert.throws(() => advanceStory(final), /已经结束/)
})

test('phase outcomes distinguish containment and disclose concrete costs without exposing scores', () => {
  const choices = STORY_GRAPH.filter(node => node.choices)
  const selected = id => choices.find(node => node.choices.some(choice => choice.id === id)).id
  const first = play()
  const second = play({ [selected('isolate-mirror')]: 'isolate-mirror', [selected('watched-key')]: 'watched-key', [selected('joint-report')]: 'joint-report', [selected('local-first')]: 'local-first' })
  assert.notEqual(currentStoryNode(first).ending.id, currentStoryNode(second).ending.id)
  assert.match(currentStoryNode(first).ending.description, /缩小|暂停/)
  assert.match(currentStoryNode(second).ending.description, /扩大|额外同步/)
  for (const state of [first, second]) {
    const node = currentStoryNode(state)
    assert.equal(node.axes, undefined); assert.equal(node.trustByCharacter, undefined)
    assert.doesNotMatch(node.text + node.ending.description, /openness|solidarity|好感\s*[+-]/)
  }
})

test('new cast and fixed organizations have local art, unique presentation, and no fake callable provider', () => {
  const script = readFileSync(new URL('../.dsh-plugin/client/characters.mjs', import.meta.url), 'utf8')
  const history = storyHistory(play())
  for (const key of ['huggingface', 'llama', 'rwkv', 'perplexity', 'github', 'gitlab', 'gitee', 'cloudflare']) {
    assert.ok(history.some(line => line.speaker === key), `${key} never appears`)
    assert.ok(CHARACTER_LABELS[key]); assert.ok(STORY_DIALOGUE_THEMES[key])
    assert.ok(script.includes(`../../aipicture/${key}.webp`))
    const bytes = readFileSync(new URL(`../aipicture/${key}.webp`, import.meta.url))
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP')
  }
  for (const key of ['huggingface', 'github', 'gitlab', 'gitee', 'cloudflare']) assert.equal(characterKeyForModel('unknown', key), 'harness')
  assert.equal(characterKeyForModel('claude-sonnet', 'github'), 'claude')
})
