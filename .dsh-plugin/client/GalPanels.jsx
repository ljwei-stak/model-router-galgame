import React, { useMemo } from 'react'
import { SafeMarkdownText } from './SafeMarkdownText.jsx'
import { characterForModel } from './characters.mjs'
import { shouldRenderMarkdown } from './transcript.mjs'

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '刚刚'
  try { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value) } catch { return '刚刚' }
}

export function MaidAvatar({ model, provider, size = 'small', active = false }) {
  const character = characterForModel(model, provider)
  return (
    <div className={`gv-maid-avatar gv-maid-avatar-${size}${active ? ' is-active' : ''}`} title={model || character.label}>
      <img src={character.dataUrl} alt={character.label} draggable={false} />
    </div>
  )
}

export function ModelPicker({ mode, snapshot, actions, onMode, selectedRoute }) {
  const groups = Array.isArray(snapshot?.groups) ? snapshot.groups : []
  const options = useMemo(() => {
    const rows = []
    for (const group of groups) for (const model of group.models ?? []) rows.push({ provider: group.id, model: model.id, label: model.name || model.id })
    if (rows.length > 0) return rows
    return (snapshot?.available ?? []).map(route => ({ provider: route.provider, model: route.model, label: route.model }))
  }, [groups, snapshot?.available])
  const current = snapshot?.current ?? selectedRoute ?? null
  const value = current ? `${current.provider}\u0000${current.model}` : ''
  return (
    <div className="gv-model-picker">
      <div className="gv-picker-label">会话方式</div>
      <div className="gv-picker-tabs" role="tablist" aria-label="AI 会话方式">
        <button type="button" className={mode === 'collective' ? 'is-on' : ''} onClick={() => onMode('collective')}>集体合作</button>
        <button type="button" className={mode === 'single' ? 'is-on' : ''} onClick={() => onMode('single')}>单独会话</button>
      </div>
      {mode === 'single' ? (
        <label className="gv-picker-select">
          <span>当前女仆</span>
          <select
            value={value}
            onChange={event => {
              const [provider, model] = String(event.target.value).split('\u0000')
              if (provider && model) void actions?.select?.({ provider, model })
            }}
            onFocus={() => actions?.load?.()}
            aria-label="选择单独会话模型"
          >
            <option value="">{snapshot?.status === 'loading' ? '正在读取模型…' : '选择模型'}</option>
            {options.map(option => <option key={`${option.provider}\u0000${option.model}`} value={`${option.provider}\u0000${option.model}`}>{option.label}</option>)}
          </select>
        </label>
      ) : (
        <div className="gv-picker-note">由 Harness 根据复杂度、专长、LiveBench 质量、成本、延迟和风险自动分配</div>
      )}
      {snapshot?.error && <div className="gv-picker-error">模型目录：{snapshot.error}</div>}
    </div>
  )
}

