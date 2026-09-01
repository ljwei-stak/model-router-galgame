/** GAL 视窗设置与桌面发行版更新入口。 */

import React from 'react'
import { selectUnifiedUpdate } from './update-selection.mjs'
import { DEFAULT_ROUTER_SETTINGS, MODEL_CATALOG } from '../shared/router.mjs'

function messageFromError(error) {
  return error instanceof Error ? error.message : String(error)
}

function versionText(item, fallback) {
  if (item === undefined) return fallback
  return `${item.currentVersion} / 最新 ${item.latestVersion}`
}

function availabilityText(item) {
  if (item === undefined) return '点击“检查更新”获取 GitHub Release 状态。'
  if (item.available && item.installable) return `发现 ${item.latestVersion}，可以更新。`
  if (item.available) return item.reason || '发现新版本，但当前环境不能直接安装。'
  return item.reason || '已是最新版。'
}

function numericPrice(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function priceDraft(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const next = {}
  for (const [id, raw] of Object.entries(value)) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue
    next[id] = {
      input: numericPrice(raw.input),
      output: numericPrice(raw.output),
      cacheRead: numericPrice(raw.cacheRead),
      cacheWrite: numericPrice(raw.cacheWrite),
      currency: String(raw.currency || 'USD').toUpperCase(),
    }
  }
  return next
}

function saveablePrices(value) {
  return Object.fromEntries(Object.entries(priceDraft(value)).map(([id, row]) => [id, {
    input: numericPrice(row.input),
    output: numericPrice(row.output),
    cacheRead: numericPrice(row.cacheRead),
    cacheWrite: numericPrice(row.cacheWrite),
    currency: String(row.currency || 'USD').toUpperCase(),
  }]))
}

function baselinePrice(model, field) {
  const key = field === 'input' ? 'costIn' : field === 'output' ? 'costOut' : field
  return numericPrice(model?.[key])
}

