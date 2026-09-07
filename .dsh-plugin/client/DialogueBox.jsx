import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { SafeMarkdownText } from './SafeMarkdownText.jsx'
import { elementStyle } from './scene.mjs'
import { shouldRenderMarkdown } from './transcript.mjs'

/** The stage keeps its absolute scene coordinates; the story uses the same
 * dialogue renderer inside a responsive frame without writing scene settings. */
export function DialogueBox({ el, line, type, pinned, onSkip, asset, dtextEl, aiStatus, layout = 'stage', className = '', children, beforeText, onBodyScroll }) {
  const bodyRef = useRef(null)
  useEffect(() => {
    if (pinned || layout === 'responsive') return
    const body = bodyRef.current
    if (body !== null) body.scrollTop = body.scrollHeight
  }, [type.shown, line.text, pinned, layout])
  useLayoutEffect(() => {
    if (layout === 'responsive' && bodyRef.current) bodyRef.current.scrollTop = 0
  }, [line.text, layout])
  const speaker = line.speaker
  const responsive = layout === 'responsive'
  const baseStyle = responsive ? undefined : elementStyle(el)
  const style = asset !== null && asset !== undefined
    ? {
      ...baseStyle,
      backgroundImage: 'url("' + asset.dataUrl + '")',
      backgroundSize: responsive ? '100% 100%' : 'cover',
      backgroundPosition: 'center',
    }
    : baseStyle
  const hasSeparateText = dtextEl !== null && dtextEl !== undefined
  const content = <>
    {shouldRenderMarkdown(line)
      ? <SafeMarkdownText text={type.shown} streaming={!type.done} />
      : <span className="gv-plain-text">{type.shown}</span>}
    {!type.done && <span className="gv-dialogue-caret" aria-hidden="true" />}
    {aiStatus !== null && aiStatus !== undefined && aiStatus !== '' && (
      <span className="gv-dtext-status">{(type.shown !== '' ? '\n' : '') + '（' + aiStatus + '…）'}</span>
    )}
  </>
  return (
    <div
      className={'gv-dialogue' + (className ? ' ' + className : '')}
      style={style}
      onClick={responsive ? undefined : onSkip}
      role={responsive ? undefined : 'button'}
      tabIndex={responsive ? undefined : 0}
      aria-label={responsive ? undefined : `对话框：${speaker?.name ?? '当前角色'}，点击跳过打字动画`}
      onKeyDown={responsive ? undefined : e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSkip() } }}
    >
      {children}
      {!hasSeparateText && (
        <div className={'gv-dialogue-body' + (responsive ? ' gg-dialogue-content ggd-body' : '')} ref={bodyRef} onClick={responsive ? onSkip : undefined} onScroll={responsive ? onBodyScroll : undefined}>
          {beforeText}
          {responsive ? <div className="gg-spoken" aria-live="polite">{content}</div> : content}
        </div>
      )}
    </div>
  )
}
