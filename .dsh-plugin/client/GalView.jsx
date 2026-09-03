/** GAL 视窗顶层：模式切换 + 游戏模式（舞台/控制条/输入/历史/设置）+ 编辑模式。
 * 数据来源：useChat（Conversation 的 Chat target）、useSession（生命周期）、
 * inputActions（发送走宿主输入机，与普通输入框同一管线）。
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { StageView } from './StageView.jsx'
import { Editor } from './Editor.jsx'
import { SafeMarkdownText } from './SafeMarkdownText.jsx'
import { createTypeState, setTarget, skip, advance, SPEEDS } from './typewriter.mjs'
import {
  normalizeNodes, nodesToLines, partialToText, deriveStatus, routeFromNode, speakerFor, shouldRenderMarkdown, welcomeLine,
} from './transcript.mjs'
import { splitPages, createFitsMeasurer } from './paging.mjs'
import { buildPlan, MODEL_CATALOG } from '../shared/router.mjs'
import { characterForModel } from './characters.mjs'
import { readArchives, upsertArchive } from './archives.mjs'
import { AnalysisSummary, ArchiveRail, CollaborationBoard, MaidAvatar, ModelPicker } from './GalPanels.jsx'

/** 玩家消息完整显示后的最短滞留时长（此后由模型状态触发翻页）。 */
const STATUS_DWELL_MS = 1500
/** 模型状态迟迟未到时的兜底等待上限（超过后按当前状态翻页）。 */
const STATUS_MAX_WAIT_MS = 6000

function browserStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}

/** 发送玩家输入：先提交最新草稿到宿主，再走原生输入机。 */
function useSend(inputActions, draft, setDraft, hasImages, syncDraft, onRouterCommand) {
  return useCallback(() => {
    const text = draft.trim()
    if (text === '' && !hasImages) return
    const routerMode = /^\/router\s+mode\s+(single|collective)\s*$/i.exec(text)?.[1]?.toLowerCase()
    if (routerMode !== undefined && hasImages && typeof onRouterCommand === 'function') {
      // A mode command does not need the image. Execute it through the
      // session face so the normal command gate cannot reject the submission
      // and, more importantly, so the image remains attached for the actual
      // question that follows.
      onRouterCommand(routerMode, draft, true)
      return
    }
    syncDraft(draft)
    inputActions.submit()
    setDraft('')
    syncDraft('')
  }, [draft, hasImages, inputActions, onRouterCommand, setDraft, syncDraft])
}

const DOCUMENT_EXTENSIONS = /\.(?:md|markdown|txt|text|csv|tsv|json|jsonl|xml|html?|css|js|jsx|ts|tsx|py|java|c|cc|cpp|h|hpp|rs|go|rb|php|sql|yaml|yml|toml|ini|cfg|log)$/i
const DOCUMENT_TEXT_LIMIT = 4 * 1024 * 1024
const EMPTY_IMAGE_IDS = []

function isImageFile(file) {
  return typeof file?.type === 'string' && file.type.startsWith('image/')
}

function isTextDocument(file) {
  return (typeof file?.type === 'string' && (file.type.startsWith('text/') || /json|xml|javascript|typescript|yaml|toml|csv/i.test(file.type)))
    || DOCUMENT_EXTENSIONS.test(String(file?.name ?? ''))
}

async function readDocumentText(file) {
  if (!isTextDocument(file)) return null
  if (Number(file.size ?? 0) > DOCUMENT_TEXT_LIMIT) throw new Error('文件超过 4 MB，无法直接插入对话。')
  const text = await file.text()
  if (text.trim() === '') throw new Error('文件没有可读取的文本内容。')
  return text
}

function documentBlock(name, text) {
  return `\n\n--- 文件：${name} ---\n${text}\n--- 文件结束：${name} ---\n`
}

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 1024) return `${Math.max(0, Math.round(value || 0))} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function routeFromNodes(nodes) {
  if (!Array.isArray(nodes)) return null
  let latestUserSeq = -Infinity
  for (const node of nodes) {
    if (node?.kind === 'user' || node?.kind === 'steering') latestUserSeq = Math.max(latestUserSeq, Number(node.seq ?? -Infinity))
  }
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (node?.kind !== 'assistant') continue
    if (Number(node.seq ?? -Infinity) <= latestUserSeq) continue
    const route = routeFromNode(node)
    if (route?.provider && route?.model) return { provider: route.provider, model: route.model }
  }
  return null
}

function modelAccent(model) {
  const value = String(model ?? '')
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 78% 72%)`
}

/** 当前模型在 GAL 名牌上的显示名。日志仍保留真实 model/provider 字段，
 * 舞台名牌使用角色名，避免把供应商内部 ID 当成角色名展示。 */
function maidName(model, provider = '') {
  const character = characterForModel(model, provider)
  return `${character.label}娘`
}

function speakerForCurrentLine(scene, line, activeRoute) {
  if (line?.kind === 'player') return speakerFor(scene, 'player')
  if (line?.kind === 'system') return speakerFor(scene, 'system')
  if (line?.kind !== 'assistant') return speakerFor(scene, 'assistant')
  // The stage character and nameplate must switch together. Prefer the live
  // route (including a newly selected single-session model); the persisted
  // line route remains available to the history/log views.
  const route = activeRoute?.model
    ? activeRoute
    : line.model ? { provider: line.provider ?? '', model: line.model } : null
  if (route?.model) {
    return {
      name: maidName(route.model, route.provider),
      color: modelAccent(route.model),
    }
  }
  return speakerFor(scene, 'assistant')
}

