/** Selects the one-click update target without downloading duplicate plugin data. */
export function selectUnifiedUpdate(assessment) {
  if (assessment?.desktop?.available && assessment.desktop.installable) {
    return {
      kind: 'desktop',
      reason: '完整客户端有新版本；安装包已包含同版本插件，将一次完成两者更新。',
    }
  }
  if (assessment?.plugin?.available && assessment.plugin.installable) {
    return {
      kind: 'plugin',
      reason: '完整客户端已是最新版，只需更新插件。',
    }
  }

  const blocked = [assessment?.desktop, assessment?.plugin]
    .filter(item => item?.available && !item.installable)
    .map(item => item.reason)
    .filter(Boolean)
  if (blocked.length > 0) return { kind: null, reason: blocked.join('；') }
  return { kind: null, reason: '插件与完整客户端均已是最新版。' }
}
