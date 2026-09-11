import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const PERSONA_OLD = '    text: You are a helpful software engineer assistant.'
const PERSONA_CURRENT = '    prefix: You are a helpful software engineer assistant.'
const SECTIONS_OLD = "const PERSONA_SECTION_NAMES = new Set(['deployment:persona', 'persona'])"
const SECTIONS_CURRENT = "const PERSONA_SECTION_NAMES = new Set(['deployment:persona-prefix', 'deployment:persona', 'persona'])"

export function resolveDshHome(env = process.env, home = homedir(), cwd = process.cwd()) {
  const configured = String(env.DSH_HOME ?? '').trim()
  if (configured === '') return join(home, '.dsh')
  const expanded = configured === '~'
    ? home
    : configured.startsWith('~/') || configured.startsWith('~\\')
      ? join(home, configured.slice(2))
      : configured
  return isAbsolute(expanded) ? expanded : resolve(cwd, expanded)
}

function replacement(source, oldValue, currentValue) {
  const hasOld = source.includes(oldValue)
  const hasCurrent = source.includes(currentValue)
  if (hasOld === hasCurrent) return { kind: 'unsupported', source }
  if (hasCurrent) return { kind: 'current', source }
  return { kind: 'repair', source: source.replace(oldValue, currentValue) }
}

/**
 * Repair the two exact dsh-liangshen 0.3.20 preset fragments that changed in
 * DSH 0.1.5. Unknown or mixed content is left untouched for a future upstream
 * release to own.
 */
export function repairLiangshenPreset(options = {}) {
  const root = options.dshHome ?? resolveDshHome(options.env, options.home, options.cwd)
  const preset = join(root, '.agent-presets', 'liangshen')
  const agentPath = join(preset, 'agent.cordis.yml')
  const bootstrapPath = join(preset, 'tool-bootstrap.mjs')
  if (!existsSync(agentPath) || !existsSync(bootstrapPath)) {
    return { kind: 'absent', preset }
  }

  const agent = replacement(readFileSync(agentPath, 'utf8'), PERSONA_OLD, PERSONA_CURRENT)
  const bootstrap = replacement(readFileSync(bootstrapPath, 'utf8'), SECTIONS_OLD, SECTIONS_CURRENT)
  if (agent.kind === 'unsupported' || bootstrap.kind === 'unsupported') {
    return { kind: 'unsupported', preset }
  }
  if (agent.kind === 'current' && bootstrap.kind === 'current') {
    return { kind: 'current', preset }
  }

  if (agent.kind === 'repair') writeFileSync(agentPath, agent.source, 'utf8')
  if (bootstrap.kind === 'repair') writeFileSync(bootstrapPath, bootstrap.source, 'utf8')
  return { kind: 'repaired', preset }
}

export function reportLiangshenCompatibility(ctx, result) {
  if (result.kind === 'repaired') {
    ctx.logger?.info?.(`model-router: updated LiangShen preset for DSH 0.1.5 (${result.preset})`)
  } else if (result.kind === 'unsupported') {
    ctx.logger?.warn?.(`model-router: LiangShen preset has an unknown compatibility layout; left unchanged (${result.preset})`)
  }
  return result
}
