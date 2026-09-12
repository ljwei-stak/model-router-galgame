import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { ChevronRight, LoaderCircle } from 'lucide-react'
import { DialogueBox } from './DialogueBox.jsx'
import { STORY_DIALOGUE_THEMES as DIALOGUE_THEMES } from './gal-dialogue-themes.mjs'
import { DIALOGUE_FRAME_ASSETS } from './gal-dialogue-assets.mjs'
import { GAL_DIALOGUE_CSS } from './gal-dialogue-styles.mjs'

const NEUTRAL_THEMES = {
  narrator: { name: '旁白', motif: 'narrator', accent: '#aab5bc', ink: '#edf0f2', paper: '#383e43', line: '#7c878e' },
  player: { name: '你', motif: 'player', accent: '#afa3a0', ink: '#f5efee', paper: '#494041', line: '#a19393' },
}
const proportion = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback

function rasterLayout(frame, width, name) {
  const sourceWidth = frame.width || 1536
  const sourceHeight = frame.height || 512
  const scale = width / sourceWidth
  const naturalHeight = sourceHeight * scale
  const safe = frame.insets || {}
  let top = naturalHeight * proportion(safe.top, 0.35)
  const bottom = naturalHeight * proportion(safe.bottom, 0.2)
  const left = width * proportion(safe.left, 0.16)
  const right = width * proportion(safe.right, 0.12)
  const compact = width < 620
  const bodyHeight = Math.max(compact ? 126 : 138, naturalHeight - top - bottom)
  const plate = frame.nameplate || { left: 0.19, top: 0.15, width: 0.19, height: 0.14 }
  const plateWidth = width * proportion(plate.width, 0.19)
  const plateHeight = naturalHeight * proportion(plate.height, 0.14)
  const textWeight = [...name].reduce((sum, char) => sum + (/[^\x00-\x7f]/.test(char) ? 1 : char === ' ' ? 0.33 : 0.57), 0)
  let nameSize = Math.max(12, Math.min(15, plateWidth / Math.max(1, textWeight), plateHeight * 0.75))
  let nameLeft = width * proportion(plate.left, 0.19)
  let nameTop = naturalHeight * proportion(plate.top, 0.15)
  let nameWidth = plateWidth
  let nameHeight = plateHeight
  let nameArt = null
  const wingWidth = Math.max(0, left - 4)
  if (compact) {
    const art = frame.nameplateArt || { left: Math.max(0, plate.left - 0.04), top: Math.max(0, plate.top - 0.04), width: plate.width + 0.08, height: plate.height + 0.08 }
    const artWidth = sourceWidth * art.width
    const artHeight = sourceHeight * art.height
    const artLeft = Math.max(wingWidth * 0.9, width * art.left)
    const heightSafeWidth = 18 * artWidth / (plate.height * sourceHeight)
    const targetWidth = Math.min(width - artLeft - 12, Math.max(110, heightSafeWidth, (textWeight * 12 + 8) * art.width / plate.width))
    const zoom = targetWidth / artWidth
    const targetHeight = artHeight * zoom
    top = Math.max(top, targetHeight + 4)
    const artTop = Math.max(0, top - targetHeight - 4)
    nameSize = 12
    nameLeft = artLeft + (plate.left - art.left) * sourceWidth * zoom
    nameTop = artTop + (plate.top - art.top) * sourceHeight * zoom
    nameWidth = plate.width * sourceWidth * zoom
    nameHeight = plate.height * sourceHeight * zoom
    nameArt = { left: `${artLeft}px`, top: `${artTop}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, backgroundImage: `url("${frame.src}")`, backgroundSize: `${sourceWidth * zoom}px ${sourceHeight * zoom}px`, backgroundPosition: `${-art.left * sourceWidth * zoom}px ${-art.top * sourceHeight * zoom}px` }
  }
  const slices = frame.slice || [Math.round(sourceHeight * 0.6), Math.round(sourceWidth * 0.16), Math.round(sourceHeight * 0.39), Math.round(sourceWidth * 0.4)]
  return {
    variables: {
      '--gd-frame-height': `${top + bodyHeight + bottom}px`, '--gd-body-top': `${top}px`, '--gd-body-left': `${left}px`, '--gd-body-right': `${right}px`, '--gd-body-height': `${bodyHeight}px`,
      '--gd-name-left': `${nameLeft}px`, '--gd-name-top': `${nameTop}px`, '--gd-name-width': `${nameWidth}px`, '--gd-name-height': `${nameHeight}px`, '--gd-name-size': `${nameSize}px`,
      '--gd-next-right': `${Math.max(20, right + 4)}px`, '--gd-next-bottom': `${Math.max(7, naturalHeight * proportion(frame.advance?.bottom, 0.166) - 13)}px`,
    },
    art: {
      borderImageSource: `url("${frame.src}")`, borderImageSlice: `${slices.join(' ')} fill`, borderImageWidth: slices.map(value => `${value * scale}px`).join(' '), borderImageRepeat: 'stretch',
      ...(compact ? { clipPath: `inset(0 0 0 ${wingWidth}px)` } : {}),
    },
    wing: compact ? { width: `${wingWidth}px`, height: `${naturalHeight}px`, backgroundImage: `url("${frame.src}")`, backgroundSize: `${width}px ${naturalHeight}px` } : null,
    rail: compact ? { left: `${wingWidth - 1}px`, top: `${naturalHeight * 0.6}px`, bottom: `${naturalHeight * 0.11}px` } : null,
    nameArt,
  }
}

export const GalDialogue = forwardRef(function GalDialogue({ character = 'deepseek', speaker, text = '', shown, narration = '', busy = false, pendingText = '', onAdvance, canAdvance = false }, ref) {
  const hostRef = useRef(null)
  const [width, setWidth] = useState(800)
  const [moreText, setMoreText] = useState(false)
  const neutral = Object.hasOwn(NEUTRAL_THEMES, character) ? character : typeof speaker === 'string' && Object.hasOwn(NEUTRAL_THEMES, speaker) ? speaker : null
  const key = neutral || (Object.hasOwn(DIALOGUE_THEMES, character) ? character : 'deepseek')
  const theme = NEUTRAL_THEMES[key] || DIALOGUE_THEMES[key]
  const name = typeof speaker === 'string' && !Object.hasOwn(NEUTRAL_THEMES, speaker) ? speaker : speaker?.name || theme.name
  const descriptor = DIALOGUE_FRAME_ASSETS[key]
  const frame = typeof descriptor === 'string' ? { src: descriptor, width: 1536, height: 512 } : descriptor
  const hasArt = Boolean(frame?.src)
  useLayoutEffect(() => {
    const element = hostRef.current
    if (!element) return undefined
    const measure = () => {
      const frameElement = element.querySelector('.ggd-frame')
      const measured = frameElement?.getBoundingClientRect().width
      if (measured > 0) setWidth(measured)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const fullText = String(text ?? '')
  const visible = shown === undefined ? fullText : typeof shown === 'number' ? fullText.slice(0, shown) : String(shown)
  const done = visible.length >= fullText.length
  const measureRemaining = () => {
    const body = hostRef.current?.querySelector('.ggd-body')
    const remaining = Boolean(body && body.scrollHeight - body.clientHeight - body.scrollTop > 2)
    setMoreText(remaining)
    return remaining
  }
  useLayoutEffect(() => { measureRemaining() }, [visible, fullText, width, narration, busy, key])
  function advanceText() {
    if (busy) return
    if (!done) { onAdvance?.(); return }
    const body = hostRef.current?.querySelector('.ggd-body')
    if (body && body.scrollHeight - body.clientHeight - body.scrollTop > 2) {
      body.scrollTop = Math.min(body.scrollHeight - body.clientHeight, body.scrollTop + Math.max(24, body.clientHeight - 24))
      measureRemaining()
      return
    }
    if (canAdvance) onAdvance?.()
  }
  useImperativeHandle(ref, () => ({ advance: advanceText }))
  const advance = !busy && (typeof onAdvance === 'function' || moreText) ? advanceText : undefined
  const advanceLabel = !done ? '显示完整对话' : moreText ? '后续台词' : '继续'
  const line = { kind: key === 'player' ? 'player' : key === 'narrator' ? 'system' : 'assistant', text: busy ? '' : fullText, speaker: { name } }
  const layout = hasArt ? rasterLayout(frame, width, name) : null
  const colors = { '--gd-accent': theme.accent, '--gd-ink': hasArt ? frame.textColor || '#f4f1fc' : theme.ink, '--gd-paper': theme.paper, '--gd-line': theme.line, '--gd-name-color': frame?.nameColor || (key === 'deepseek' ? '#a772da' : theme.accent), ...layout?.variables }
  return <section ref={hostRef} className="gg-dialogue ggd-host" aria-label="角色对话" aria-busy={busy} data-dialogue-character={key} data-dialogue-motif={theme.motif} data-frame-raster={hasArt} style={colors}>
    <style>{GAL_DIALOGUE_CSS}</style>
    <DialogueBox el={{}} line={line} type={{ shown: busy ? '' : visible, done: busy || done }} pinned={busy} onSkip={advance} onBodyScroll={measureRemaining} asset={null} layout="responsive" className={`ggd-frame ${hasArt ? 'ggd-raster' : 'ggd-neutral'} ggd-${key}`} beforeText={busy ? <><p className="gg-pending-player"><span>你</span>{pendingText}</p><p className="gg-awaiting"><LoaderCircle size={15} className="gg-spin" />她正在斟酌你的话。</p></> : <p className="gg-narration">{narration}</p>}>
      {hasArt && <span className="ggd-raster-art" style={layout.art} aria-hidden="true" />}
      {layout?.rail && <span className="ggd-mobile-rail" style={layout.rail} aria-hidden="true" />}
      {layout?.wing && <span className="ggd-mobile-wing" style={layout.wing} aria-hidden="true" />}
      {layout?.nameArt && <span className="ggd-mobile-name-art" style={layout.nameArt} aria-hidden="true" />}
      <header className="ggd-nameplate"><span>{name}</span></header>
      {advance && (!done || moreText || canAdvance) && <button className="ggd-advance" type="button" onClick={advance} title={advanceLabel} aria-label={advanceLabel}><ChevronRight size={18} /></button>}
    </DialogueBox>
  </section>
})
