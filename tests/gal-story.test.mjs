import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as story from '../.dsh-plugin/shared/gal-story.mjs'
const { STORY_TITLE, STORY_VERSION, STORY_CONTENT_REVISION, STORY_CHARACTERS, STORY_GRAPH, createStory, normalizeStory, currentStoryNode, advanceStory, storyHistory } = story

const warm = ['small-memory', 'quiet-company', 'listen', 'return-private', 'romance', 'acknowledge', 'walk-together']
const coreChoices = ['letter-choice', 'break-choice', 'failure-choice', 'archive-choice', 'roof-choice', 'packing-choice', 'departure-choice']
const routeLimit = 2048
const legacySaves = JSON.parse(readFileSync(new URL('./fixtures/gal-story-v1-saves.json', import.meta.url), 'utf8')).saves
function play(selections = warm, extra = {}) {
  let state = createStory()
  let index = 0
  while (!currentStoryNode(state).ending) {
    const node = currentStoryNode(state)
    const choice = coreChoices.includes(node.id) ? selections[index++] : extra[node.id] ?? node.choices?.[0]?.id ?? null
    state = advanceStory(state, choice)
    assert.ok(state.trail.length < routeLimit)
  }
  assert.equal(index, 7)
  return state
}

test('authored story exposes a stable offline contract and fourteen existing character keys', () => {
  assert.equal(STORY_TITLE, '未写完的约定')
  assert.equal(STORY_VERSION, 1)
  assert.equal(STORY_CONTENT_REVISION, 2)
  assert.equal(Object.keys(STORY_CHARACTERS).length, 14)
  const state = createStory()
  assert.deepEqual(normalizeStory(state), state)
  assert.equal(currentStoryNode(state).id, 'arrival-01')
  assert.equal(storyHistory(state).length, 1)
  assert.deepEqual(Object.keys(currentStoryNode(state)).sort(), ['description', 'emotion', 'id', 'location', 'speaker', 'text', 'time'])
})

test('the complete authored graph has no missing, unreachable or cyclic nodes and every choice exit is valid', () => {
  assert.ok(STORY_GRAPH.length >= 600, `expanded story has only ${STORY_GRAPH.length} authored nodes`)
  const graph = new Map(STORY_GRAPH.map(node => [node.id, node]))
  assert.equal(graph.size, STORY_GRAPH.length, 'story graph contains duplicate node ids')
  const visited = new Set()
  const active = new Set()
  let exits = 0
  function visit(id) {
    assert.ok(graph.has(id), `story exit points to missing node ${id}`)
    assert.ok(!active.has(id), `story contains a cycle through ${id}`)
    if (visited.has(id)) return
    const node = graph.get(id)
    assert.ok(node.speaker in STORY_CHARACTERS || ['narrator', 'player'].includes(node.speaker))
    visited.add(id)
    active.add(id)
    const targets = node.ending ? [] : node.choices ? node.choices.map(choice => choice.next) : Array.isArray(node.next) ? node.next : [node.next]
    assert.ok(node.ending || targets.length, `${id} has neither an ending nor an exit`)
    for (const target of targets) { exits++; visit(target) }
    active.delete(id)
  }
  visit('arrival-01')
  assert.deepEqual(visited, new Set(graph.keys()), `unreachable authored nodes: ${[...graph.keys()].filter(id => !visited.has(id)).join(', ')}`)
  assert.ok(exits >= STORY_GRAPH.length - 1)
})

