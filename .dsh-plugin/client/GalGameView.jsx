import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUp, BookOpen, Bug, Check, Download, Heart, History, LoaderCircle, MapPin, MessageCircle, Palette, RotateCcw, Save, Settings2, ShieldCheck, Square, Upload, X } from 'lucide-react'
import { SCENES, createGame, normalizeGame, currentScene, canAdvanceScene, advanceScene } from '../shared/gal-game.mjs'
import { GAME_STORAGE_KEY, readGame, readSlots, writeGame } from './gal-game-storage.mjs'
import { expressionFor } from './gal-game-expressions.mjs'
import { GAL_GAME_CSS } from './gal-game-styles.mjs'
import { GalDialogue } from './GalDialogue.jsx'
import { GalDialogueGallery } from './GalDialogueGallery.jsx'
import { GalStoryView } from './GalStoryView.jsx'
import { storyStorageKey } from './gal-story-storage.mjs'
import { Panel, Tool } from './gal-game-controls.jsx'

const EMPTY_CATALOG = { models: [], available: false }
const emotionLabels = { neutral: '平静', happy: '开心', shy: '害羞', sad: '低落', angry: '生气', thoughtful: '思考' }
const distanceLabels = ['相处自然', '有所隔阂', '需要时间', '保持距离', '保持距离', '保持距离']
const id = () => globalThis.crypto?.randomUUID?.() || `gal-${Date.now()}-${Math.random().toString(36).slice(2)}`
const browserStorage = () => { try { return window.localStorage } catch { return null } }
const signed = value => value > 0 ? `+${value}` : String(value)

function Meter({ label, value, icon: Icon, className }) {
  return <div className={`gg-meter ${className}`}><div><span><Icon size={15} />{label}</span><strong>{value}<small> / 100</small></strong></div><progress value={value} max="100" aria-label={label} /></div>
}

