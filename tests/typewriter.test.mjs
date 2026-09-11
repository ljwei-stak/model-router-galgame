import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advance,
  createTypeState,
  scheduleTypewriterTick,
  setTarget,
  skip,
} from '../.dsh-plugin/client/typewriter.mjs'

test('typewriter reducer preserves prefixes and advances to completion', () => {
  const initial = createTypeState()
  const targeted = setTarget(initial, 'abcd')
  assert.deepEqual(targeted, { target: 'abcd', shown: '', done: false })
  const advanced = advance(targeted, 20, 60)
  assert.deepEqual(advanced, { target: 'abcd', shown: 'a', done: false })
  assert.deepEqual(skip(advanced), { target: 'abcd', shown: 'abcd', done: true })
  assert.deepEqual(setTarget({ target: 'ab', shown: 'a', done: false }, 'abcd'), {
    target: 'abcd', shown: 'a', done: false,
  })
})

test('typewriter tick falls back to its timer when animation frames are paused', () => {
  let frameCallback
  let timerCallback
  const cancelledFrames = []
  const clearedTimers = []
  const timestamps = []
  scheduleTypewriterTick(timestamp => timestamps.push(timestamp), {
    requestFrame(callback) { frameCallback = callback; return 41 },
    cancelFrame(id) { cancelledFrames.push(id) },
    setTimer(callback) { timerCallback = callback; return 42 },
    clearTimer(id) { clearedTimers.push(id) },
    now: () => 1234,
  })
  timerCallback()
  frameCallback(9999)
  assert.deepEqual(timestamps, [1234])
  assert.deepEqual(cancelledFrames, [41])
  assert.deepEqual(clearedTimers, [42])
})

test('typewriter tick uses the animation frame once and can be cancelled', () => {
  let frameCallback
  let timerCallback
  const cancelledFrames = []
  const clearedTimers = []
  const timestamps = []
  const cancel = scheduleTypewriterTick(timestamp => timestamps.push(timestamp), {
    requestFrame(callback) { frameCallback = callback; return 51 },
    cancelFrame(id) { cancelledFrames.push(id) },
    setTimer(callback) { timerCallback = callback; return 52 },
    clearTimer(id) { clearedTimers.push(id) },
  })
  frameCallback(16)
  timerCallback()
  cancel()
  assert.deepEqual(timestamps, [16])
  assert.deepEqual(cancelledFrames, [51])
  assert.deepEqual(clearedTimers, [52])

  let cancelledCallback
  const cancelled = scheduleTypewriterTick(() => assert.fail('cancelled tick fired'), {
    requestFrame(callback) { cancelledCallback = callback; return 61 },
    cancelFrame(id) { cancelledFrames.push(id) },
    setTimer() { return 62 },
    clearTimer(id) { clearedTimers.push(id) },
  })
  cancelled()
  cancelledCallback(32)
  assert.deepEqual(cancelledFrames, [51, 61])
  assert.deepEqual(clearedTimers, [52, 62])
})