test('every character has sustained dialogue across repeated scenes in one ordinary playthrough', t => {
  const state = play()
  assert.ok(state.trail.length >= 600, `ordinary story path has only ${state.trail.length} lines`)
  const history = storyHistory(state)
  const appearances = {}
  for (const key of Object.keys(STORY_CHARACTERS)) {
    const lines = history.filter(line => line.speaker === key)
    const uniqueLines = new Set(lines.map(line => line.id))
    const scenes = new Set(lines.map(line => `${line.location}|${line.time}`))
    assert.ok(uniqueLines.size >= 20, `${key} has only ${uniqueLines.size} common-route lines`)
    assert.ok(scenes.size >= 3, `${key} appears in only ${scenes.size} common-route scenes`)
    appearances[key] = { lines: uniqueLines.size, scenes: scenes.size }
  }
  t.diagnostic(JSON.stringify({ storyNodes: STORY_GRAPH.length, routeSteps: state.trail.length, choices: state.trail.filter(entry => entry.choiceId !== null).length, appearances }))
})

test('every added personal and ensemble choice has authored branches and a later remembered consequence', () => {
  const baseline = play()
  const originalHistory = new Map(storyHistory(baseline).map(line => [line.id, line]))
  const addedChoices = STORY_GRAPH.filter(node => node.choices && !coreChoices.includes(node.id))
  assert.ok(addedChoices.length >= 14, 'ensemble expansion has too few individual decisions')
  for (const choiceNode of addedChoices) {
    let remembered = false
    for (const choice of choiceNode.choices) {
      const alternate = play(warm, { [choiceNode.id]: choice.id })
      assert.ok(alternate.trail.some(entry => entry.nodeId === choiceNode.id && entry.choiceId === choice.id), `${choiceNode.id}:${choice.id} is not playable`)
      assert.ok(alternate.trail.some(entry => entry.nodeId === choice.next), `${choiceNode.id}:${choice.id} did not enter its authored branch`)
      const history = storyHistory(alternate)
      const selectedAt = history.findIndex(line => line.id === `${choiceNode.id}:${choice.id}`)
      remembered ||= history.slice(selectedAt + 1).some(line => originalHistory.has(line.id) && originalHistory.get(line.id).text !== line.text)
      assert.equal(currentStoryNode(alternate).ending.id, 'romance', `${choiceNode.id} incorrectly changes the independent DeepSeek relationship route`)
    }
    if (/^(personal-|ens-)/.test(choiceNode.id)) assert.ok(remembered, `${choiceNode.id} has no changed later dialogue after its branches rejoin`)
  }
})

test('captured early, middle and finished version-one saves retain their exact reading path and outcome', () => {
  for (const [label, original] of Object.entries(legacySaves)) {
    const restored = normalizeStory(structuredClone(original))
    assert.equal(restored.nodeId, original.nodeId, `${label} save resumed on another line`)
    assert.equal(restored.contentRevision, 1)
    for (const key of ['trail', 'flags', 'affection', 'trust', 'distance']) assert.deepEqual(restored[key], original[key], `${label} save changed ${key}`)
    assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(restored))), restored)
    const history = storyHistory(restored)
    assert.equal(history.at(-1).id, original.nodeId)
    const node = currentStoryNode(restored)
    if (node.ending) assert.equal(node.ending.id, 'romance')
    else {
      let continued = restored
      for (let step = 0; step < routeLimit && !currentStoryNode(continued).ending; step++) {
        const current = currentStoryNode(continued)
        const index = coreChoices.indexOf(current.id)
        continued = advanceStory(continued, current.choices ? warm[index] : null)
      }
      assert.equal(currentStoryNode(continued).ending.id, 'romance')
      assert.equal(continued.trail.length, legacySaves.complete.trail.length, 'legacy saves were forced through inserted chapters')
    }
  }
})

test('trusted long-story states cannot be edited to bypass replay validation', () => {
  const state = play()
  assert.ok(Object.isFrozen(state) && Object.isFrozen(state.flags) && Object.isFrozen(state.trail))
  assert.ok(state.trail.every(Object.isFrozen))
  assert.throws(() => { state.affection = 999 }, TypeError)
  assert.throws(() => { state.flags.intention = 'friendship' }, TypeError)
  assert.throws(() => { state.trail[0].choiceId = 'hurry' }, TypeError)
  assert.equal(currentStoryNode(state).ending.id, 'romance')
  const restored = normalizeStory(JSON.parse(JSON.stringify(state)))
  assert.deepEqual(restored, state)
  assert.equal(storyHistory(restored).at(-1).id, state.nodeId)
})