function GalFreeGameView({ gameApi, storageKey = GAME_STORAGE_KEY, scene: dialogueScene, assetsMap, onBusyChange, draft, setDraft }) {
  const [initial] = useState(() => {
    try { return { game: readGame(browserStorage(), storageKey), error: '' } }
    catch (error) { return { game: createGame({ id: id() }), error: error.message } }
  })
  const [game, setGame] = useState(initial.game)
  const gameRef = useRef(game)
  const [error, setError] = useState(initial.error)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(null)
  const [panel, setPanel] = useState(null)
  const [catalog, setCatalog] = useState(EMPTY_CATALOG)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [selection, setSelection] = useState(null)
  const [configuration, setConfiguration] = useState({ baseUrl: '', model: '', apiKey: '' })
  const [configuring, setConfiguring] = useState(false)
  const [slots, setSlots] = useState([null, null, null])
  const [confirm, setConfirm] = useState(null)
  const [animate, setAnimate] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [debug, setDebug] = useState(false)
  const [reveal, setReveal] = useState(0)
  const requestRef = useRef(null)
  const retryRef = useRef(null)
  const inputRef = useRef(null)
  const importRef = useRef(null)
  const aliveRef = useRef(true)
  const historyBottomRef = useRef(null)
  const scene = currentScene(game)
  const latest = [...game.history].reverse().find(line => line.role === 'assistant')
  const responseText = latest?.text || scene.opening
  const emotion = latest?.emotion || 'neutral'
  const lastDelta = latest?.delta
  const ready = catalog.available && Boolean(selection)
  const busy = Boolean(pending)

  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])

  function storeState(next) {
    gameRef.current = next
    setGame(next)
    retryRef.current = null
    try { writeGame(browserStorage(), storageKey, next) }
    catch (storageError) { setError(storageError.message || '进度保存失败，请导出存档。') }
  }

  function updateCatalog(next) {
    const models = Array.isArray(next?.models) ? next.models : []
    setCatalog({ ...next, models })
    setSelection(current => models.find(model => model.provider === current?.provider && model.model === current?.model) || models.find(model => /deepseek/i.test(model.model)) || models[0] || null)
    setConfiguration(current => ({ ...current, baseUrl: next.baseUrl || current.baseUrl, model: next.model || current.model, apiKey: '' }))
  }

  useEffect(() => {
    aliveRef.current = true
    let cancelled = false
    Promise.resolve().then(() => gameApi.catalog()).then(value => {
      if (!cancelled) updateCatalog(value)
    }).catch(catalogError => { if (!cancelled) setError(catalogError.message || '模型目录读取失败。') }).finally(() => { if (!cancelled) setCatalogLoading(false) })
    try { setSlots(readSlots(browserStorage(), storageKey)) } catch (slotError) { setError(slotError.message) }
    return () => { cancelled = true; aliveRef.current = false; requestRef.current?.abort() }
  }, [gameApi, storageKey])

  useEffect(() => {
    setReveal(animate ? 0 : responseText.length)
    if (!animate) return undefined
    let count = 0
    const timer = setInterval(() => {
      count = Math.min(responseText.length, count + 2)
      setReveal(current => Math.max(current, count))
      if (count >= responseText.length) clearInterval(timer)
    }, 22)
    return () => clearInterval(timer)
  }, [latest?.id, responseText, animate])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => { if (panel === 'history') historyBottomRef.current?.scrollIntoView({ block: 'end' }) }, [panel])

  async function send(event) {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || requestRef.current || gameRef.current.ending) return
    if (!ready) { setPanel('settings'); return }
    setError('')
    setReveal(responseText.length)
    const state = gameRef.current
    const previous = retryRef.current
    const route = `${selection.provider}/${selection.model}`
    const requestId = previous?.text === text && previous?.revision === state.revision && previous?.gameId === state.id && previous?.route === route ? previous.id : id()
    retryRef.current = { id: requestId, text, revision: state.revision, gameId: state.id, route }
    const controller = new AbortController()
    requestRef.current = controller
    setPending({ text })
    try {
      const result = await gameApi.turn({ state, text, requestId, selection: { provider: selection.provider, model: selection.model } }, { signal: controller.signal })
      if (!aliveRef.current || controller.signal.aborted || gameRef.current !== state) return
      if (result?.requestId !== requestId || result?.state?.id !== state.id || !result?.state?.requestIds?.includes(requestId)) throw new Error('模型返回的进度不完整，本轮尚未保存。')
      storeState(normalizeGame(result.state))
      setDraft('')
      inputRef.current?.focus()
    } catch (turnError) {
      if (aliveRef.current) setError(controller.signal.aborted ? '本轮已取消，进度未改变。' : turnError.message || '本轮未完成，进度未改变。')
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      if (aliveRef.current) setPending(null)
    }
  }

  function nextScene() {
    if (busy || !canAdvanceScene(game)) return
    try { setError(''); storeState(advanceScene(game)); setDraft(''); setPanel(null) }
    catch (sceneError) { setError(sceneError.message) }
  }

  async function configure(event) {
    event.preventDefault()
    if (!gameApi.configure || configuring || busy) return
    setConfiguring(true)
    setError('')
    try {
      const value = await gameApi.configure(configuration)
      if (!aliveRef.current) return
      updateCatalog(value)
      setNotice('模型配置已应用')
      setPanel(null)
    } catch (configError) { if (aliveRef.current) setError(configError.message || '模型配置未保存。') }
    finally { if (aliveRef.current) { setConfiguration(current => ({ ...current, apiKey: '' })); setConfiguring(false) } }
  }

  function saveSlot(index) {
    const next = slots.map((slot, at) => at === index ? { savedAt: new Date().toISOString(), state: gameRef.current } : slot)
    try {
      const storage = browserStorage()
      if (!storage) throw new Error('浏览器存储不可用。')
      storage.setItem(storageKey + ':slots', JSON.stringify(next))
      setSlots(next)
      setNotice(`已保存至存档 ${index + 1}`)
    } catch (slotError) { setError(slotError.message || '存档失败，请导出进度。') }
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify({ kind: 'model-router-gal-game', savedAt: new Date().toISOString(), state: game }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `model-city-${scene.id}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  async function importSave(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    try {
      if (file.size > 1_000_000) throw new Error('存档文件超过 1 MB。')
      const value = JSON.parse(await file.text())
      if (value?.kind !== 'model-router-gal-game' || value.state?.version !== 1 || value.state?.characterId !== 'deepseek') throw new Error('这不是有效的游戏存档。')
      setConfirm({ title: '读取导入的存档？', detail: '当前自动保存进度将被替换。', action: () => { storeState(normalizeGame(value.state)); setDraft(''); setPanel(null); setNotice('存档已读取') } })
    } catch (importError) { setError(importError.message || '无法读取存档文件。') }
  }

  function resetGame() {
    setConfirm({ title: '重新开始这段故事？', detail: '当前自动保存进度将被替换，手动存档会保留。', action: () => { storeState(createGame({ id: id() })); setDraft(''); setError(''); setPanel(null) } })
  }

  return <div className="gg-root" data-testid="gal-game" data-model-ready={ready} data-debug-enabled={debug}>
    <style>{GAL_GAME_CSS}</style>
    <header className="gg-header">
      <div className="gg-brand"><h1>未写完的约定</h1><span>DeepSeek</span></div>
      <div className="gg-header-actions">
        <Tool label="共同回忆" icon={BookOpen} onClick={() => setPanel('memories')} />
        <Tool label="对话回顾" icon={History} onClick={() => setPanel('history')} />
        <Tool label="存档与读档" icon={Save} onClick={() => setPanel('saves')} disabled={busy} />
        {debug && <Tool label="查看开发调试" icon={Bug} className="gg-debug-trigger" onClick={() => setPanel('debug')} />}
        <Tool label="模型与显示设置" icon={Settings2} onClick={() => setPanel('settings')} />
      </div>
    </header>

      <main className="gg-main">
        <section className="gg-stage" aria-label="游戏场景">
          <div className="gg-scene-meta"><span><MapPin size={13} />{scene.location}</span><time>{scene.time}</time></div>
          <div className="gg-scene-placeholder"><h2>{scene.location}</h2><span className="gg-placeholder-rule" /><p>{scene.description}</p></div>
          <img className="gg-character" src={expressionFor(emotion)} alt="DeepSeek" draggable="false" />
        </section>

        <GalDialogue character="deepseek" text={responseText} shown={animate ? responseText.slice(0, reveal) : responseText} narration={latest?.narration || ''} busy={busy} pendingText={pending?.text || ''} onAdvance={() => setReveal(responseText.length)} scene={dialogueScene} assetsMap={assetsMap} />

        <div className="gg-input-band">
          {error && <div className="gg-error" role="alert"><span>{error}</span><Tool label="关闭提示" icon={X} onClick={() => setError('')} /></div>}
          {game.ending ? <div className="gg-ending"><div><h2>未写完的约定</h2><p>{game.ending.description}</p></div><Tool label="重新开始" icon={RotateCcw} onClick={resetGame} /></div> : <form className="gg-composer" onSubmit={send}>
            <label className="gg-player-label" htmlFor="gg-player-input">你</label><textarea ref={inputRef} id="gg-player-input" rows={2} placeholder="此刻，想对她说些什么……" value={draft} maxLength={2000} disabled={busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); void send() } }} />
            {busy ? <Tool label="取消本次回应" icon={Square} className="gg-send" onClick={() => requestRef.current?.abort()} /> : <Tool label={ready ? '发送' : '连接模型'} icon={ArrowUp} className="gg-send" disabled={!draft.trim() || catalogLoading} onClick={send} />}
          </form>}
          <footer className="gg-bottom-bar">{!game.ending && canAdvanceScene(game) && <button className="gg-next" type="button" onClick={nextScene} disabled={busy}>继续<ArrowRight size={16} /></button>}</footer>
        </div>
      </main>

    {notice && <div role="status" className="gg-notice"><Check size={15} />{notice}</div>}

    {panel === 'history' && <Panel title="对话回顾" wide onClose={() => setPanel(null)}><div className="gg-history">{game.history.map((line, index) => { const place = SCENES.find(item => item.id === line.sceneId); return <React.Fragment key={line.id || index}>{line.sceneId !== game.history[index - 1]?.sceneId && <div className="gg-history-scene">{place?.location} · {place?.time}</div>}<article className={`gg-history-line ${line.role === 'user' ? 'is-player' : ''}`}><span>{line.role === 'user' ? '你' : 'DeepSeek'}</span><div>{line.narration && <p className="gg-muted">{line.narration}</p>}<p>{line.text}</p></div></article></React.Fragment> })}<div ref={historyBottomRef} /></div></Panel>}

    {panel === 'memories' && <Panel title="共同回忆" onClose={() => setPanel(null)}>{game.memories.some(memory => memory.quote) ? <ol className="gg-memory-list">{game.memories.filter(memory => memory.quote).map(memory => <li key={memory.id}><span>{SCENES.find(item => item.id === memory.sceneId)?.location}</span><blockquote>“{memory.quote}”</blockquote></li>)}</ol> : <div className="gg-empty"><BookOpen size={30} /><h3>故事刚刚开始</h3><p>纪念页上，还没有写下第一句话。</p></div>}</Panel>}

    {panel === 'saves' && <Panel title="存档与读档" onClose={() => setPanel(null)}><div className="gg-save-list">{slots.map((slot, index) => <article key={index} className="gg-save-slot"><span className="gg-save-number">0{index + 1}</span><div><h3>{slot?.invalid ? '存档无法读取' : slot ? currentScene(slot.state).location : '空白存档'}</h3><p>{slot?.state ? [...slot.state.history].reverse().find(line => line.role === 'assistant')?.text || currentScene(slot.state).time : '尚未记录'}</p>{slot?.savedAt && <time>{new Date(slot.savedAt).toLocaleString('zh-CN', { hour12: false })}</time>}</div><div className="gg-save-actions"><Tool label={`保存到存档 ${index + 1}`} icon={Save} disabled={busy} onClick={() => slot ? setConfirm({ title: `覆盖存档 ${index + 1}？`, detail: '这个手动存档将替换为当前进度。', action: () => saveSlot(index) }) : saveSlot(index)} /><Tool label={`读取存档 ${index + 1}`} icon={Upload} disabled={busy || !slot || slot.invalid} onClick={() => setConfirm({ title: `读取存档 ${index + 1}？`, detail: '当前自动保存进度将被替换。', action: () => { storeState(normalizeGame(slot.state)); setDraft(''); setPanel(null); setNotice('存档已读取') } })} /></div></article>)}</div><div className="gg-panel-actions"><button className="gg-button" type="button" onClick={exportSave}><Download size={16} />导出存档</button><button className="gg-button" type="button" disabled={busy} onClick={() => importRef.current?.click()}><Upload size={16} />导入存档</button></div><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importSave} /></Panel>}

    {panel === 'settings' && <Panel title="模型与显示设置" onClose={() => { if (!configuring) { setPanel(null); setConfiguration(current => ({ ...current, apiKey: '' })) } }}>
      {error && <p className="gg-form-error" role="alert">{error}</p>}
      <p className={`gg-connection ${ready ? 'is-ready' : ''}`}><i />{catalogLoading ? '连接中' : ready ? '模型已连接' : '尚未连接模型'}</p>
      <label className="gg-field">对话模型<select value={selection ? `${selection.provider}\n${selection.model}` : ''} disabled={busy || configuring || !catalog.models.length} onChange={event => setSelection(catalog.models.find(model => `${model.provider}\n${model.model}` === event.target.value) || null)}>{!catalog.models.length && <option value="">尚未连接</option>}{catalog.models.map(model => <option key={`${model.provider}/${model.model}`} value={`${model.provider}\n${model.model}`}>{model.label || model.model} · {model.provider}</option>)}</select></label>
      {typeof gameApi.configure === 'function' && <form onSubmit={configure} className="gg-model-form"><label className="gg-field">API 地址<input type="url" autoComplete="off" placeholder="https://api.example.com/v1" value={configuration.baseUrl} required disabled={busy || configuring} onChange={event => setConfiguration(current => ({ ...current, baseUrl: event.target.value }))} /></label><label className="gg-field">模型名称<input autoComplete="off" placeholder="deepseek-chat" value={configuration.model} required disabled={busy || configuring} onChange={event => setConfiguration(current => ({ ...current, model: event.target.value }))} /></label><label className="gg-field">API 密钥<input type="password" autoComplete="new-password" placeholder="本地模型可留空" value={configuration.apiKey} disabled={busy || configuring} onChange={event => setConfiguration(current => ({ ...current, apiKey: event.target.value }))} /></label><button type="submit" className="gg-button gg-primary" disabled={busy || configuring}>{configuring ? <LoaderCircle size={16} className="gg-spin" /> : <Check size={16} />}应用连接</button></form>}
      {typeof gameApi.configure !== 'function' && !catalog.models.length && <p className="gg-muted">宿主尚无可用的模型连接。</p>}
      <label className="gg-setting-row"><span>逐字显示对话</span><input aria-label="逐字显示对话" type="checkbox" checked={animate} onChange={event => setAnimate(event.target.checked)} /></label>
      <label className="gg-setting-row"><span>开发调试</span><input aria-label="开发调试" type="checkbox" checked={debug} onChange={event => setDebug(event.target.checked)} /></label>
      <div className="gg-panel-actions"><button type="button" className="gg-button" disabled={configuring} onClick={() => setPanel('gallery')}><Palette size={15} />对话框图鉴</button>{debug && <button type="button" className="gg-button" onClick={() => setPanel('debug')}><Bug size={15} />查看开发调试</button>}<button type="button" className="gg-button" disabled={busy || configuring} onClick={resetGame}><RotateCcw size={15} />重新开始</button></div>
    </Panel>}
    {panel === 'gallery' && <GalDialogueGallery scene={dialogueScene} assetsMap={assetsMap} onClose={() => setPanel(null)} />}

    {debug && panel === 'debug' && <Panel title="开发调试" wide onClose={() => setPanel(null)}><div className="gg-debug" data-testid="gal-game-debug">
      <section><h3>关系状态</h3><div className="gg-debug-meters"><Meter label="好感" value={game.affection} icon={Heart} className="gg-affection" /><Meter label="信任" value={game.trust} icon={ShieldCheck} className="gg-trust" /></div><dl className="gg-debug-values"><dt>关系阶段</dt><dd>{game.stage}</dd><dt>情绪</dt><dd>{game.mood} · {emotionLabels[emotion] || '平静'}</dd><dt>隔阂</dt><dd>{game.distance} · {distanceLabels[game.distance] || '保持距离'}</dd><dt>关系意愿</dt><dd>{game.relationshipPreference}</dd><dt>双方确认恋爱</dt><dd>{game.romanceConsent ? '是' : '否'}</dd></dl></section>
      <section><h3>剧情进度</h3><dl className="gg-debug-values"><dt>当前场景</dt><dd>{game.sceneIndex + 1} / {SCENES.length} · {scene.title}</dd><dt>已互动轮数</dt><dd>{game.sceneTurns} / {scene.requiredTurns}</dd><dt>场景目标</dt><dd>{scene.goal}</dd><dt>事件条件</dt><dd>{scene.eventGoal}</dd><dt>可推进</dt><dd>{canAdvanceScene(game) ? '是' : '否'}</dd><dt>存档修订</dt><dd>{game.revision}</dd><dt>当前结局</dt><dd>{game.ending?.title || '未结束'}</dd></dl><ol className="gg-debug-scenes">{SCENES.map((item, index) => <li key={item.id} aria-current={index === game.sceneIndex ? 'step' : undefined}>{index + 1}. {item.title}{index === game.sceneIndex ? '（当前）' : ''}</li>)}</ol><h4>本场景关系变化预算</h4><pre>{JSON.stringify(game.sceneBudget, null, 2)}</pre></section>
      <section><h3>最近判定</h3><dl className="gg-debug-values"><dt>好感变化</dt><dd>{signed(lastDelta?.affection || 0)}</dd><dt>信任变化</dt><dd>{signed(lastDelta?.trust || 0)}</dd><dt>判定理由</dt><dd>{latest?.reason || '暂无判定'}</dd></dl><details><summary>历史判定</summary>{game.history.filter(line => line.reason).map(line => <article className="gg-debug-judgment" key={line.id}><p>{line.text}</p><p>好感 {signed(line.delta?.affection || 0)} · 信任 {signed(line.delta?.trust || 0)}</p><p>{line.reason}</p></article>)}</details></section>
      <section><h3>已完成事件（{game.completedEvents.length}）</h3>{game.completedEvents.length ? <ul>{game.completedEvents.map(eventId => <li key={eventId}>{eventId}</li>)}</ul> : <p className="gg-muted">暂无</p>}</section>
      <section><h3>后台记忆与证据（{game.memories.length}）</h3>{game.memories.length ? <ol className="gg-memory-list">{game.memories.map(memory => <li key={memory.id}><span>{memory.sceneId}</span><p>{memory.text}</p><blockquote>{memory.quote || '无引用'}</blockquote></li>)}</ol> : <p className="gg-muted">暂无</p>}</section>
    </div></Panel>}

    {confirm && <Panel title={confirm.title} onClose={() => setConfirm(null)}><p>{confirm.detail}</p><div className="gg-panel-actions gg-align-end"><button type="button" className="gg-button" onClick={() => setConfirm(null)}>取消</button><button type="button" className="gg-button gg-primary" autoFocus onClick={() => { const action = confirm.action; setConfirm(null); action() }}>确认</button></div></Panel>}
  </div>
}

export function GalGameView({ gameApi, storageKey = GAME_STORAGE_KEY, scene, assetsMap }) {
  const [mode, setMode] = useState(() => {
    try { return browserStorage()?.getItem(`${storageKey}:mode`) === 'free' ? 'free' : 'story' }
    catch { return 'story' }
  })
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [storySession, setStorySession] = useState(null)
  function chooseMode(next) {
    if (busy || mode === next) return
    setMode(next)
    try { browserStorage()?.setItem(`${storageKey}:mode`, next) } catch { /* Play remains available when preferences cannot be saved. */ }
  }
  return <div className="gg-module" data-testid="gal-module" data-game-mode={mode}>
    <style>{GAL_GAME_CSS}</style>
    <div className="gg-mode-bar" role="tablist" aria-label="游戏模式">
      <button type="button" role="tab" aria-selected={mode === 'story'} aria-controls="gg-story-mode" disabled={busy} onClick={() => chooseMode('story')}><BookOpen size={16} />剧情模式</button>
      <button type="button" role="tab" aria-selected={mode === 'free'} aria-controls="gg-free-mode" disabled={busy} onClick={() => chooseMode('free')}><MessageCircle size={16} />自由模式</button>
    </div>
    <div className="gg-mode-content" role="tabpanel" id={mode === 'story' ? 'gg-story-mode' : 'gg-free-mode'} aria-label={mode === 'story' ? '剧情模式' : '自由模式'}>
      {mode === 'story' ? <GalStoryView storageKey={storyStorageKey(storageKey)} scene={scene} assetsMap={assetsMap} sessionState={storySession} onStateChange={setStorySession} /> : <GalFreeGameView gameApi={gameApi} storageKey={storageKey} scene={scene} assetsMap={assetsMap} onBusyChange={setBusy} draft={draft} setDraft={setDraft} />}
    </div>
  </div>
}
