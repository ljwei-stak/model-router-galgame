import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '.dsh-plugin/client/gal-story-score-data.mjs')
const manifestFile = resolve(root, '.dsh-plugin/client/audio-score-manifest.json')
const configFile = resolve(homedir(), '.codex/config.toml')
const endpoint = process.env.MINIMAX_RESPONSES_ENDPOINT || 'https://api.minimaxi.com/v1/responses'
const ids = ['title-city', 'kimi-flute', 'claude-poem', 'bridge-anomaly', 'commons-atelier', 'glass-dome', 'harbor-shift']

function credentialFromCodex(text) {
  const match = text.match(/^\s*experimental_bearer_token\s*=\s*"([^"]+)"\s*$/m)
  return match?.[1] || ''
}

async function apiKey() {
  if (process.env.MINIMAX_API_KEY) return process.env.MINIMAX_API_KEY
  try { return credentialFromCodex(await readFile(configFile, 'utf8')) } catch { return '' }
}

const prompt = `You are composing seven short, original, loopable instrumental cues for a Chinese visual novel about an AI model city. Return JSON only, with this exact shape: {"tracks":[{"id":"...","bpm":72,"wave":"sine","bassWave":"triangle","gain":0.16,"melody":[[0,69,1],[1,72,1]],"bass":[[0,45,2]],"accent":[0,4]}]}.

Rules:
- Include exactly these ids: ${ids.join(', ')}.
- pitch is a MIDI integer 36-84, start and duration are beat counts, duration 0.25-4.
- Each melody must span exactly 16 beats and contain 12-28 events. Each bass must span 16 beats and contain 4-12 events. Notes may overlap.
- Allowed wave values: sine, triangle, square, sawtooth. Prefer sine/triangle; use square sparingly.
- gain must be 0.08-0.2. accent is a list of beat positions from 0 through 15.
- title-city: piano-like lyrical city overture with a resolved but tender motif.
- kimi-flute: flute-like sine lead; repeat a seven-note phrase with one intentionally missing beat before resolution.
- claude-poem: chamber-like triangle lead; phrases stop before an expected cadence, leaving a meaningful blank.
- bridge-anomaly: restrained suspense; every second phrase displaces or omits a beat so the ninth beat feels missing.
- commons-atelier: warm plucked community workshop; melody passes between short gestures.
- glass-dome: precise celesta-like review pulse with a recurring bell accent.
- harbor-shift: three related motifs enter at slightly different beat positions and align near the end.
- No copyrighted melody, lyrics, vocals, or explanatory text.`

function outputText(result) {
  if (typeof result?.output_text === 'string') return result.output_text
  return (result?.output || []).flatMap(item => item?.content || []).map(item => item?.text || item?.output_text || '').join('')
}

function validateTrack(track) {
  if (!track || !ids.includes(track.id) || !Number.isFinite(track.bpm) || track.bpm < 45 || track.bpm > 130) throw new Error('MiniMax returned an invalid score header.')
  if (!['sine', 'triangle', 'square', 'sawtooth'].includes(track.wave) || !['sine', 'triangle', 'square', 'sawtooth'].includes(track.bassWave)) throw new Error('MiniMax returned an unsupported oscillator.')
  if (!Number.isFinite(track.gain) || track.gain < .05 || track.gain > .24) throw new Error('MiniMax returned an invalid gain.')
  const notes = field => {
    if (!Array.isArray(track[field]) || !track[field].length) throw new Error(`MiniMax omitted ${field}.`)
    return track[field].map(note => {
      if (!Array.isArray(note) || note.length !== 3) throw new Error(`MiniMax returned an invalid ${field} note.`)
      const [rawStart, rawPitch, rawDuration] = note.map(Number)
      if (![rawStart, rawPitch, rawDuration].every(Number.isFinite)) throw new Error(`MiniMax returned a non-numeric ${field} note.`)
      const start = Math.max(0, Math.min(15.75, rawStart))
      const pitch = Math.round(Math.max(36, Math.min(84, rawPitch)))
      const duration = Math.max(.125, Math.min(4, rawDuration, 16 - start))
      return [Number(start.toFixed(3)), pitch, Number(duration.toFixed(3))]
    })
  }
  if (!Array.isArray(track.accent) || !track.accent.every(beat => Number.isFinite(beat) && beat >= 0 && beat < 16)) throw new Error('MiniMax returned invalid accents.')
  return { id: track.id, bpm: Math.round(track.bpm), wave: track.wave, bassWave: track.bassWave, gain: Number(track.gain.toFixed(3)), melody: notes('melody'), bass: notes('bass'), accent: track.accent }
}

const key = await apiKey()
if (!key) throw new Error('MiniMax credential was not found. Set MINIMAX_API_KEY or run mmx auth login.')
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: process.env.MINIMAX_TEXT_MODEL || 'MiniMax-M3', input: prompt }),
  signal: AbortSignal.timeout(180_000),
})
const result = await response.json().catch(() => ({}))
if (!response.ok) throw new Error(`MiniMax score composition failed: HTTP ${response.status}`)
let text = outputText(result).trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
const parsed = JSON.parse(text)
const tracks = parsed.tracks.map(validateTrack)
if (tracks.length !== ids.length || new Set(tracks.map(track => track.id)).size !== ids.length || ids.some(id => !tracks.some(track => track.id === id))) throw new Error('MiniMax did not return all seven required scores.')
const payload = JSON.stringify(Object.fromEntries(tracks.map(track => [track.id, track])))
await writeFile(output, `// Generated by MiniMax M3 from scripts/generate-minimax-story-music.mjs.\n// Contains score data only; no credential or generated prose is stored.\nexport const MINIMAX_STORY_SCORES = Object.freeze(${payload})\n`)
await writeFile(manifestFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), generator: 'MiniMax-M3', region: endpoint.includes('minimaxi.com') ? 'cn' : 'global', promptSha256: createHash('sha256').update(prompt).digest('hex'), scoreSha256: createHash('sha256').update(payload).digest('hex'), tracks: tracks.map(track => ({ id: track.id, bpm: track.bpm, melodyNotes: track.melody.length, bassNotes: track.bass.length })) }, null, 2)}\n`)
console.log(`[minimax-score] composed ${tracks.length} themes ${createHash('sha256').update(payload).digest('hex').slice(0, 12)}`)
