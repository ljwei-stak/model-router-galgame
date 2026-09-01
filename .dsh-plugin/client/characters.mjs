/**
 * Built-in GAL character roster. Images are bundled as data URLs by esbuild,
 * so an installed plugin never depends on the developer's absolute paths.
 */
import chatgpt from '../../aipicture/ChatGPT1.png'
import claude from '../../aipicture/Claude1.png'
import harness from '../../aipicture/DeepSeek_Harness1.png'
import deepseek from '../../aipicture/DeepSeek1.png'
import doubao from '../../aipicture/Doubao1.png'
import ernie from '../../aipicture/ernie1.png'
import gemini from '../../aipicture/Gemini1.png'
import glm from '../../aipicture/GLM1.png'
import grok from '../../aipicture/Grok1.png'
import kimi from '../../aipicture/Kimi1.png'
import mimo from '../../aipicture/Mimo1.png'
import minimax from '../../aipicture/Minmax1.png'
import opencode from '../../aipicture/opencode1.png'
import qwen from '../../aipicture/Qwen1.png'
import { CHARACTER_LABELS, characterKeyForModel } from './character-identity.mjs'

export { CHARACTER_LABELS, characterKeyForModel } from './character-identity.mjs'

export const CHARACTER_IMAGES = Object.freeze({
  harness,
  chatgpt,
  claude,
  deepseek,
  doubao,
  ernie,
  gemini,
  glm,
  grok,
  kimi,
  mimo,
  minimax,
  opencode,
  qwen,
})

export function characterForModel(model, provider = '') {
  const key = characterKeyForModel(model, provider)
  return {
    key,
    name: String(model ?? '').trim() || CHARACTER_LABELS[key],
    label: CHARACTER_LABELS[key],
    dataUrl: CHARACTER_IMAGES[key] ?? CHARACTER_IMAGES.harness,
  }
}
