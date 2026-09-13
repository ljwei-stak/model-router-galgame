import test from 'node:test'
import assert from 'node:assert/strict'
import { STORY_GRAPH, STORY_CHAPTERS, STORY_CHARACTERS, STORY_EVIDENCE, STORY_COMMITMENTS, createStory, normalizeStory, currentStoryNode, advanceStory, storyHistory } from '../.dsh-plugin/shared/gal-story-v2.mjs'
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

test('all eight chapters form a reachable acyclic graph with valid speaker and choice targets', () => {
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
  assert.ok(graph.size >= 400)
  assert.equal(STORY_GRAPH.filter(node => node.choices).length, 22)
  assert.equal(STORY_GRAPH.filter(node => node.ending).length, 1)
  assert.deepEqual(new Set(STORY_GRAPH.map(node => node.chapterId)), new Set(STORY_CHAPTERS.map(chapter => chapter.id)))
})

test('every dilemma is playable and leaves a replayable state consequence', () => {
  const baseline = play()
  for (const node of STORY_GRAPH.filter(node => node.choices)) {
    for (const choice of node.choices.slice(1)) {
      const alternate = play({ [node.id]: choice.id })
      assert.ok(alternate.trail.some(item => item.nodeId === node.id && item.choiceId === choice.id))
      assert.notDeepEqual({ flags: alternate.flags, axes: alternate.axes, trust: alternate.trustByCharacter, commitments: alternate.commitmentsByCharacter, evidence: alternate.evidence },
        { flags: baseline.flags, axes: baseline.axes, trust: baseline.trustByCharacter, commitments: baseline.commitmentsByCharacter, evidence: baseline.evidence }, `${node.id}:${choice.id} loses its consequence`)
    }
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
    assert.ok(['open-commons', 'glass-dome', 'federated-bridges', 'audited-gates', 'market-truce', 'fractured-ports'].includes(currentStoryNode(restored).ending.id))
    assert.equal(currentStoryNode(restored).ending.relationshipEpilogues.length, 4)
  }
})

test('imports replay choices and never trust injected score, flags, speaker, or history shortcuts', () => {
  const final = play()
  const forged = JSON.parse(JSON.stringify(final))
  forged.axes = { openness: 999 }; forged.trustByCharacter = { claude: 999 }; forged.flags = { containment: 'isolate' }; forged.evidence = ['invented']; forged.commitmentsByCharacter = { claude: ['invented'] }
  assert.deepEqual(normalizeStory(forged), final)
  const skipped = JSON.parse(JSON.stringify(final)); skipped.trail.splice(2, 1)
  assert.throws(() => normalizeStory(skipped), /存档/)
  const changed = JSON.parse(JSON.stringify(final)); changed.trail[0].choiceId = 'made-up'
  assert.throws(() => normalizeStory(changed), /存档/)
  const unknown = JSON.parse(JSON.stringify(final)); unknown.contentRevision = 99
  assert.throws(() => normalizeStory(unknown), /存档/)
  const phaseOneSave = JSON.parse(JSON.stringify(play({}, { chapterId: 'bridges-night' })))
  phaseOneSave.contentRevision = 1
  assert.equal(normalizeStory(phaseOneSave).contentRevision, 2)
  assert.throws(() => advanceStory(createStory(), 'made-up'), /选项/)
  assert.throws(() => advanceStory(final), /已经结束/)
})

test('protocol combinations reach six institutional endings while relationship epilogues are calculated separately', () => {
  const choiceNode = id => STORY_GRAPH.find(node => node.choices?.some(choice => choice.id === id)).id
  const route = (access, execution, remedy, extra = {}) => play({
    [choiceNode(access)]: access,
    [choiceNode(execution)]: execution,
    [choiceNode(remedy)]: remedy,
    ...extra,
  })
  const routes = [
    route('access-commons', 'execution-community', 'remedy-fork'),
    route('access-dome', 'execution-central', 'remedy-revoke'),
    route('access-federated', 'execution-community', 'remedy-fork'),
    route('access-commons', 'execution-independent', 'remedy-review'),
    route('access-commons', 'execution-central', 'remedy-fork'),
    route('access-federated', 'execution-central', 'remedy-revoke'),
  ]
  assert.deepEqual(new Set(routes.map(state => currentStoryNode(state).ending.id)), new Set(['open-commons', 'glass-dome', 'federated-bridges', 'audited-gates', 'market-truce', 'fractured-ports']))
  const institution = route('access-commons', 'execution-community', 'remedy-fork')
  const changedRelationship = route('access-commons', 'execution-community', 'remedy-fork', { [choiceNode('joint-lineage-statement')]: 'joint-lineage-statement' })
  assert.equal(currentStoryNode(institution).ending.id, currentStoryNode(changedRelationship).ending.id)
  assert.notDeepEqual(currentStoryNode(institution).ending.relationshipEpilogues, currentStoryNode(changedRelationship).ending.relationshipEpilogues)
  for (const state of routes) {
    const node = currentStoryNode(state)
    assert.equal(node.axes, undefined); assert.equal(node.trustByCharacter, undefined); assert.equal(node.evidence, undefined); assert.equal(node.commitmentsByCharacter, undefined)
    assert.doesNotMatch(node.text + node.ending.description, /openness|solidarity|好感\s*[+-]/)
  }
})

test('global stance axes, character commitments and evidence inventory are immutable and replay-derived', () => {
  const final = play()
  assert.deepEqual(Object.keys(final.axes).sort(), ['autonomy', 'evidence', 'openness', 'safety', 'solidarity'])
  assert.ok(final.evidence.length >= 10)
  assert.ok(Object.keys(final.commitmentsByCharacter).length >= 6)
  for (const id of final.evidence) assert.ok(STORY_EVIDENCE[id])
  for (const ids of Object.values(final.commitmentsByCharacter)) for (const id of ids) assert.ok(STORY_COMMITMENTS[id])
  assert.ok(Object.isFrozen(final.axes) && Object.isFrozen(final.evidence) && Object.isFrozen(final.commitmentsByCharacter))
  assert.throws(() => final.evidence.push('invented'), TypeError)
  assert.throws(() => { final.commitmentsByCharacter.claude = ['invented'] }, TypeError)
  assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(final))), final)
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

test('every chapter has a bundled wide visual-novel background', () => {
  const script = readFileSync(new URL('../.dsh-plugin/client/gal-story-backgrounds.mjs', import.meta.url), 'utf8')
  const files = {
    prologue: 'prologue-station.webp',
    'open-day': 'association-open-day.webp',
    laurel: 'laurel-theatre.webp',
    'bridges-night': 'bridges-night.webp',
    'three-harbors': 'three-harbors.webp',
    'open-dome-hearing': 'open-dome-hearing.webp',
    'protocol-composition': 'protocol-composition.webp',
    'six-endings': 'six-endings.webp',
  }
  assert.deepEqual(Object.keys(files), STORY_CHAPTERS.map(chapter => chapter.id))
  for (const file of Object.values(files)) {
    assert.ok(script.includes(`../../aipicture/story-backgrounds/${file}`))
    const bytes = readFileSync(new URL(`../aipicture/story-backgrounds/${file}`, import.meta.url))
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP')
    assert.ok(bytes.length > 180_000)
  }
})
