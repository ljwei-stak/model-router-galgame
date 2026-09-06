/** Plans independent npm plugin and desktop distribution updates. */
export function selectUnifiedUpdate(assessment) {
  const steps = ['plugin', 'desktop'].filter(kind => assessment?.[kind]?.available && assessment[kind].installable)
  const blocked = ['plugin', 'desktop'].map(kind => assessment?.[kind])
    .filter(item => item?.available && !item.installable)
    .map(item => item.reason)
    .filter(Boolean)
  if (steps.length > 0) {
    const names = steps.map(kind => kind === 'plugin' ? 'npm 插件' : '完整客户端')
    return { steps, blocked, reason: `将依次更新：${names.join('、')}。` }
  }
  if (blocked.length > 0) return { steps, blocked, reason: blocked.join('；') }
  const unknown = ['plugin', 'desktop'].map(kind => assessment?.[kind]).filter(item => item?.known === false).map(item => item.reason).filter(Boolean)
  if (unknown.length > 0) return { steps, blocked, reason: unknown.join('；') }
  return { steps, blocked, reason: '插件与完整客户端均已是最新版。' }
}