export function GalViewSettingsTab({ useEnabled, setEnabled, updateApi, pricingApi }) {
  const enabled = useEnabled(value => value)
  const [assessment, setAssessment] = React.useState(null)
  const [busy, setBusy] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [progress, setProgress] = React.useState(null)
  const [pricing, setPricing] = React.useState({ ...DEFAULT_ROUTER_SETTINGS, pricing: {} })
  const [pricingRevision, setPricingRevision] = React.useState(0)
  const [pricingWritable, setPricingWritable] = React.useState(false)
  const [pricingBusy, setPricingBusy] = React.useState(false)
  const [pricingNotice, setPricingNotice] = React.useState('')
  const [customModels, setCustomModels] = React.useState([])

  React.useEffect(() => {
    let active = true
    if (typeof pricingApi?.load !== 'function') return undefined
    void pricingApi.load().then(result => {
      if (!active) return
      const value = result?.value ?? DEFAULT_ROUTER_SETTINGS
      const configuredEndpoint = String(value.liveBenchEndpoint || DEFAULT_ROUTER_SETTINGS.liveBenchEndpoint)
      const loaded = {
        ...DEFAULT_ROUTER_SETTINGS,
        ...value,
        liveBenchEndpoint: configuredEndpoint === 'https://livebench.ai/api/leaderboard' ? DEFAULT_ROUTER_SETTINGS.liveBenchEndpoint : configuredEndpoint,
        pricing: priceDraft(value.pricing),
      }
      setPricing(loaded)
      setPricingRevision(Number(result?.revision) || 0)
      setPricingWritable(result?.writable === true && result?.available !== false)
      setCustomModels(Object.keys(loaded.pricing).filter(id => !MODEL_CATALOG.some(model => model.id === id)))
    }).catch(error => { if (active) setPricingNotice(`读取费用设置失败：${messageFromError(error)}`) })
    return () => { active = false }
  }, [pricingApi])

  const updatePricing = (id, field, value) => {
    setPricing(current => ({
      ...current,
      pricing: {
        ...current.pricing,
        [id]: {
          ...(current.pricing[id] ?? (() => {
            const model = MODEL_CATALOG.find(candidate => candidate.id === id)
            return { input: baselinePrice(model, 'input'), output: baselinePrice(model, 'output'), cacheRead: 0, cacheWrite: 0, currency: 'USD' }
          })()),
          [field]: field === 'currency' ? String(value).toUpperCase() : value === '' ? 0 : numericPrice(value),
        },
      },
    }))
  }

  const addCustomModel = () => {
    const id = window.prompt?.('填写模型标识（例如 provider/model-name）')?.trim()
    if (!id || MODEL_CATALOG.some(model => model.id === id) || customModels.includes(id)) return
    setCustomModels(current => [...current, id])
    setPricing(current => ({ ...current, pricing: { ...current.pricing, [id]: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, currency: 'USD' } } }))
  }

  const removeCustomModel = id => {
    setCustomModels(current => current.filter(value => value !== id))
    setPricing(current => {
      const next = { ...current.pricing }
      delete next[id]
      return { ...current, pricing: next }
    })
  }

  const savePricing = async () => {
    if (typeof pricingApi?.save !== 'function' || !pricingWritable) {
      setPricingNotice('当前环境的设置服务不可写。')
      return
    }
    setPricingBusy(true)
    setPricingNotice('正在保存模型费用与路由预算...')
    try {
      const next = {
        liveBenchEndpoint: String(pricing.liveBenchEndpoint || DEFAULT_ROUTER_SETTINGS.liveBenchEndpoint),
        liveBenchTtlMs: Math.max(30000, numericPrice(pricing.liveBenchTtlMs, DEFAULT_ROUTER_SETTINGS.liveBenchTtlMs)),
        budgetUsd: numericPrice(pricing.budgetUsd),
        cacheReadRatio: Math.max(0, Math.min(1, numericPrice(pricing.cacheReadRatio))),
        cacheWriteRatio: Math.max(0, Math.min(1, numericPrice(pricing.cacheWriteRatio))),
        pricing: saveablePrices(pricing.pricing),
      }
      const result = await pricingApi.save(next, pricingRevision)
      setPricing(current => ({ ...current, ...next, pricing: priceDraft(result?.value?.pricing ?? next.pricing) }))
      setPricingRevision(Number(result?.revision) || pricingRevision)
      setPricingNotice('已保存。下一条集体合作任务会使用新的价格与预算。')
    } catch (error) {
      setPricingNotice(`保存失败：${messageFromError(error)}`)
    } finally {
      setPricingBusy(false)
    }
  }

  const priceRows = [...MODEL_CATALOG, ...customModels.map(id => ({ id, aliases: [id], costIn: 0, costOut: 0 }))]

  React.useEffect(() => {
    if (typeof updateApi?.subscribe !== 'function') return undefined
    const unsubscribe = updateApi.subscribe(next => {
      setProgress(next)
      if (next?.message) setNotice(next.message)
    })
    return typeof unsubscribe === 'function' ? unsubscribe : undefined
  }, [updateApi])

  const checkUpdates = async () => {
    if (typeof updateApi?.check !== 'function') {
      setNotice('网页端不能写入本机程序，已为你打开项目 Release。')
      await updateApi?.openReleases?.()
      return null
    }
    setBusy('check')
    setNotice('正在检查 GitHub Release...')
    try {
      const next = await updateApi.check()
      setAssessment(next)
      const available = [next.plugin.available ? '插件' : '', next.desktop.available ? '完整客户端' : ''].filter(Boolean)
      setNotice(available.length > 0 ? `发现可更新内容：${available.join('、')}。` : '插件与完整客户端均已是最新版。')
      return next
    } catch (error) {
      setNotice(`检查更新失败：${messageFromError(error)}`)
      return null
    } finally {
      setBusy('')
    }
  }

  const install = async kind => {
    const method = kind === 'plugin' ? updateApi?.installPlugin : updateApi?.installDesktop
    if (typeof method !== 'function') {
      setNotice('网页端不能直接更新本机文件，已为你打开项目 Release。')
      await updateApi?.openReleases?.()
      return
    }
    setBusy(kind)
    setProgress({ kind, phase: 'start', percent: 0 })
    setNotice(kind === 'plugin' ? '正在准备插件更新...' : '正在准备完整客户端更新...')
    try {
      const result = await method()
      if (result?.cancelled) {
        setNotice('已取消更新。')
        return
      }
      setNotice(result?.message || '更新已准备完成。')
      if (kind === 'plugin' && !result?.restartScheduled) await checkUpdates()
    } catch (error) {
      setNotice(`${kind === 'plugin' ? '插件' : '客户端'}更新失败：${messageFromError(error)}`)
    } finally {
      setBusy('')
    }
  }

  const installAll = async () => {
    if (typeof updateApi?.check !== 'function') {
      setNotice('网页端不能更新本机插件或客户端，已为你打开项目 Release。')
      await updateApi?.openReleases?.()
      return
    }
    setBusy('all')
    setProgress(null)
    setNotice('正在检查插件与完整客户端...')
    try {
      const next = await updateApi.check()
      setAssessment(next)
      const selection = selectUnifiedUpdate(next)
      if (selection.kind === null) {
        setNotice(selection.reason)
        return
      }

      const method = selection.kind === 'desktop' ? updateApi?.installDesktop : updateApi?.installPlugin
      if (typeof method !== 'function') {
        setNotice('当前环境不能执行所需更新，已为你打开项目 Release。')
        await updateApi?.openReleases?.()
        return
      }
      setProgress({ kind: selection.kind, phase: 'start', percent: 0 })
      setNotice(selection.reason)
      const result = await method()
      if (result?.cancelled) {
        setNotice('已取消更新。')
        return
      }
      setNotice(result?.message || '更新已准备完成。')
      if (selection.kind === 'plugin' && !result?.restartScheduled) {
        setAssessment(await updateApi.check())
      }
    } catch (error) {
      setNotice(`一键更新失败：${messageFromError(error)}`)
    } finally {
      setBusy('')
    }
  }

  const progressValue = busy !== ''
    && (busy === 'all' || progress?.kind === busy)
    && Number.isFinite(Number(progress?.percent))
    ? Math.max(0, Math.min(100, Number(progress.percent)))
    : null

  return (
    <div className="gvsv-tab">
      <div className="gvsv-head">
        <span className="gvsv-title">GAL 视窗</span>
        <span className="gvsv-desc">会话标签页中的 Galgame 风格对话视图（对话 / GAL视窗 / 轨迹）。</span>
      </div>
      <label className="gvsv-row">
        <span className="gvsv-label">启用 GAL 视窗</span>
        <span className="gvsv-hint">关闭后隐藏会话页的「GAL视窗」标签；场景与设置保留，重新开启即恢复。</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          aria-label="启用 GAL 视窗"
        />
      </label>

      <details className="gvsv-pricing" aria-label="模型费用与路由预算">
        <summary><strong>模型费用与路由预算</strong><span>用户价格优先；未填写模型沿用实验基线</span></summary>
        <div className="gvsv-pricing-body">
          <p className="gvsv-hint">价格单位为 USD / 1M tokens。这里只影响集体合作的任务分配和费用估计，不会改变单独会话的模型选择，也不会保存 API Key。</p>
          <div className="gvsv-pricing-global">
            <label>LiveBench 数据地址<input value={pricing.liveBenchEndpoint ?? ''} onChange={event => setPricing(current => ({ ...current, liveBenchEndpoint: event.target.value }))} placeholder="https://livebench.ai（自动发现最新榜单）" /></label>
            <label>刷新周期（毫秒）<input type="number" min="30000" step="1000" value={pricing.liveBenchTtlMs ?? DEFAULT_ROUTER_SETTINGS.liveBenchTtlMs} onChange={event => setPricing(current => ({ ...current, liveBenchTtlMs: event.target.value }))} /></label>
            <label>单任务预算（USD）<input type="number" min="0" step="0.000001" value={pricing.budgetUsd ?? 0} onChange={event => setPricing(current => ({ ...current, budgetUsd: event.target.value }))} /></label>
            <label>缓存读取占输入比例<input type="number" min="0" max="1" step="0.05" value={pricing.cacheReadRatio ?? 0} onChange={event => setPricing(current => ({ ...current, cacheReadRatio: event.target.value }))} /></label>
            <label>缓存写入占输入比例<input type="number" min="0" max="1" step="0.05" value={pricing.cacheWriteRatio ?? 0} onChange={event => setPricing(current => ({ ...current, cacheWriteRatio: event.target.value }))} /></label>
          </div>
          <div className="gvsv-price-table" role="table" aria-label="模型价格表">
            <div className="gvsv-price-head" role="row"><span>模型</span><span>输入</span><span>输出</span><span>缓存读</span><span>缓存写</span><span>币种</span><span /></div>
            {priceRows.map(model => {
              const override = pricing.pricing?.[model.id]
              return <div className="gvsv-price-row" role="row" key={model.id}>
                <span title={model.id}>{model.id}</span>
                {['input', 'output', 'cacheRead', 'cacheWrite'].map(field => <label key={field}><span className="gvsv-visually-hidden">{field}</span><input type="number" min="0" step="0.001" value={override?.[field] ?? baselinePrice(model, field)} onChange={event => updatePricing(model.id, field, event.target.value)} /></label>)}
                <input aria-label={`${model.id} currency`} value={override?.currency ?? 'USD'} onChange={event => updatePricing(model.id, 'currency', event.target.value)} />
                {customModels.includes(model.id) ? <button type="button" onClick={() => removeCustomModel(model.id)} aria-label={`删除 ${model.id}`}>删除</button> : <span />}
              </div>
            })}
          </div>
          <div className="gvsv-pricing-actions"><button type="button" onClick={addCustomModel}>新增模型价格</button><button type="button" disabled={pricingBusy || !pricingWritable} onClick={savePricing}>{pricingBusy ? '保存中...' : '保存费用与预算'}</button></div>
          {pricingNotice !== '' && <p className="gvsv-notice" role="status">{pricingNotice}</p>}
          {!pricingWritable && <p className="gvsv-footnote">当前 Host 没有提供可写设置服务，网页端可查看但不能保存价格。</p>}
        </div>
      </details>

      <section className="gvsv-update" aria-labelledby="gvsv-update-title">
        <div className="gvsv-update-head">
          <div>
            <h3 id="gvsv-update-title">项目更新</h3>
            <p>更新固定来自 ljwei-stak/model-router-galgame 的稳定 Release，不会使用上游仓库或第三方下载地址。</p>
          </div>
          <button type="button" className="gvsv-link" onClick={() => updateApi?.openProject?.()}>项目主页</button>
        </div>

        <div className="gvsv-version-list">
          <div className="gvsv-version-row">
            <div>
              <strong>Model Router + GALGame 插件</strong>
              <span>{versionText(assessment?.plugin, updateApi?.pluginVersion ?? '未知')}</span>
              <small>{availabilityText(assessment?.plugin)}</small>
            </div>
            <button type="button" disabled={busy !== ''} onClick={() => install('plugin')}>仅更新插件</button>
          </div>
          <div className="gvsv-version-row">
            <div>
              <strong>DeepSeek Harness 完整客户端</strong>
              <span>{versionText(assessment?.desktop, '检查后显示')}</span>
              <small>{availabilityText(assessment?.desktop)}</small>
            </div>
            <button type="button" disabled={busy !== ''} onClick={() => install('desktop')}>仅更新完整客户端</button>
          </div>
        </div>

        {progressValue !== null && (
          <div className="gvsv-progress" role="progressbar" aria-label="更新进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressValue}>
            <span style={{ width: `${progressValue}%` }} />
          </div>
        )}
        {notice !== '' && <p className="gvsv-notice" role="status">{notice}</p>}
        <div className="gvsv-actions">
          <button type="button" className="gvsv-update-all" disabled={busy !== ''} onClick={installAll}>
            {busy === 'all' ? '正在一键更新...' : '一键更新插件与客户端'}
          </button>
          <button type="button" disabled={busy !== ''} onClick={checkUpdates}>{busy === 'check' ? '检查中...' : '检查更新'}</button>
          <button type="button" className="gvsv-secondary" onClick={() => updateApi?.openReleases?.()}>查看 Releases</button>
        </div>
        <p className="gvsv-footnote">
          {updateApi?.isDesktop
            ? '一键更新会优先安装包含同版本插件的完整客户端；客户端已是最新版时才单独更新插件。API、模型配置和历史任务会保留。'
            : '当前是网页环境，只能查看 Release；安装桌面客户端后可直接更新本机插件和完整客户端。'}
        </p>
      </section>
    </div>
  )
}
