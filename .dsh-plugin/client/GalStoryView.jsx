import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Bug, Check, Download, History, MapPin, Palette, Pause, Play, RotateCcw, Save, Settings2, Upload, X } from 'lucide-react'
import { STORY_EPISODES, STORY_CHARACTERS, getStoryEpisode, createStory, normalizeStory, currentStoryNode, advanceStory, storyHistory } from '../shared/gal-story-catalog.mjs'
import { readStory, readStorySlots, writeStory, STORY_STORAGE_KEY, episodeStorageKey, selectedStoryEpisode } from './gal-story-storage.mjs'
import { CHARACTER_IMAGES } from './characters.mjs'
import { expressionFor } from './gal-game-expressions.mjs'
import { GalDialogue } from './GalDialogue.jsx'
import { GalDialogueGallery } from './GalDialogueGallery.jsx'
import { Panel, Tool } from './gal-game-controls.jsx'
import { GAL_GAME_CSS } from './gal-game-styles.mjs'

const storage = () => { try { return window.localStorage } catch { return null } }
const speakerName = key => key === 'player' ? '你' : key === 'narrator' ? '旁白' : STORY_CHARACTERS[key] || key

export function GalStoryView({ storageKey = STORY_STORAGE_KEY, scene: dialogueScene, assetsMap, sessionState, onStateChange }) {
  const [episodeId, setEpisodeId] = useState(() => {
    if (sessionState?.episodeId) return sessionState.episodeId
    try { return selectedStoryEpisode(storage(), storageKey) } catch { return 'bridges' }
  })
  const sessions = useRef(sessionState?.sessions || {})
  function chooseEpisode(next) {
    if (next === episodeId) return
    setEpisodeId(next)
    try { storage()?.setItem(`${storageKey}:episode`, next) } catch { /* Session memory still retains the selected episode. */ }
    onStateChange?.({ episodeId: next, sessions: { ...sessions.current } })
  }
  function updateSession(next) {
    sessions.current[episodeId] = next
    onStateChange?.({ episodeId, sessions: { ...sessions.current } })
  }
  return <StoryReader key={`${storageKey}:${episodeId}`} storageKey={episodeStorageKey(storageKey, episodeId)} episodeId={episodeId} onChooseEpisode={chooseEpisode} scene={dialogueScene} assetsMap={assetsMap} sessionState={sessions.current[episodeId]} onStateChange={updateSession} />
}