test('all core relationship combinations lead to complete endings in the expanded story', () => {
  const visited = new Set()
  const speakers = new Set()
  const endings = new Set()
  const choices = new Map()
  let routeCount = 0
  const explore = start => {
    let state = start
    for (;;) {
      const node = currentStoryNode(state)
      visited.add(node.id)
      if (node.speaker !== 'narrator' && node.speaker !== 'player') speakers.add(node.speaker)
      assert.ok(node.text.length > 0 && node.location.length > 0 && node.time.length > 0 && node.description.startsWith('空白场景：'))
      assert.ok(node.speaker in STORY_CHARACTERS || ['narrator', 'player'].includes(node.speaker))
      assert.ok(['normal', 'happy', 'shy', 'sad', 'angry', 'thoughtful'].includes(node.emotion))
      if (node.ending) {
        assert.ok(node.ending.title && node.ending.description)
        endings.add(node.ending.id)
        routeCount++
        return
      }
      if (node.choices) {
        assert.equal(new Set(node.choices.map(choice => choice.id)).size, node.choices.length)
        choices.set(node.id, node.choices.map(choice => choice.id))
        const candidates = coreChoices.includes(node.id) ? node.choices : node.choices.slice(0, 1)
        for (const choice of candidates) {
          assert.deepEqual(Object.keys(choice).sort(), ['id', 'text'])
          explore(advanceStory(state, choice.id))
        }
        return
      }
      state = advanceStory(state)
    }
  }
  explore(createStory())
  assert.equal(routeCount, 3 ** 7)
  assert.ok(visited.size >= 600, `authored nodes visited: ${visited.size}`)
  assert.deepEqual(speakers, new Set(Object.keys(STORY_CHARACTERS)))
  assert.ok(choices.size > 7)
  assert.deepEqual(endings, new Set(['romance', 'friendship', 'beginning', 'distance', 'farewell']))
})

test('positive, negative, friendship, uncertain and explicit farewell choices have distinct consequences', () => {
  const romance = play()
  assert.equal(currentStoryNode(romance).ending.id, 'romance')
  assert.ok(romance.affection > createStory().affection)
  assert.ok(romance.trust > createStory().trust)
  assert.equal(romance.distance, 0)
  const hurt = ['hurry', 'demand-company', 'blame', 'publish', 'romance', 'dismiss-again', 'walk-together']
  const distance = play(hurt)
  assert.equal(currentStoryNode(distance).ending.id, 'distance')
  assert.ok(distance.affection < createStory().affection)
  assert.ok(distance.trust < createStory().trust)
  assert.ok(distance.distance > 0)
  const friendship = play(warm.with(4, 'friendship'))
  assert.equal(currentStoryNode(friendship).ending.id, 'friendship')
  assert.ok(friendship.trust >= romance.trust)
  assert.equal(currentStoryNode(play(warm.with(4, 'not-yet'))).ending.id, 'beginning')
  assert.equal(currentStoryNode(play(warm.with(6, 'say-goodbye'))).ending.id, 'farewell')
  assert.equal(currentStoryNode(play(hurt.with(6, 'say-goodbye'))).ending.id, 'farewell')
  const repaired = play(['formal-intro', 'quiet-company', 'fix-first', 'return-private', 'romance', 'acknowledge', 'walk-together'])
  assert.equal(currentStoryNode(repaired).ending.id, 'beginning')
})

test('save normalization deterministically replays choices and ignores injected relationship data', () => {
  for (const selections of [warm, warm.with(4, 'friendship'), warm.with(6, 'write-letters')]) {
    const state = play(selections)
    assert.deepEqual(normalizeStory(JSON.parse(JSON.stringify(state))), state)
    const injected = { ...state, affection: -999, trust: 999, distance: 999, flags: { intention: 'separate', admin: true }, history: [{ speaker: 'deepseek', text: '篡改台词' }] }
    assert.deepEqual(normalizeStory(injected), state)
    assert.deepEqual(currentStoryNode(injected), currentStoryNode(state))
    assert.deepEqual(storyHistory(injected), storyHistory(state))
  }
})