export function ArchiveRail({ archives, currentId, onOpen, onClose }) {
  return (
    <aside className="gv-archive-rail" aria-label="GAL 存档">
      <div className="gv-archive-head"><span>存档</span><button type="button" className="gv-icon-btn" onClick={onClose} aria-label="关闭存档">×</button></div>
      <div className="gv-archive-hint">每个 Harness 新对话自动成为一个存档；继续提问会留在同一条记录。</div>
      <div className="gv-archive-list">
        {archives.length === 0 && <div className="gv-archive-empty">尚无历史存档</div>}
        {archives.map(archive => (
          <button type="button" key={archive.sessionId} className={'gv-archive-item' + (archive.sessionId === currentId ? ' is-current' : '')} onClick={() => onOpen?.(archive.sessionId)}>
            <span className="gv-archive-item-title">{archive.title}</span>
            <span className="gv-archive-item-meta">{archive.mode === 'single' ? '单独' : '集体'} · {archive.model || '待分配'} · {formatTime(archive.updatedAt)}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export function CollaborationBoard({ plan, activeRoute, nodes, running }) {
  const assignments = useMemo(() => {
    const tasks = Array.isArray(plan?.subtasks) ? plan.subtasks : []
    return tasks.map((task, index) => {
      const completed = nodes.some(node => node?.kind === 'assistant' && Number(node.step) === index + 1)
      const active = running
        && activeRoute?.model === task.recommended
        && (task.recommendedProvider === '' || activeRoute?.provider === task.recommendedProvider || activeRoute?.provider === 'planned')
      return { ...task, completed, active }
    })
  }, [activeRoute?.model, nodes, plan, running])
  if (!plan) return null
  const completedCount = assignments.filter(task => task.completed).length
  const activeTask = assignments.find(task => task.active)
  const progress = activeTask !== undefined
    ? `工作中：${activeTask.name}`
    : `${completedCount}/${assignments.length} 已完成`
  return (
    <details className="gv-collab-board" aria-label="协作任务分配">
      <summary className="gv-board-summary">
        <span className="gv-board-title">协作流程</span>
        <span className="gv-board-progress">{progress}</span>
        <span className="gv-board-synth">汇报：{plan.synthesizer?.model || 'DeepSeek V4 Pro（自动回退）'}</span>
      </summary>
      <div className="gv-collab-body">
        <div className="gv-task-list">
          {assignments.map((task, index) => {
            const character = characterForModel(task.recommended, task.recommendedProvider)
            return (
              <div className={'gv-task-row' + (task.active ? ' is-active' : '') + (task.completed ? ' is-complete' : '')} key={`${task.name}-${index}`}>
                <MaidAvatar model={task.recommended} active={task.active} />
                <div className="gv-task-main">
                  <div className="gv-task-title"><span>{index + 1}. {task.name}</span><b>{task.completed ? '已完成' : task.active ? '工作中' : '排队'}</b></div>
                  <div className="gv-task-meta">{character.label} · {task.recommendedProvider || '自动路由'}/{task.recommended} · {task.type}</div>
                </div>
              </div>
            )
          })}
        </div>
        {activeRoute && <div className="gv-board-foot">当前请求：{activeRoute.provider}/{activeRoute.model}</div>}
      </div>
    </details>
  )
}

export function AnalysisSummary({ plan }) {
  if (!plan) return null
  const weights = plan.objectiveWeights ?? {}
  return (
    <details className="gv-analysis-summary">
      <summary><span className="gv-analysis-summary-title"><MaidAvatar model="DeepSeek Harness" size="tiny" />查看路由分析摘要</span></summary>
      <div className="gv-analysis-body">
        <p>{plan.reason}</p>
        <div className="gv-analysis-metrics">
          <span>复杂度 <b>{Math.round((plan.complexity?.value ?? 0) * 100)}%</b></span>
          <span>类型 <b>{plan.taskType}</b></span>
          {Array.isArray(plan.taskTypes) && plan.taskTypes.length > 1 && <span>业务方向 <b>{plan.taskTypes.join('、')}</b></span>}
          <span>质量 <b>{Math.round((weights.quality ?? 0) * 100)}%</b></span>
          <span>成本 <b>{Math.round((weights.cost ?? 0) * 100)}%</b></span>
          <span>延迟 <b>{Math.round((weights.latency ?? 0) * 100)}%</b></span>
          <span>专长 <b>{Math.round((weights.specialty ?? 0) * 100)}%</b></span>
          <span>风险 <b>{Math.round((weights.risk ?? 0) * 100)}%</b></span>
          <span>质量下限 <b>{Math.round((plan.optimization?.qualityFloor ?? 0) * 100)}%</b></span>
        </div>
        <div className="gv-analysis-cost">预计总费用 <b>${Number(plan.estimatedCost ?? 0).toFixed(6)}</b></div>
        <div className="gv-analysis-cost">全高质量基线 <b>${Number(plan.optimization?.baselineAllStrongCost ?? 0).toFixed(6)}</b> · 预计节省 <b>{Math.round(Number(plan.optimization?.estimatedSavings ?? 0) * 100)}%</b></div>
        <div className="gv-analysis-breakdown"><span>缓存读/写比例：{Math.round(Number(plan.optimization?.cacheReadRatio ?? 0) * 100)}% / {Math.round(Number(plan.optimization?.cacheWriteRatio ?? 0) * 100)}%</span><span>未填写比例时按普通输入计费</span></div>
        <div className="gv-analysis-breakdown"><span>实际使用 {Number(plan.optimization?.distinctRoutes ?? 0)} 个模型</span><span>{plan.optimization?.budgetExceeded ? '预算超限：已在质量下限内尽量压缩' : '预算约束满足'}</span><span>{plan.optimization?.constraintRelaxed ? '部分质量下限未满足，已记录回退' : '质量约束满足'}</span></div>
        <div className="gv-analysis-breakdown"><span>LiveBench：{plan.optimization?.liveBench?.fetchedAt ? `快照 ${formatTime(Number(plan.optimization.liveBench.fetchedAt))}${plan.optimization.liveBench.stale ? '（沿用上次快照）' : ''}` : '未完成联网核验，使用实验基线'}</span><span>数据源：{plan.optimization?.liveBench?.source ?? 'experimental-baseline'}</span></div>
        {Array.isArray(plan.costBreakdown) && plan.costBreakdown.length > 0 && (
          <div className="gv-analysis-breakdown">
            {plan.costBreakdown.map(row => <span key={`${row.stage}-${row.provider}-${row.model}`}>阶段 {row.stage} · {row.model} · 输入 {row.inputTokens}（缓存读 {row.cacheReadTokens ?? 0} / 写 {row.cacheWriteTokens ?? 0}）/ 输出 {row.outputTokens} tokens · 质量 {Math.round(Number(row.quality ?? 0) * 100)}% · ${Number(row.estimatedCost ?? 0).toFixed(6)}</span>)}
          </div>
        )}
        <div className="gv-analysis-candidates">{(plan.candidates ?? []).slice(0, 5).map(candidate => <span key={`${candidate.provider}/${candidate.model}`}>{candidate.model} · 综合 {Math.round(candidate.score * 100)}% · 质量 {Math.round(Number(candidate.quality ?? 0) * 100)}% · 专长 {Math.round(Number(candidate.specialty ?? 0) * 100)}% · ${Number(candidate.inputPrice ?? 0).toFixed(2)}/${Number(candidate.outputPrice ?? 0).toFixed(2)}</span>)}</div>
      </div>
    </details>
  )
}

export function MarkdownTranscript({ lines }) {
  return <div className="gv-markdown-transcript">{lines.map(line => {
    const maid = line.kind === 'assistant' && line.model ? characterForModel(line.model, line.provider) : null
    const label = line.kind === 'player'
      ? '主人'
      : maid
        ? `${maid.label}娘`
        : line.kind === 'system' ? '系统' : '当前女仆'
    return <article className={`gv-log-line gv-log-${line.kind}`} key={line.key}>
      <header title={line.model ? `${line.provider ?? ''}/${line.model}` : undefined}>{label}</header>
      {shouldRenderMarkdown(line)
        ? <SafeMarkdownText text={line.text} />
        : <span className="gv-plain-text">{line.text}</span>}
    </article>
  })}</div>
}