function StoryReader({ storageKey, episodeId, onChooseEpisode, scene: dialogueScene, assetsMap, sessionState, onStateChange }) {
  const episode = STORY_EPISODES.find(item => item.id === episodeId)
  const [initial] = useState(() => {
    if (sessionState) return sessionState
    try { return { state: readStory(storage(), storageKey, episodeId), error: '' } }
    catch (error) { return { state: createStory(episodeId), error: error.message } }
  })
  const [state, setState] = useState(initial.state)
  const stateRef = useRef(state)
  const protectedSave = useRef(initial.protected ?? Boolean(initial.error))
  const [error, setError] = useState(initial.error)
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [slots, setSlots] = useState([null, null, null])
  const [debug, setDebug] = useState(false)
  const [animate, setAnimate] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [speed, setSpeed] = useState(28)
  const [shown, setShown] = useState(0)
  const [auto, setAuto] = useState(false)
  const fileRef = useRef(null)
  const historyRef = useRef(null)
  const dialogueRef = useRef(null)
  const node = useMemo(() => currentStoryNode(state), [state])
  const history = useMemo(() => storyHistory(state), [state])
  const portraitLine = [...history].reverse().find(line => line.location === node.location && CHARACTER_IMAGES[line.speaker])
  const character = CHARACTER_IMAGES[node.speaker] ? node.speaker : portraitLine?.speaker
  const complete = !animate || shown >= node.text.length
  const hasChoices = Boolean(node.choices?.length)

  useEffect(() => {
    try { setSlots(readStorySlots(storage(), storageKey, episodeId)) }
    catch (slotError) { setError(slotError.message) }
  }, [storageKey])

  useEffect(() => {
    setShown(animate ? 0 : node.text.length)
    if (!animate) return undefined
    let count = 0
    const timer = setInterval(() => {
      count = Math.min(node.text.length, count + 1)
      setShown(value => Math.max(value, count))
      if (count >= node.text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [node.id, node.text, animate, speed])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 2600)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => { if (panel === 'history') historyRef.current?.scrollIntoView({ block: 'end' }) }, [panel])

  useEffect(() => {
    if (!auto || !complete || hasChoices || node.ending || panel || confirm || error) return undefined
    const timer = setInterval(() => {
      if (!document.hidden) dialogueRef.current?.advance()
    }, Math.max(1600, Math.min(6500, node.text.length * 65)))
    return () => clearInterval(timer)
  }, [auto, complete, hasChoices, node.id, panel, confirm, error])

  useEffect(() => {
    const pause = () => { if (document.hidden) setAuto(false) }
    document.addEventListener('visibilitychange', pause)
    return () => document.removeEventListener('visibilitychange', pause)
  }, [])

  function store(next, recover = false) {
    if (protectedSave.current && !recover) { setAuto(false); setError('原存档已保留，请先导入备份或在设置中重新开始。'); return false }
    stateRef.current = next
    setState(next)
    setShown(animate ? 0 : currentStoryNode(next).text.length)
    try {
      writeStory(storage(), storageKey, next, episodeId)
      protectedSave.current = false
      setError('')
      onStateChange?.({ state: next, error: '', protected: false })
    } catch (saveError) {
      const message = saveError.message || '剧情存档未保存，请导出备份。'
      setAuto(false)
      setError(message)
      onStateChange?.({ state: next, error: message, protected: false })
    }
    return true
  }

  function progress(choiceId = null) {
    if (panel || confirm) return
    if (!complete && choiceId === null) { setShown(node.text.length); return }
    if (node.ending) return
    if (hasChoices && choiceId === null) return
    try { store(advanceStory(stateRef.current, choiceId)) }
    catch (storyError) { setError(storyError.message); setAuto(false) }
  }

  function saveSlot(index) {
    const next = slots.map((slot, at) => at === index ? { savedAt: new Date().toISOString(), state: stateRef.current } : slot)
    try {
      const target = storage()
      if (!target) throw new Error('浏览器存储不可用，请导出剧情存档。')
      target.setItem(`${storageKey}:slots`, JSON.stringify(next))
      setSlots(next)
      setNotice(`已保存至存档 ${index + 1}`)
    } catch (saveError) { setError(saveError.message) }
  }

  function exportSave() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ kind: 'model-router-gal-story-save', savedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `model-city-story-${episodeId}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function importSave(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 1024 * 1024) throw new Error('剧情存档文件过大。')
      const raw = JSON.parse(await file.text())
      if (raw.kind !== 'model-router-gal-story-save') throw new Error('请选择剧情模式导出的存档。')
      const next = normalizeStory(raw.state)
      if (getStoryEpisode(next).id !== episodeId) throw new Error(`这是《${getStoryEpisode(next).label}》存档，请在“剧目与章节”中切换后导入。`)
      setConfirm({ title: '导入剧情存档？', detail: '当前剧情自动存档将被替换。', action: () => { store(next, true); setPanel(null); setNotice('剧情存档已导入') } })
    } catch (importError) { setError(importError.message || '剧情存档无法读取。') }
  }

  function restart() {
    setAuto(false)
    setConfirm({ title: '重新开始剧情？', detail: '当前剧目的自动存档将被替换，手动存档会保留。', action: () => { store(createStory(episodeId), true); setPanel(null); setNotice('新故事已经开始') } })
  }

  function startChapter(chapter) {
    setAuto(false)
    setConfirm({ title: `从《${chapter.title}》开始试玩？`, detail: '本剧目的自动存档将被替换，手动存档保留。章节独立起点不继承之前的选择；完整体验请从序章开始。', action: () => { store(createStory(episodeId, { chapterId: chapter.id }), true); setPanel(null); setNotice('章节试玩已经开始') } })
  }

  return <div className="gg-root gg-story" data-testid="gal-story" data-node-id={node.id} data-episode-id={episodeId} data-chapter-id={node.chapterId || ''} data-debug-enabled={debug}>
    <style>{GAL_GAME_CSS}</style>
    <header className="gg-header">
      <div className="gg-brand"><h1>{episode.title}</h1></div>
      <div className="gg-header-actions">
        <Tool label="剧目与章节" icon={BookOpen} onClick={() => { setAuto(false); setPanel('episodes') }} />
        <Tool label={auto ? '暂停自动播放' : '自动播放'} icon={auto ? Pause : Play} aria-pressed={auto} disabled={Boolean(node.ending)} onClick={() => setAuto(value => !value)} />
        <Tool label="对话回顾" icon={History} onClick={() => setPanel('history')} />
        <Tool label="存档与读档" icon={Save} onClick={() => setPanel('saves')} />
        {debug && <Tool label="查看开发调试" icon={Bug} onClick={() => setPanel('debug')} />}
        <Tool label="剧情与显示设置" icon={Settings2} onClick={() => setPanel('settings')} />
      </div>
    </header>
    <main className="gg-main">
      <section className="gg-stage" aria-label="游戏场景">
        <div className="gg-scene-meta"><span><MapPin size={13} />{node.location}</span><time>{node.time}</time></div>
        <div className="gg-scene-placeholder"><h2>{node.location}</h2><span className="gg-placeholder-rule" /><p>{node.description}</p></div>
        {character && <img className="gg-character" key={character} src={character === 'deepseek' ? expressionFor(node.speaker === character ? node.emotion || 'neutral' : 'neutral') : CHARACTER_IMAGES[character]} alt={speakerName(character)} draggable="false" />}
      </section>
      <GalDialogue ref={dialogueRef} character={node.speaker} speaker={speakerName(node.speaker)} text={node.text} shown={animate ? node.text.slice(0, shown) : node.text} onAdvance={() => progress()} canAdvance={!hasChoices && !node.ending} scene={dialogueScene} assetsMap={assetsMap} />
      <div className="gg-input-band gg-story-actions">
        {error && <div className="gg-error" role="alert"><span>{error}</span><Tool label="关闭提示" icon={X} onClick={() => setError('')} /></div>}
        {node.ending ? <div className="gg-ending gg-story-ending"><div><h2>{node.ending.title}</h2><p>{node.ending.description}</p></div><Tool label="重新开始" icon={RotateCcw} onClick={restart} /></div> : hasChoices ? <div className="gg-story-choices" role="group" aria-label="你的选择">{node.choices.map(choice => <button type="button" key={choice.id} data-choice-id={choice.id} onClick={() => progress(choice.id)}>{choice.text}<ArrowRight size={16} /></button>)}</div> : <div className="gg-story-next"><button type="button" className="gg-next" onClick={() => dialogueRef.current?.advance()}>继续<ArrowRight size={16} /></button></div>}
      </div>
    </main>
    {notice && <div className="gg-notice" role="status"><Check size={15} />{notice}</div>}

    {panel === 'episodes' && <Panel title="剧目与章节" onClose={() => setPanel(null)}>
      <div className="gg-episode-list">{STORY_EPISODES.map(item => <article className="gg-episode-card" key={item.id}>
        <h3>{item.label}{item.id === episodeId ? ' · 当前剧目' : ''}</h3><p>{item.description}</p>
        <button className="gg-button" type="button" onClick={() => { if (item.id === episodeId) setPanel(null); else onChooseEpisode(item.id) }}>继续{item.label}</button>
      </article>)}</div>
      {episode.chapters.length > 0 && <div className="gg-chapter-list"><h3>章节试玩</h3><p>从序章顺序阅读可保留所有选择的后续影响。也可直接从以下章节开始。</p>{episode.chapters.map(chapter => <button className="gg-button" type="button" key={chapter.id} onClick={() => startChapter(chapter)}>试玩：{chapter.title}<ArrowRight size={14} /></button>)}</div>}
    </Panel>}

    {panel === 'history' && <Panel title="对话回顾" wide onClose={() => setPanel(null)}><div className="gg-history">{history.map((line, index) => <React.Fragment key={`${line.id}:${index}`}>{line.location !== history[index - 1]?.location && <div className="gg-history-scene">{line.location} · {line.time}</div>}<article className={`gg-history-line ${line.speaker === 'player' ? 'is-player' : ''}`}><span>{speakerName(line.speaker)}</span><p>{line.text}</p></article></React.Fragment>)}<div ref={historyRef} /></div></Panel>}

    {panel === 'saves' && <Panel title="存档与读档" onClose={() => setPanel(null)}>
      {error && <p className="gg-form-error" role="alert">{error}</p>}
      <div className="gg-save-list">{slots.map((slot, index) => { const saved = slot?.state ? currentStoryNode(slot.state) : null; return <article className="gg-save-slot" key={index}><span className="gg-save-number">0{index + 1}</span><div><h3>{slot?.invalid ? '存档无法读取' : saved ? saved.location : '空白存档'}</h3><p>{saved?.text || '尚未记录'}</p>{slot?.savedAt && <time>{new Date(slot.savedAt).toLocaleString('zh-CN', { hour12: false })}</time>}</div><div className="gg-save-actions"><Tool label={`保存到存档 ${index + 1}`} icon={Save} onClick={() => slot ? setConfirm({ title: `覆盖存档 ${index + 1}？`, detail: '这个手动存档将替换为当前剧情。', action: () => saveSlot(index) }) : saveSlot(index)} /><Tool label={`读取存档 ${index + 1}`} icon={Upload} disabled={!slot || slot.invalid} onClick={() => setConfirm({ title: `读取存档 ${index + 1}？`, detail: '当前剧情自动存档将被替换。', action: () => { store(normalizeStory(slot.state), true); setPanel(null); setNotice('剧情存档已读取') } })} /></div></article> })}</div>
      <div className="gg-panel-actions"><button type="button" className="gg-button" onClick={exportSave}><Download size={16} />导出存档</button><button type="button" className="gg-button" onClick={() => fileRef.current?.click()}><Upload size={16} />导入存档</button></div><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importSave} />
    </Panel>}

    {panel === 'settings' && <Panel title="剧情与显示设置" onClose={() => setPanel(null)}>
      <label className="gg-setting-row"><span>逐字显示</span><input type="checkbox" checked={animate} onChange={event => setAnimate(event.target.checked)} /></label>
      <label className="gg-setting-row"><span>文字速度</span><input aria-label="文字速度" type="range" min="10" max="60" step="5" value={70 - speed} disabled={!animate} onChange={event => setSpeed(70 - Number(event.target.value))} /></label>
      <label className="gg-setting-row"><span>开发调试</span><input type="checkbox" checked={debug} onChange={event => setDebug(event.target.checked)} /></label>
      <div className="gg-panel-actions"><button className="gg-button" type="button" onClick={() => setPanel('gallery')}><Palette size={16} />对话框图鉴</button><button className="gg-button" type="button" onClick={restart}><RotateCcw size={16} />重新开始</button></div>
    </Panel>}
    {panel === 'gallery' && <GalDialogueGallery scene={dialogueScene} assetsMap={assetsMap} onClose={() => setPanel(null)} />}
    {panel === 'debug' && debug && <Panel title="开发调试" wide onClose={() => setPanel(null)}><div className="gg-debug" data-testid="gal-story-debug"><h3>剧情后台状态</h3><pre>{JSON.stringify(state, null, 2)}</pre></div></Panel>}
    {confirm && <Panel title={confirm.title} onClose={() => setConfirm(null)}><p>{confirm.detail}</p><div className="gg-panel-actions gg-align-end"><button type="button" className="gg-button" onClick={() => setConfirm(null)}>取消</button><button type="button" className="gg-button gg-primary" autoFocus onClick={() => { const action = confirm.action; setConfirm(null); action() }}>确认</button></div></Panel>}
  </div>
}