function needsWholeMarkdown(text) {
  const value = String(text ?? '')
  return value.length > 800 || /(^|\n)\s*(?:#{1,6}\s|```|~~~|[-*+]\s|\d+[.)]\s|\|.+\|)|\$\$|\\\[|\\\(|\[[^\]]+\]\([^)]+\)/m.test(value)
}

function RouterPanel({ plan, route, displayRoute, onMode, routerMode, routerSnapshot, routerActions }) {
  const weights = plan?.objectiveWeights ?? { quality: 0, cost: 0, latency: 0, risk: 0 }
  const selected = route ?? plan?.selected
  const modeLabel = routerMode === 'single' ? '单独会话' : '集体合作'
  const modeDetail = routerMode === 'single'
    ? (selected?.model ? `固定：${selected.model}` : '等待选择模型')
    : '按任务复杂度自动分配'
  return (
    <section className="gv-router-panel" aria-label="智能分配方案">
      <div className="gv-router-head">
        <span className="gv-router-title">智能分配方案</span>
        <MaidAvatar model={displayRoute?.model || selected?.model || 'DeepSeek Harness'} provider={displayRoute?.provider ?? selected?.provider} active={Boolean(selected)} />
      </div>
      <details className="gv-session-details">
        <summary className="gv-session-summary">
          <span className="gv-session-summary-title">会话方式</span>
          <strong>{modeLabel}</strong>
          <span className="gv-session-summary-detail">{modeDetail}</span>
        </summary>
        <div className="gv-session-body">
          <ModelPicker mode={routerMode} snapshot={routerSnapshot} actions={routerActions} onMode={onMode} selectedRoute={selected} />
          <div className="gv-router-grid">
            <span>复杂度 <b>{plan ? `${Math.round((plan.complexity?.value ?? 0) * 100)}%` : '分析中'}</b></span>
            <span>任务类型 <b>{plan?.taskType ?? '待提问'}</b></span>
            <span>当前模型 <b>{selected?.model ?? '等待路由'}</b></span>
            <span>预估费用 <b>{plan ? `$${Number(plan.estimatedCost ?? 0).toFixed(4)}` : '—'}</b></span>
          </div>
          {plan && routerMode === 'collective' && (
            <>
              <div className="gv-router-weights" aria-label="目标权重">
                <span>质量 {Math.round(weights.quality * 100)}%</span>
                <span>成本 {Math.round(weights.cost * 100)}%</span>
                <span>延迟 {Math.round(weights.latency * 100)}%</span>
                <span>风险 {Math.round(weights.risk * 100)}%</span>
              </div>
              <div className="gv-router-reason">{plan.reason}</div>
              <div className="gv-router-candidates">
                {(plan.candidates ?? []).slice(0, 4).map(candidate => (
                  <span key={`${candidate.provider}/${candidate.model}`} title={`综合 ${candidate.score}，专长 ${candidate.specialty}`}>
                    {candidate.model} · {Math.round(candidate.score * 100)}%
                  </span>
                ))}
              </div>
            </>
          )}
          {routerMode === 'single' && selected && <div className="gv-router-single-note">后续请求固定交给 <b>{selected.provider}/{selected.model}</b>，集体路由不会改写单独会话。</div>}
        </div>
      </details>
    </section>
  )
}

/** 对话历史面板（右侧滑出）。 */
function HistoryPanel({ scene, lines, onClose }) {
  const listRef = useRef(null)
  useEffect(() => {
    const list = listRef.current
    if (list !== null) list.scrollTop = list.scrollHeight
  }, [lines])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="gv-history" role="dialog" aria-label="对话历史">
      <div className="gv-history-head">
        <span>历史</span>
        <button type="button" className="gv-btn" onClick={onClose}>关闭</button>
      </div>
      <div className="gv-history-list" ref={listRef}>
        {lines.length === 0 && <div className="gv-history-empty">还没有对话记录</div>}
        {lines.map(line => {
          const lineSpeaker = line.kind === 'assistant' && line.model
            ? characterForModel(line.model, line.provider)
            : null
          const speaker = lineSpeaker === null
            ? speakerFor(scene, line.kind)
            : { name: `${lineSpeaker.label}娘`, color: modelAccent(line.model) }
          return (
            <div className="gv-history-row" key={line.key}>
              <span className="gv-history-name" style={{ color: speaker.color }}>{speaker.name}</span>
              <div className="gv-history-text">
                {shouldRenderMarkdown(line)
                  ? <SafeMarkdownText text={line.text} />
                  : <span className="gv-plain-text">{line.text}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 设置浮层：说话角色 / 玩家名 / 打字速度。开时快照、关时提交历史。 */
function SettingsPanel({ scene, api, onClose }) {
  const beforeRef = useRef(null)
  useEffect(() => {
    beforeRef.current = api.snapshotScene()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (beforeRef.current !== null) {
        api.commitHistory(beforeRef.current)
        beforeRef.current = null
      }
    }
  }, [api, onClose])
  const characters = scene.elements.filter(el => el.type === 'character' && el.character)
  return (
    <div className="gv-settings" role="dialog" aria-label="设置">
      <div className="gv-settings-head">
        <span>设置</span>
        <button type="button" className="gv-btn" onClick={onClose}>关闭</button>
      </div>
      <label className="gv-settings-row">
        <span>说话角色</span>
        <select
          value={scene.settings.assistantSpeaker}
          onChange={e => api.updateSettings({ assistantSpeaker: e.target.value })}
        >
          {characters.map(el => (
            <option key={el.id} value={el.id}>{el.character.name}（{el.character.label}）</option>
          ))}
          <option value="">系统</option>
        </select>
      </label>
      <label className="gv-settings-row">
        <span>玩家名</span>
        <input
          type="text"
          value={scene.settings.playerName}
          onChange={e => api.updateSettings({ playerName: e.target.value })}
          placeholder="你"
        />
      </label>
      <label className="gv-settings-row">
        <span>打字速度</span>
        <select value={scene.settings.typeSpeed} onChange={e => api.updateSettings({ typeSpeed: e.target.value })}>
          <option value="slow">慢</option>
          <option value="normal">正常</option>
          <option value="fast">快</option>
        </select>
      </label>
      <p className="gv-settings-hint">角色名称/颜色在编辑模式中修改；说话角色引用会实时生效。</p>
    </div>
  )
}

/** GAL 输入区附件选择器：图片走宿主原生多模态附件，文本文档提取后随本轮文本发送。 */
function AttachmentPicker({ inputActions, inputState, attachmentApi, draft, setDraft }) {
  const fileRef = useRef(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [documents, setDocuments] = useState([])
  const imageIds = Array.isArray(inputState?.imageIds) ? inputState.imageIds : []
  const imageAttachments = attachmentApi?.draftImages?.(imageIds) ?? []

  useEffect(() => {
    if (draft !== '' || documents.length === 0) return
    setDocuments([])
  }, [documents.length, draft])

  useEffect(() => {
    if (notice === '') return undefined
    const timer = setTimeout(() => setNotice(''), 6500)
    return () => clearTimeout(timer)
  }, [notice])

  const onFiles = useCallback(async event => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    const messages = []
    try {
      const images = files.filter(isImageFile)
      const unsupportedImages = images.filter(file => !/^image\/(?:png|jpeg|webp|gif)$/i.test(file.type))
      const supportedImages = images.filter(file => !unsupportedImages.includes(file))
      if (unsupportedImages.length > 0) messages.push(`已跳过不受支持的图片格式：${unsupportedImages.map(file => file.name).join('、')}`)
      if (supportedImages.length > 0 && attachmentApi?.createDraftImages !== undefined) {
        try {
          const created = attachmentApi.createDraftImages(supportedImages)
          const accepted = inputActions.addImages(created.map(item => item.id))
          if (!accepted) {
            attachmentApi.releaseDraftImages?.(created)
            messages.push('当前模型正在生成，暂不能添加图片。')
          }
        } catch (error) {
          messages.push(error instanceof Error ? error.message : '图片添加失败。')
        }
      }
      const documents = files.filter(file => !isImageFile(file))
      for (const file of documents) {
        try {
          const text = await readDocumentText(file)
          const name = file.name || '未命名文件'
          const block = text !== null
            ? documentBlock(name, text)
            : `\n\n[文件附件：${name}，大小 ${formatBytes(file.size)}。当前通道不解析该二进制格式，请根据文件名说明处理需求。]\n`
          setDraft(current => current + block)
          setDocuments(current => [...current, { name, size: file.size, block, extracted: text !== null }])
          if (text === null) {
            messages.push(`${file.name || '未命名文件'} 已记录，但 PDF/DOCX 等二进制文件需要先转换为 Markdown/TXT 才能读取正文。`)
          }
        } catch (error) {
          messages.push(`${file.name || '文件'}：${error instanceof Error ? error.message : '读取失败。'}`)
        }
      }
    } finally {
      setBusy(false)
      if (messages.length > 0) setNotice(messages.join(' '))
    }
  }, [attachmentApi, inputActions, setDraft])

  const removeImage = useCallback(id => {
    inputActions.removeImage(id)
    attachmentApi?.releaseDraftImage?.(id)
  }, [attachmentApi, inputActions])

  const removeDocument = useCallback(document => {
    setDraft(current => current.replace(document.block, ''))
    setDocuments(current => current.filter(item => item !== document))
  }, [setDraft])

  return (
    <div className="gv-attachments" aria-label="附件">
      <input
        ref={fileRef}
        className="gv-file-input"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,.md,.markdown,.txt,.csv,.json,.jsonl,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.rs,.go,.rb,.php,.sql,.yaml,.yml,.toml,.ini,.cfg,.log,.pdf,.doc,.docx"
        onChange={onFiles}
      />
      <button type="button" className="gv-btn gv-attach-btn" onClick={() => fileRef.current?.click()} disabled={busy} title="上传图片或文档">
        {busy ? '读取中…' : '附件'}
      </button>
      {imageAttachments.map(item => (
        <span className="gv-attachment-chip" key={String(item.id)}>
          <img src={item.previewUrl} alt="" />
          <span>{item.file?.name || '图片'}</span>
          <button type="button" aria-label={`移除 ${item.file?.name || '图片'}`} onClick={() => removeImage(item.id)}>×</button>
        </span>
      ))}
      {documents.map(document => (
        <span className="gv-attachment-chip gv-document-chip" key={`${document.name}:${document.block}`}>
          <span className="gv-document-icon" aria-hidden="true">DOC</span>
          <span title={document.extracted ? '已提取文本' : '仅记录文件名'}>{document.name}</span>
          <button type="button" aria-label={`移除 ${document.name}`} onClick={() => removeDocument(document)}>×</button>
        </span>
      ))}
      {notice !== '' && <span className="gv-attachment-notice" role="status">{notice}</span>}
      {imageAttachments.length > 0 && <span className="gv-attachment-status" role="status" title="图片会在发送前转换为结构化文字，纯文本模型也可据此回答">ModLens 已启用 · 发送前分析图片</span>}
    </div>
  )
}

/**
 * 填满会话区：挂载时隐藏会话外壳的输入席（data-composer-seat），让视窗占满整个
 * 会话主体（data-conversation-scroll）。GAL 视窗只在自身激活时被挂载，卸载（切回
 * 「对话」/「轨迹」标签）时恢复原状。找不到外壳（独立挂载/冒烟环境）时静默跳过。
 * @param rootRef - 视窗根节点。
 * @returns 恢复函数。
 */
function useFillSessionArea(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    const scrollBody = root.closest('[data-conversation-scroll]')
    const seat = scrollBody?.querySelector(':scope > [data-composer-seat]') ?? null
    if (scrollBody === null || seat === null) return
    const prev = {
      seatDisplay: seat.style.display,
      overflow: scrollBody.style.overflow,
      position: scrollBody.style.position,
    }
    seat.style.display = 'none'
    scrollBody.style.overflow = 'hidden'
    scrollBody.style.position = 'relative'
    root.setAttribute('data-gal-fills', '')
    return () => {
      seat.style.display = prev.seatDisplay
      scrollBody.style.overflow = prev.overflow
      scrollBody.style.position = prev.position
      root.removeAttribute('data-gal-fills')
    }
  }, [rootRef])
}

/**
 * GAL 视窗组件（conversation.view 槽位条目）。
 * @param props - 槽位框架注入：sessionId/useSession/useChat/useInput/inputActions + inject 面的 useScene/useHistory/api。
 */
export function GalView({ sessionId, useSession, useSessions, useConversation, useChat, useInput, inputActions, attachmentApi, useScene, useHistory, useAssets, useFonts, useStore, useRouter, routerActions, openSession, actions, api }) {
  const scene = useScene(s => s)
  const history = useHistory(h => h)
  const assets = useAssets(a => a)
  const fonts = useFonts(f => f)
  const readState = useStore(s => s)
  const session = useSession(s => s)
  const conversation = typeof useConversation === 'function' ? useConversation(s => s) : null
  const chat = typeof useChat === 'function'
    ? useChat(s => s)
    : conversation?.views?.get?.('chat') ?? null
  const legacy = chat?.legacy ?? null
  const sessionNodes = legacy?.nodes ?? []
  const nodes = normalizeNodes(sessionNodes)
  const partial = legacy?.partial ?? null
  const running = session?.running === true
  const blank = session?.blank === true
  const runningCalls = Array.isArray(legacy?.runningCalls) ? legacy.runningCalls : []
  const pending = Array.isArray(session?.pendingSubmissions) ? session.pendingSubmissions : []
  const promptError = session?.promptError ?? null
  // GAL only needs the draft and image ids. Ignore unrelated input-machine
  // changes (queue/phase/notices) so they cannot interrupt text editing.
  const inputState = typeof useInput === 'function'
    ? useInput(
      s => ({ draft: typeof s?.draft === 'string' ? s.draft : '', imageIds: Array.isArray(s?.imageIds) ? s.imageIds : EMPTY_IMAGE_IDS }),
      (a, b) => a?.draft === b?.draft && a?.imageIds === b?.imageIds,
    )
    : null
  const routerSnapshot = typeof useRouter === 'function' ? useRouter(s => s) : null
  const sessionList = typeof useSessions === 'function' ? useSessions(s => s) : null

  const [mode, setMode] = useState('game')
  const [auto, setAuto] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archives, setArchives] = useState(() => readArchives(browserStorage()))
  const [draft, setDraft] = useState('')
  const [taskbarOpen, setTaskbarOpen] = useState(true)
  const [type, setType] = useState(createTypeState)
  const [pages, setPages] = useState([])
  const [pageIndex, setPageIndex] = useState(0)
  const [routerMode, setRouterMode] = useState('collective')
  const rootRef = useRef(null)
  const inputBoxRef = useRef(null)
  const draftSelectionRef = useRef(null)
  const draftRef = useRef('')
  const hostDraftRef = useRef('')
  const draftFocusedRef = useRef(false)
  const awaitingHostDraftRef = useRef(null)
  const taskbarTimerRef = useRef(null)
  // 阅读状态恢复/保存（标签页切换与刷新后不从头渲染）。
  const readStateRef = useRef(readState)
  readStateRef.current = readState
  const restoredKeyRef = useRef(null)
  useFillSessionArea(rootRef)

  // Keep a responsive local draft while syncing to the Host only at explicit
  // handoff points. Calling setDraft for every key rebuilds the Host Lexical
  // tree and makes the GAL textarea lose its smooth caret/input rhythm.
  const updateDraft = useCallback(next => {
    const value = typeof next === 'function' ? next(draftRef.current) : String(next ?? '')
    draftRef.current = value
    setDraft(value)
  }, [])
  useLayoutEffect(() => {
    const selection = draftSelectionRef.current
    const input = inputBoxRef.current
    if (selection === null || input === null || document.activeElement !== input) return
    const start = Math.max(0, Math.min(selection.start, input.value.length))
    const end = Math.max(start, Math.min(selection.end, input.value.length))
    input.setSelectionRange(start, end, selection.direction)
    draftSelectionRef.current = null
  }, [draft])
  const syncDraft = useCallback((next = draftRef.current) => {
    const value = typeof next === 'function' ? next(draftRef.current) : String(next ?? '')
    draftRef.current = value
    if (value === hostDraftRef.current) {
      awaitingHostDraftRef.current = null
      return
    }
    awaitingHostDraftRef.current = value
    inputActions?.setDraft?.(value)
  }, [inputActions])
  useEffect(() => {
    const hostDraft = typeof inputState?.draft === 'string' ? inputState.draft : ''
    hostDraftRef.current = hostDraft
    const awaiting = awaitingHostDraftRef.current
    if (awaiting !== null) {
      if (hostDraft === awaiting) awaitingHostDraftRef.current = null
      else return
    }
    // An empty focused draft is the post-submit window: allow the Host to
    // restore a failed submission instead of hiding it behind focus protection.
    if (draftFocusedRef.current && draftRef.current !== '') return
    if (hostDraft !== draftRef.current) {
      draftRef.current = hostDraft
      setDraft(hostDraft)
    }
  }, [inputState?.draft])
  useEffect(() => () => {
    // Preserve a draft when the GAL tab is unmounted during a session switch.
    const value = draftRef.current
    if (value !== hostDraftRef.current) inputActions?.setDraft?.(value)
  }, [inputActions])

  const clearTaskbarTimer = useCallback(() => {
    if (taskbarTimerRef.current !== null) {
      clearTimeout(taskbarTimerRef.current)
      taskbarTimerRef.current = null
    }
  }, [])
  const scheduleTaskbarHide = useCallback(() => {
    clearTaskbarTimer()
    taskbarTimerRef.current = setTimeout(() => setTaskbarOpen(false), 3200)
  }, [clearTaskbarTimer])
  useEffect(() => {
    scheduleTaskbarHide()
    return () => clearTaskbarTimer()
  }, [clearTaskbarTimer, scheduleTaskbarHide])

  const lines = useMemo(() => nodesToLines(nodes), [nodes])
  const liveText = running ? partialToText(partial) : ''
  const lastLine = lines.length > 0 ? lines[lines.length - 1] : null
  const latestUserText = useMemo(() => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (lines[index]?.kind === 'player') return lines[index].text
    }
    return ''
  }, [lines])
  const persistedRouterMode = useMemo(() => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      if (node?.kind !== 'command' || node.name !== 'router') continue
      return /single/i.test(String(node.args ?? '')) ? 'single' : 'collective'
    }
    return null
  }, [nodes])
  useEffect(() => {
    if (persistedRouterMode !== null) setRouterMode(persistedRouterMode)
  }, [persistedRouterMode])
  const actualRoute = useMemo(() => routeFromNodes(nodes), [nodes])
  const manualRoute = useMemo(() => {
    const current = routerSnapshot?.current
    if (current?.provider && current?.model) return { provider: current.provider, model: current.model }
    return null
  }, [routerSnapshot?.current])
  const routeCatalog = useMemo(() => {
    if (Array.isArray(routerSnapshot?.available) && routerSnapshot.available.length > 0) return routerSnapshot.available
    return MODEL_CATALOG.map(model => ({ provider: actualRoute?.provider ?? 'catalog', model: model.id }))
  }, [actualRoute?.provider, routerSnapshot?.available])
  const routerPlan = useMemo(() => {
    const base = buildPlan({ text: latestUserText, available: routeCatalog, mode: routerMode })
    if (routerMode === 'single') {
      const selected = manualRoute ?? actualRoute
      return selected === null
        ? { ...base, mode: 'single', selected: null, reason: '单独会话等待你从模型目录中选择女仆；集体路由不会介入。' }
        : {
            ...base,
            mode: 'single',
            selected: { ...selected, estimatedCost: base.candidates.find(candidate => candidate.model === selected.model)?.estimatedCost ?? base.estimatedCost },
            reason: `单独会话固定使用 ${selected.provider}/${selected.model}；不会自动切换模型。`,
          }
    }
    if (actualRoute === null) return base
    const actualCandidate = base.candidates.find(candidate => candidate.provider === actualRoute.provider && candidate.model === actualRoute.model)
      ?? base.candidates.find(candidate => candidate.model === actualRoute.model)
    return {
      ...base,
      mode: routerMode,
      selected: { ...actualRoute, estimatedCost: actualCandidate?.estimatedCost ?? base.estimatedCost },
      // For a complex turn this is the sum of every work stage and the final
      // synthesis call. Keep that total visible after an intermediate model
      // has produced the latest assistant node.
      estimatedCost: base.estimatedCost,
      actualCallCost: actualCandidate?.estimatedCost ?? 0,
      reason: `${base.reason} 当前回复已由 ${actualRoute.provider}/${actualRoute.model} 实际生成。`,
    }
  }, [actualRoute, latestUserText, manualRoute, routeCatalog, routerMode])
  const runningStep = useMemo(() => {
    let maxStep = 0
    for (const node of nodes) if (node?.kind === 'assistant' && Number.isFinite(node.step)) maxStep = Math.max(maxStep, Number(node.step))
    return Math.max(1, maxStep + 1)
  }, [nodes])
  const liveCollectiveRoute = useMemo(() => {
    if (!running || routerMode !== 'collective' || routerPlan?.complexity?.band !== 'complex') return null
    const task = routerPlan.subtasks?.[runningStep - 1]
    if (!task?.recommended) return null
    return routeCatalog.find(route => route.provider === task.recommendedProvider && route.model === task.recommended)
      ?? routeCatalog.find(route => route.model === task.recommended)
      ?? { provider: task.recommendedProvider || 'planned', model: task.recommended }
  }, [routeCatalog, routerMode, routerPlan, running, runningStep])
  const hasUserTask = latestUserText.trim() !== ''
  const activeRoute = routerMode === 'single'
    ? (manualRoute ?? actualRoute ?? null)
    : (hasUserTask ? (liveCollectiveRoute ?? actualRoute ?? routerPlan.selected ?? null) : null)
  // 汇总阶段也显示实际执行汇总的模型。DeepSeek Harness 只作为路由分析者，
  // 不再覆盖真实 synthesizer 的角色立绘和名牌。
  const characterRoute = activeRoute
  const activeCharacter = characterForModel(characterRoute?.model ?? 'DeepSeek Harness', characterRoute?.provider ?? '')
  const displayScene = useMemo(() => {
    if (characterRoute === null) return scene
    const color = modelAccent(characterRoute.model)
    const name = maidName(characterRoute.model, characterRoute.provider)
    const elements = scene.elements.map(element => {
      if (element.type === 'character' && element.id === scene.settings.assistantSpeaker && element.character) {
        return { ...element, color, character: { ...element.character, name, label: 'MODEL MAID', color } }
      }
      if (element.type === 'speaker-name' && element.role === 'assistant') return { ...element, text: name, color }
      return element
    })
    return { ...scene, elements }
  }, [characterRoute, scene])
  useEffect(() => {
    const storage = browserStorage()
    if (sessionId === undefined || sessionId === null) return
    const title = latestUserText.split(/\r?\n/)[0].trim().slice(0, 72) || '新对话存档'
    const next = upsertArchive(storage, {
      sessionId: String(sessionId),
      title,
      mode: routerMode,
      model: activeRoute?.model ?? '',
      taskType: routerPlan?.taskType ?? '',
      complexity: routerPlan?.complexity?.value ?? 0,
      updatedAt: Date.now(),
      createdAt: readArchives(storage).find(item => item.sessionId === String(sessionId))?.createdAt ?? Date.now(),
    })
    setArchives(next)
  }, [activeRoute?.model, latestUserText, routerMode, routerPlan?.complexity?.value, routerPlan?.taskType, sessionId])
  const archiveRows = useMemo(() => {
    const indexed = new Map(archives.map(item => [item.sessionId, item]))
    for (const id of sessionList?.ids ?? []) {
      const row = sessionList?.byId?.[id]
      if (!row || row.blank) continue
      const existing = indexed.get(String(id))
      indexed.set(String(id), {
        sessionId: String(id),
        title: existing?.title || row.displayTitle || String(id),
        mode: existing?.mode ?? 'collective',
        model: existing?.model ?? '',
        taskType: existing?.taskType ?? '',
        complexity: existing?.complexity ?? 0,
        createdAt: existing?.createdAt ?? row.updatedAt ?? Date.now(),
        updatedAt: Math.max(existing?.updatedAt ?? 0, row.updatedAt ?? 0),
      })
    }
    return [...indexed.values()].sort((left, right) => right.updatedAt - left.updatedAt)
  }, [archives, sessionList])
  const aiStatus = deriveStatus({ running, partial, pending, lastLine, promptError })
  const fallback = blank ? welcomeLine(displayScene) : null
  // 文本框显示用户内容 → 玩家名牌；显示 AI 内容 → 当前实际/推荐模型名牌。
  // 运行期间（AI 正文未到）先显示最后一条玩家消息；滞留片刻后「换页」到状态页。
  const pendingPlayer = running
    && lastLine !== null
    && lastLine.kind === 'player'
    && liveText === ''
    ? lastLine
    : null

  // 流式打字进度快照：定稿转分页时据此无缝衔接第一页（不闪空、不重打）。
  // 只快照「有正文」的流式状态（状态页/玩家滞留不覆盖）；新回合开始时丢弃旧快照；
  // 衔接命中后保留（不消费）——定稿后节点列表会短暂振荡回退，保留快照才能钉住回退窗口。
  const streamedTypeRef = useRef(null)
  const wasRunningRef = useRef(false)
  useEffect(() => {
    const was = wasRunningRef.current
    wasRunningRef.current = running
    if (!running) return
    if (!was) streamedTypeRef.current = null
    if (liveText !== '') streamedTypeRef.current = type
  }, [running, type, liveText])

  // 翻页由模型状态触发：玩家消息完整显示后记录滞留起点；
  // 最短滞留（STATUS_DWELL_MS）届满且模型已有状态（思考/工具/正文块）→ 立即翻页；
  // 状态一直未到 → STATUS_MAX_WAIT_MS 后兜底翻页（显示「编写代码中」）。
  const [statusHold, setStatusHold] = useState(false)
  const [dwellSince, setDwellSince] = useState(null)
  useEffect(() => {
    if (!running || pendingPlayer === null) {
      setStatusHold(false)
      setDwellSince(null)
      return
    }
    if (type.done && dwellSince === null) setDwellSince(Date.now())
  }, [running, pendingPlayer, type.done, dwellSince])
  const modelStateArrived = running && (liveText !== ''
    || (partial !== null && typeof partial === 'object' && Array.isArray(partial.blocks) && partial.blocks.length > 0)
    || (Array.isArray(runningCalls) && runningCalls.length > 0)
    || (Array.isArray(pending) && pending.length > 0))
  useEffect(() => {
    if (!running || !type.done || pendingPlayer === null) {
      setStatusHold(false)
      return
    }
    const base = dwellSince ?? Date.now()
    const delay = modelStateArrived
      ? Math.max(0, STATUS_DWELL_MS - (Date.now() - base))
      : STATUS_MAX_WAIT_MS
    const timer = setTimeout(() => { setStatusHold(true) }, delay)
    return () => { clearTimeout(timer) }
  }, [running, type.done, pendingPlayer, modelStateArrived, dwellSince])

  // 流式 → 定稿的完成窗口：定稿节点与 running=false 状态帧是分开到达的，
  // 期间（节点已到/未到）不得闪状态页或重打——用流式快照钉住已输出的正文。
  const capturedTarget = streamedTypeRef.current !== null && typeof streamedTypeRef.current.target === 'string'
    ? streamedTypeRef.current.target
    : ''
  const capturedLine = capturedTarget !== ''
    ? { key: 'live', kind: 'assistant', text: capturedTarget }
    : null
  // 无进行中的工具/待回应才钉住（多步回合的工具阶段仍正常显示状态页）。
  const capturedQuiet = (Array.isArray(runningCalls) && runningCalls.length === 0)
    && (Array.isArray(pending) && pending.length === 0)
  // 定稿节点已落地且与已显示的流式正文衔接：直接展示定稿行（等状态帧转分页）。
  // 锚定可见前缀（capturedShown），与 measure 的衔接分支一致；定稿文本与流式全文可能有分段差异。
  const capturedShown = streamedTypeRef.current !== null && typeof streamedTypeRef.current.shown === 'string'
    ? streamedTypeRef.current.shown
    : ''
  const capturedLanded = capturedQuiet
    && capturedLine !== null
    && lastLine !== null
    && lastLine.kind === 'assistant'
    && lastLine.text.startsWith(capturedShown !== '' ? capturedShown : capturedTarget)
  // 状态帧先到、定稿节点未落地：继续显示流式正文直到节点到达。
  const capturedPending = capturedQuiet
    && capturedLine !== null
    && !capturedLanded
    && (lastLine === null || lastLine.kind === 'player')
  // 状态页：换页后的独立一页——空文本 + 状态行作为正文，名牌为 AI。
  // 流式生成阶段（liveText 非空）也强制走状态页：正文不实时渲染，
  // 定稿（running=false）后才进入回复渲染（打字机/分页）。
  const showStatusPage = running && (liveText !== '' || statusHold || pendingPlayer === null)
  const currentLine = showStatusPage
    ? { key: 'live', kind: 'assistant', text: '', ...(activeRoute?.provider ? { provider: activeRoute.provider } : {}), ...(activeRoute?.model ? { model: activeRoute.model } : {}) }
    : running
      ? (pendingPlayer ?? (liveText !== ''
        ? { key: 'live', kind: 'assistant', text: liveText, ...(activeRoute?.provider ? { provider: activeRoute.provider } : {}), ...(activeRoute?.model ? { model: activeRoute.model } : {}) }
        : (capturedLanded ? lastLine : (capturedPending ? capturedLine : { key: 'live', kind: 'assistant', text: '', ...(activeRoute?.provider ? { provider: activeRoute.provider } : {}), ...(activeRoute?.model ? { model: activeRoute.model } : {}) }))))
      : (capturedPending ? capturedLine : (lastLine ?? fallback))
  const speaker = currentLine !== null
    ? speakerForCurrentLine(displayScene, currentLine, activeRoute)
    : speakerFor(displayScene, 'assistant')

  // ---- 台词分页（Galgame 点击翻页）----
  // 定稿（非流式）且超出文本框容量的文本按页拆分；流式期间不翻页（钉住开头实时打字）。
  const dtextSceneEl = scene.elements.find(el => el.type === 'dialogue-text' && !el.hidden) ?? null
  const fullText = currentLine !== null ? currentLine.text : ''
  const wholeMarkdown = currentLine?.kind === 'assistant' && needsWholeMarkdown(fullText)
  // 恢复待定门：挂载后、分页测量与阅读状态恢复完成前禁止保存进度，
  // 否则恢复前的初始状态（页码 0/空文本）会覆盖旧进度。
  const restorePendingRef = useRef(true)
  // 分页归属：pages 在测量完成后才与当前全文绑定；此前旧页/空页不作为打字目标（不闪错页）。
  const pagesTextRef = useRef(null)
  useEffect(() => {
    restorePendingRef.current = true
    setPages([])
    setPageIndex(0)
    if (running || wholeMarkdown || currentLine === null || currentLine.text === '' || dtextSceneEl === null) {
      restorePendingRef.current = false
      return
    }
    let cancelled = false
    const measure = () => {
      const measurer = createFitsMeasurer({
        width: dtextSceneEl.w,
        height: dtextSceneEl.h,
        fontSize: dtextSceneEl.fontSize,
        fontFamily: dtextSceneEl.fontFamily,
      })
      const nextPages = splitPages(currentLine.text, prefix => measurer.fits(prefix))
      measurer.dispose()
      if (cancelled) return
      restorePendingRef.current = false
      setPages(nextPages)
      pagesTextRef.current = currentLine.text
      // 流式 → 定稿无缝衔接（优先于重挂载恢复）：第一页沿用流式打字进度（不闪空）；
      // 流式期间已打满第一页则直接完整显示（不重打，点击照常翻下一页）。
      // 必须先于恢复分支：完成窗口内的保存会把 lineKey 写成定稿节点键，
      // 恢复分支会误判成重挂载并按旧进度重置（第一页重打）。
      const streamed = streamedTypeRef.current
      // 锚定「已打出的可见前缀」而非完整流式目标：真实运行时定稿节点文本
      // 与流式全文可能存在分段差异（startsWith(target) 会失配导致第一页重打）。
      // 命中后保留快照（不置空）：定稿后节点列表会短暂回退（settled→running 振荡），
      // 回退窗口靠 capturedPending 钉住正文；节点重新落地时再次衔接（幂等）。
      if (streamed !== null
        && typeof streamed.target === 'string'
        && streamed.target !== ''
        && typeof streamed.shown === 'string'
        && currentLine.text.startsWith(streamed.shown)) {
        const page = nextPages[0] ?? currentLine.text
        if (page.startsWith(streamed.shown)) {
          setType({ target: page, shown: streamed.shown, done: streamed.shown === page })
        } else {
          setType({ target: page, shown: page, done: true })
        }
        return
      }
      // 阅读状态恢复：同一行重挂载时回到原页码与打字进度（不从头渲染）。
      const stored = readStateRef.current
      if (stored.lineKey === currentLine.key && restoredKeyRef.current !== currentLine.key) {
        restoredKeyRef.current = currentLine.key
        const idx = Math.min(stored.pageIndex, nextPages.length - 1)
        setPageIndex(idx)
        const page = nextPages[idx] ?? currentLine.text
        const keep = page.startsWith(stored.shown) ? stored.shown : ''
        setType({ target: page, shown: keep, done: keep === page })
      }
    }
    // 测量放在宏任务：让测量元素先进入文档流，避免同帧布局未结算。
    const timer = setTimeout(measure, 0)
    // 自定义字体就绪后重新测量（@font-face 未加载完成时按回退字体测量会分错页）。
    if (typeof document !== 'undefined' && typeof document.fonts !== 'undefined' && document.fonts.ready !== undefined) {
      void document.fonts.ready.then(() => {
        if (!cancelled) measure()
      })
    }
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [running, wholeMarkdown, fullText, dtextSceneEl])

  // 定稿且分页测量未完成时维持当前文本目标（衔接流式打字，不闪空不闪错页）；流式期间实时从头打字。
  const pagesReady = !running && !wholeMarkdown && pages.length > 0 && pagesTextRef.current === fullText
  const pageText = pagesReady
    ? (pages[Math.min(pageIndex, pages.length - 1)] ?? '')
    : fullText
  const hasNextPage = pagesReady && pageIndex < pages.length - 1
  // 流式期间与分页测量未完成时钉住文本框开头（维持画面，不闪动不追底）。
  const pinScroll = running || (dtextSceneEl !== null && !pagesReady)
  // 省略号为独立渲染标签（紧贴文本，不计入打字目标/历史/分页数据）。
  const typedTarget = pageText

  // ---- 阅读状态保存/恢复 ----
  // 关键变化点（换行/翻页/打字完成/滞留起点/状态页开关）写入会话级 store。
  // 恢复待定期间跳过保存（初始状态会覆盖旧进度）。
  // 运行中滞留玩家行时（含已换到状态页）统一按玩家行键保存，保证重挂载能对上恢复。
  const restoreKey = running && pendingPlayer !== null
    ? pendingPlayer.key
    : (currentLine?.key ?? null)
  useEffect(() => {
    if (restorePendingRef.current) return
    if (restoreKey === null) return
    actions.saveProgress({
      lineKey: restoreKey,
      pageIndex,
      shown: type.shown,
      done: type.done,
      dwellSince,
      statusHold,
    })
  }, [restoreKey, pageIndex, type.done, dwellSince, statusHold, actions])
  // 卸载（切标签页）时保存最新打字进度。
  const saveRef = useRef(null)
  saveRef.current = { key: restoreKey, pageIndex, type, dwellSince, statusHold, actions }
  useEffect(() => () => {
    const s = saveRef.current
    if (s === null || s.key === null) return
    s.actions.saveProgress({
      lineKey: s.key,
      pageIndex: s.pageIndex,
      shown: s.type.shown,
      done: s.type.done,
      dwellSince: s.dwellSince,
      statusHold: s.statusHold,
    })
  }, [])
  // 运行中重挂载：恢复滞留进度（玩家消息打字进度/滞留起点/状态页开关），
  // 切标签页回来不从头走「用户消息 → 短暂滞留 → 模型状态」。
  const runningRestoredRef = useRef(null)
  useEffect(() => {
    if (!running || pendingPlayer === null) return
    const key = pendingPlayer.key
    const stored = readStateRef.current
    if (stored.lineKey !== key || runningRestoredRef.current === key) return
    runningRestoredRef.current = key
    const target = pendingPlayer.text
    const keep = target.startsWith(stored.shown) ? stored.shown : ''
    // 恢复状态页时直接置 done（滞留效应要求 done 才不重置 statusHold）。
    setType({ target, shown: keep, done: keep === target || stored.statusHold === true })
    if (stored.dwellSince !== null && stored.dwellSince !== undefined) setDwellSince(stored.dwellSince)
    if (stored.statusHold === true) setStatusHold(true)
  }, [running, pendingPlayer])

  // 目标文本变化 → 重设打字机（自动播放时直接追平）。
  useEffect(() => {
    setType(t => {
      const next = setTarget(t, typedTarget)
      return auto || wholeMarkdown ? skip(next) : next
    })
  }, [typedTarget, auto, wholeMarkdown])

  // 自动播放：当前页显示完毕后，短暂停留自动翻下一页（下一页同样逐字打出/自动追平）。
  useEffect(() => {
    if (!auto || !type.done || running || !hasNextPage) return
    const timer = setTimeout(() => { setPageIndex(pageIndex + 1) }, 1500)
    return () => { clearTimeout(timer) }
  }, [auto, type.done, running, hasNextPage, pageIndex])

  // （pendingPlayer 判定基于 liveText 是否到达，无需完成记录状态。）

  // rAF 驱动打字机（done 后停止；advance 无变化返回同引用，React 自动跳过渲染）。
  const speed = SPEEDS[scene.settings.typeSpeed] ?? SPEEDS.normal
  useEffect(() => {
    if (type.done) return
    let raf = 0
    let last = performance.now()
    const loop = now => {
      const dt = now - last
      last = now
      setType(t => advance(t, dt, speed))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf) }
  }, [type.done, speed])

  const skipTyping = useCallback(() => { setType(t => skip(t)) }, [])

  // 点击文本框：打字中 → 追平当前页；已打完且有下一页 → 翻页（下一页同样逐字打出）。
  const onTextClick = useCallback(() => {
    if (running) {
      skipTyping()
      return
    }
    setType(t => (t.done ? t : skip(t)))
    if (type.done && hasNextPage) {
      setPageIndex(pageIndex + 1)
    }
  }, [running, type.done, hasNextPage, pageIndex, skipTyping])
  const hasImages = Array.isArray(inputState?.imageIds) && inputState.imageIds.length > 0
  const handleRouterModeCommand = useCallback((nextMode, sourceDraft = '', clearDraft = false) => {
    const normalized = nextMode === 'single' ? 'single' : 'collective'
    const command = '/router mode ' + normalized
    setRouterMode(normalized)
    if (hasImages && typeof routerActions?.command === 'function') {
      if (clearDraft) {
        updateDraft('')
        syncDraft('')
      }
      void routerActions.command(command).then(result => {
        if (result?.ok && result.value?.matched !== false) return
        if (clearDraft) {
          updateDraft(sourceDraft)
          syncDraft(sourceDraft)
        }
      }).catch(() => {
        if (clearDraft) {
          updateDraft(sourceDraft)
          syncDraft(sourceDraft)
        }
      })
      return
    }
    updateDraft(command)
    syncDraft(command)
    inputActions.submit()
  }, [hasImages, inputActions, routerActions, syncDraft, updateDraft])
  const send = useSend(inputActions, draft, updateDraft, hasImages, syncDraft, handleRouterModeCommand)
  const handleRouterMode = useCallback(nextMode => {
    handleRouterModeCommand(nextMode, '', false)
  }, [handleRouterModeCommand])

  // 透明功能按钮：历史/自动/快进/设置（原底部控制栏已移除，功能由场景内按钮承载）。
  const handleAction = useCallback(action => {
    switch (action) {
      case 'history': setHistoryOpen(o => !o); break
      case 'auto': setAuto(a => !a); break
      case 'skip': skipTyping(); break
      case 'settings': setSettingsOpen(o => !o); break
      default: break
    }
  }, [skipTyping])

  const line = currentLine !== null ? { ...currentLine, speaker } : null

  return (
    <div className="gv-root" data-gal-view="" data-gal-mode={mode} data-taskbar={mode === 'game' ? (taskbarOpen ? 'open' : 'collapsed') : 'editor'} ref={rootRef}>
      <div className="gv-topbar">
        <div className="gv-brand">
          <span className="gv-brand-mark" aria-hidden="true" />
          <span>GAL 视窗</span>
        </div>
        <div className="gv-mode-switch" role="tablist" aria-label="模式切换">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'game'}
            className={'gv-mode-btn' + (mode === 'game' ? ' is-on' : '')}
            onClick={() => setMode('game')}
          >
            游戏模式
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'editor'}
            className={'gv-mode-btn' + (mode === 'editor' ? ' is-on' : '')}
            onClick={() => setMode('editor')}
          >
            编辑模式
          </button>
        </div>
        <div className="gv-topbar-right">
          {mode === 'editor'
            ? <span className="gv-topbar-hint">编辑结果实时同步到游戏模式</span>
            : (
                <>
                  <button type="button" className="gv-btn" onClick={() => setArchiveOpen(o => !o)}>存档</button>
                  <button type="button" className="gv-btn" onClick={() => setHistoryOpen(o => !o)}>日志</button>
                  <button type="button" className="gv-btn" onClick={() => setSettingsOpen(o => !o)}>设置</button>
                </>
              )}
        </div>
      </div>

      {mode === 'game' && (
        <div
          className={'gv-control-bar' + (taskbarOpen ? ' is-open' : ' is-collapsed')}
          onMouseEnter={() => { clearTaskbarTimer(); setTaskbarOpen(true) }}
          onMouseLeave={scheduleTaskbarHide}
          onFocusCapture={() => { clearTaskbarTimer(); setTaskbarOpen(true) }}
          onBlurCapture={scheduleTaskbarHide}
        >
          <button
            type="button"
            className="gv-taskbar-handle"
            aria-expanded={taskbarOpen}
            aria-controls="gv-routing-taskbar"
            onClick={() => {
              clearTaskbarTimer()
              setTaskbarOpen(open => {
                const next = !open
                if (next) taskbarTimerRef.current = setTimeout(() => setTaskbarOpen(false), 3200)
                return next
              })
            }}
          >
            路由任务栏 <span aria-hidden="true">{taskbarOpen ? '⌃' : '⌄'}</span>
          </button>
          <div id="gv-routing-taskbar" className="gv-control-content">
            <RouterPanel plan={routerPlan} route={activeRoute} displayRoute={characterRoute} onMode={handleRouterMode} routerMode={routerMode} routerSnapshot={routerSnapshot} routerActions={routerActions} />
            {routerMode === 'collective' && <>
              <AnalysisSummary plan={routerPlan} />
              <CollaborationBoard plan={routerPlan} activeRoute={activeRoute} nodes={nodes} running={running} />
            </>}
          </div>
        </div>
      )}

      {mode === 'game' && (
        <>
          <div className="gv-stage-area">
            <StageView
              scene={displayScene}
              assetsMap={assets.map}
              mode="game"
              line={line}
              type={type}
              running={running}
              pinned={pinScroll}
              selectedId={null}
              onSelect={() => {}}
              api={undefined}
              onSkip={skipTyping}
              onTextClick={onTextClick}
              hasNextPage={hasNextPage}
              // 错误行正文已含「[错误] …」：不再叠加「（出错…）」状态行；其余非运行状态照常显示。
              aiStatus={running ? (showStatusPage ? aiStatus : null) : (currentLine !== null && currentLine.error === true ? null : aiStatus)}
              onAction={handleAction}
              autoOn={auto}
              characterOverride={activeCharacter}
            />
          </div>
          <form
            className="gv-input"
            onSubmit={e => {
              e.preventDefault()
              send()
            }}
          >
            <AttachmentPicker inputActions={inputActions} inputState={inputState} attachmentApi={attachmentApi} draft={draft} setDraft={updateDraft} />
            <textarea
              ref={inputBoxRef}
              className="gv-input-box"
              value={draft}
              onFocus={() => { draftFocusedRef.current = true }}
              onBlur={() => {
                draftFocusedRef.current = false
                draftSelectionRef.current = null
                syncDraft()
              }}
              onChange={e => {
                draftSelectionRef.current = {
                  start: e.currentTarget.selectionStart ?? e.currentTarget.value.length,
                  end: e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                  direction: e.currentTarget.selectionDirection ?? 'none',
                }
                updateDraft(e.currentTarget.value)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="输入你想说的话……"
              rows={2}
              aria-label="玩家输入"
            />
            <button type="submit" className="gv-btn gv-btn-accent gv-send" disabled={draft.trim() === '' && !hasImages}>
              发送
            </button>
          </form>
        </>
      )}

      {mode === 'editor' && (
        <Editor
          scene={scene}
          api={api}
          history={history}
          assetsMap={assets.map}
          fontsMap={fonts.map}
          onExitEditor={() => setMode('game')}
        />
      )}

      {historyOpen && <HistoryPanel scene={displayScene} lines={lines} onClose={() => setHistoryOpen(false)} />}
      {archiveOpen && <ArchiveRail archives={archiveRows} currentId={String(sessionId ?? '')} onOpen={id => { try { openSession?.(id) } catch { /* stale local archive */ }; setArchiveOpen(false) }} onClose={() => setArchiveOpen(false)} />}
      {settingsOpen && <SettingsPanel scene={scene} api={api} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
