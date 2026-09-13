import { MINIMAX_STORY_SCORES } from './gal-story-score-data.mjs'

const frequency = midi => 440 * (2 ** ((midi - 69) / 12))
const safeVolume = value => Math.max(0, Math.min(1, Number(value) || 0))

export function storyScoreFor(themeId) {
  return MINIMAX_STORY_SCORES[themeId] || MINIMAX_STORY_SCORES['title-city']
}

function note(context, destination, when, seconds, midi, wave, level, flute = false) {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency(midi), when)
  if (flute) oscillator.detune.linearRampToValueAtTime(4, when + Math.min(seconds, .7))
  envelope.gain.setValueAtTime(.0001, when)
  envelope.gain.exponentialRampToValueAtTime(Math.max(.001, level), when + Math.min(.045, seconds * .18))
  envelope.gain.exponentialRampToValueAtTime(.0001, when + Math.max(.06, seconds))
  oscillator.connect(envelope).connect(destination)
  oscillator.start(when)
  oscillator.stop(when + Math.max(.08, seconds) + .03)
}

function bell(context, destination, when, level) {
  note(context, destination, when, .32, 84, 'sine', level)
  note(context, destination, when + .018, .25, 91, 'sine', level * .38)
}

/**
 * Play one of the MiniMax M3 composed score loops with the browser's Web Audio
 * oscillators. The returned controller never writes data or contacts a service.
 */
export function playStoryScore(themeId, { volume = .28, fadeInMs = 0 } = {}) {
  if (typeof window === 'undefined') return { themeId, stop() {}, setVolume() {} }
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return { themeId, stop() {}, setVolume() {} }
  const score = storyScoreFor(themeId)
  const context = new AudioContext()
  const master = context.createGain()
  const targetVolume = safeVolume(volume)
  master.gain.value = fadeInMs > 0 ? .0001 : targetVolume
  master.connect(context.destination)
  const beat = 60 / score.bpm
  const cycle = beat * 16
  let stopped = false
  let timer = 0

  function schedule(start) {
    if (stopped) return
    const flute = themeId === 'kimi-flute'
    for (const [at, midi, duration] of score.melody) note(context, master, start + at * beat, duration * beat * .86, midi, score.wave, score.gain, flute)
    for (const [at, midi, duration] of score.bass) note(context, master, start + at * beat, duration * beat * .9, midi, score.bassWave, score.gain * .34)
    for (const at of score.accent) bell(context, master, start + at * beat, score.gain * .25)
    timer = window.setTimeout(() => schedule(start + cycle), Math.max(100, (cycle - 1.2) * 1000))
  }

  context.resume().then(() => {
    const now = context.currentTime
    if (fadeInMs > 0) master.gain.linearRampToValueAtTime(Math.max(.0001, targetVolume), now + fadeInMs / 1000)
    schedule(now + .08)
  }).catch(() => {})
  return {
    themeId,
    setVolume(next, { rampMs = 360 } = {}) {
      const now = context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(Math.max(.0001, master.gain.value), now)
      master.gain.linearRampToValueAtTime(Math.max(.0001, safeVolume(next)), now + Math.max(0, rampMs) / 1000)
    },
    stop({ fadeOutMs = 900 } = {}) {
      if (stopped) return
      stopped = true
      window.clearTimeout(timer)
      const now = context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(Math.max(.0001, master.gain.value), now)
      master.gain.linearRampToValueAtTime(.0001, now + Math.max(0, fadeOutMs) / 1000)
      window.setTimeout(() => context.close().catch(() => {}), Math.max(120, fadeOutMs + 80))
    },
  }
}

export const MINIMAX_SCORE_IDS = Object.freeze(Object.keys(MINIMAX_STORY_SCORES))