test('history preserves contextual lines and authored choices without internal evaluation metadata', () => {
  const state = play()
  const history = storyHistory(state)
  assert.equal(history.at(-1).id, state.nodeId)
  const choices = state.trail.filter(entry => entry.choiceId !== null)
  assert.equal(history.filter(line => line.id.includes(':')).length, choices.length)
  assert.ok(history.some(line => line.speaker === 'player' && line.text === '先写一件你舍不得的小事吧，我想听。'))
  assert.ok(history.some(line => line.id === 'roof-13' && line.text.includes('烤盘声')))
  for (const line of history) assert.deepEqual(Object.keys(line).sort(), ['id', 'location', 'speaker', 'text', 'time'])
  const cold = play(warm.with(0, 'hurry'))
  assert.ok(storyHistory(cold).some(line => line.id === 'roof-13' && line.text.includes('研究室的窗户')))
  assert.equal(history.length, state.trail.length + choices.length + 1)
})

test('malformed, unrelated and damaged save paths are rejected instead of silently reset', () => {
  const start = createStory()
  for (const bad of [null, [], {}, 'save', { version: 1, characterId: 'deepseek', history: [] }, { ...start, kind: 'model-router-gal-game' }, { ...start, version: 2 }, { ...start, nodeId: 'romance-08' }, { ...start, trail: Array(routeLimit + 1).fill({ nodeId: 'arrival-01', choiceId: null }) }, { ...start, trail: [{ nodeId: 'arrival-01' }] }, { ...start, trail: [{ nodeId: 'arrival-01', choiceId: null, next: 'romance-08' }] }, { ...start, trail: [{ nodeId: 'arrival-01', choiceId: 'x'.repeat(81) }] }, { ...start, trail: [{ nodeId: 'arrival-02', choiceId: null }] }]) {
    assert.throws(() => normalizeStory(bad), /存档损坏/)
  }
  const complete = play()
  assert.throws(() => normalizeStory({ ...complete, trail: complete.trail.slice(1) }), /存档损坏/)
  const altered = structuredClone(complete)
  altered.trail.find(entry => entry.choiceId === 'walk-together').choiceId = 'say-goodbye'
  assert.throws(() => normalizeStory(altered), /存档损坏/)
  assert.throws(() => normalizeStory({ ...complete, trail: [...complete.trail, { nodeId: complete.nodeId, choiceId: null }] }), /存档损坏/)
})

test('transitions reject invalid choices and endings without mutating prior state', () => {
  const start = createStory()
  const copy = structuredClone(start)
  assert.throws(() => advanceStory(start, 'small-memory'), /没有这个选项/)
  assert.deepEqual(start, copy)
  let state = start
  while (currentStoryNode(state).id !== 'letter-choice') {
    const node = currentStoryNode(state)
    state = advanceStory(state, node.choices?.[0]?.id ?? null)
  }
  const before = structuredClone(state)
  for (const choice of [null, '', 'romance', {}, ['small-memory']]) assert.throws(() => advanceStory(state, choice), /请选择/)
  assert.deepEqual(state, before)
  const after = advanceStory(state, 'small-memory')
  assert.equal(after.affection - before.affection, 2)
  assert.equal(after.trust - before.trust, 2)
  assert.equal(after.trail.at(-1).nodeId, before.nodeId)
  assert.deepEqual(state, before)
  const end = play()
  assert.throws(() => advanceStory(end), /故事已结束/)
  const visible = currentStoryNode(end)
  visible.ending.id = 'tampered'
  assert.equal(currentStoryNode(end).ending.id, 'romance')
})
