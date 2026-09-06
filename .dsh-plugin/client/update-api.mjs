export const PLUGIN_PACKAGE = '@ljwei-stak/model-router-galgame'
export const NPM_REGISTRY = 'https://registry.npmjs.org'
export const NPM_PACKAGE_URL = `https://www.npmjs.com/package/${PLUGIN_PACKAGE}`
export const PLUGIN_PROJECT_URL = 'https://github.com/ljwei-stak/model-router-galgame'
export const DESKTOP_PROJECT_URL = 'https://github.com/anywhere-labs/dsh-desktop'
export const DESKTOP_RELEASES_URL = `${DESKTOP_PROJECT_URL}/releases`
export const DESKTOP_RELEASE_API = 'https://api.github.com/repos/anywhere-labs/dsh-desktop/releases/latest'
export const PLUGIN_UPDATE_CHANNEL = '/model-router-update'
export const PLUGIN_UPDATE_ENDPOINT = 'install-plugin'
export const DESKTOP_UPDATE_CHECK_PATH = '/api/desktop/updates/check'

const DESKTOP_MODES = new Set(['compatibility', 'extended', 'advanced'])
const DESKTOP_PLATFORMS = new Set(['darwin', 'win32', 'linux'])

function versionParts(value) {
  const match = String(value ?? '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/)
  if (match === null) return null
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4] === undefined ? [] : match[4].split('.'),
  }
}

export function compareVersions(left, right) {
  const a = versionParts(left)
  const b = versionParts(right)
  if (a === null || b === null) return String(left).localeCompare(String(right))
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] < b.core[index] ? -1 : 1
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length === 0 ? 1 : -1
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    if (a.prerelease[index] === undefined) return -1
    if (b.prerelease[index] === undefined) return 1
    if (a.prerelease[index] === b.prerelease[index]) continue
    const aNumber = /^\d+$/.test(a.prerelease[index])
    const bNumber = /^\d+$/.test(b.prerelease[index])
    if (aNumber && bNumber) return Number(a.prerelease[index]) < Number(b.prerelease[index]) ? -1 : 1
    if (aNumber !== bNumber) return aNumber ? -1 : 1
    return a.prerelease[index] < b.prerelease[index] ? -1 : 1
  }
  return 0
}

export function parseDesktopEnvironment(search) {
  const params = new URLSearchParams(String(search ?? ''))
  const mode = params.get('dsh-desktop-mode')
  const platform = params.get('dsh-desktop-platform')
  const version = params.get('dsh-desktop-version')
  if (mode === null && platform === null && version === null) return null
  if (!DESKTOP_MODES.has(mode) || !DESKTOP_PLATFORMS.has(platform) || versionParts(version) === null) return null
  return { mode, platform, version }
}

function unknownItem(reason, currentVersion = '未知') {
  return {
    known: false,
    available: false,
    installable: false,
    currentVersion: currentVersion || '未知',
    latestVersion: '未知',
    reason,
  }
}

async function responseJson(response, label) {
  let value
  try { value = await response.json() } catch { throw new Error(`${label}返回了无效响应`) }
  if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : `${label}失败（HTTP ${response.status}）`)
  return value
}

function postEmpty(fetchImpl, path) {
  return fetchImpl(path, {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'error',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: '{}',
  })
}

function rpcValue(result, label) {
  if (result?.ok === true && result.value !== null && typeof result.value === 'object') return result.value
  if (result?.ok === false) throw new Error(result.error?.message || `${label}失败`)
  throw new Error(`${label}返回了无效响应`)
}

export function createUpdateApi({
  connectionRpc,
  fetchImpl = globalThis.fetch,
  openWindow = globalThis.open,
  locationSearch = globalThis.location?.search ?? '',
  pluginVersion,
  pluginProjectUrl = PLUGIN_PROJECT_URL,
  desktopReleasesUrl = DESKTOP_RELEASES_URL,
} = {}) {
  const desktopEnvironment = parseDesktopEnvironment(locationSearch)
  const isDesktop = desktopEnvironment !== null
  const pluginInstallable = isDesktop && typeof connectionRpc?.call === 'function'
  const openExternal = url => {
    openWindow?.(url, '_blank', 'noopener,noreferrer')
    return Promise.resolve()
  }

  const checkPlugin = async () => {
    if (typeof fetchImpl !== 'function') return unknownItem('当前环境无法连接 npm registry。', pluginVersion)
    try {
      const response = await fetchImpl(`${NPM_REGISTRY}/${PLUGIN_PACKAGE.replace('/', '%2F')}/latest`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response?.ok) throw new Error(`HTTP ${response?.status ?? '未知'}`)
      const metadata = await response.json()
      if (metadata?.name !== PLUGIN_PACKAGE || typeof metadata.version !== 'string' || versionParts(metadata.version) === null) {
        throw new Error('返回的 latest 元数据无效')
      }
      const order = compareVersions(pluginVersion, metadata.version)
      return {
        known: true,
        source: 'npm',
        packageName: PLUGIN_PACKAGE,
        currentVersion: pluginVersion,
        latestVersion: metadata.version,
        available: order < 0,
        installable: pluginInstallable,
        reason: order < 0
          ? pluginInstallable
            ? `npm 已发布 ${metadata.version}，聚合包会同步更新全部依赖插件。`
            : `npm 已发布 ${metadata.version}；当前环境不能直接安装。`
          : order > 0
            ? `当前版本新于 npm latest ${metadata.version}，不会降级。`
            : '插件及其 npm 依赖已是 latest。',
      }
    } catch (error) {
      return unknownItem(`npm 检查失败：${error instanceof Error ? error.message : String(error)}`, pluginVersion)
    }
  }

  const checkDesktop = async () => {
    if (desktopEnvironment === null) return unknownItem('完整客户端只能在 DSH Desktop 中检查。')
    if (typeof fetchImpl !== 'function') return unknownItem('当前环境无法连接 GitHub Releases。', desktopEnvironment.version)
    try {
      const response = await fetchImpl(DESKTOP_RELEASE_API, {
        headers: { accept: 'application/vnd.github+json' },
        cache: 'no-store',
      })
      if (!response?.ok) throw new Error(`HTTP ${response?.status ?? '未知'}`)
      const metadata = await response.json()
      if (typeof metadata?.tag_name !== 'string' || versionParts(metadata.tag_name) === null) throw new Error('返回的 Release 版本无效')
      const latestVersion = metadata.tag_name.replace(/^v/, '')
      const order = compareVersions(desktopEnvironment.version, latestVersion)
      return {
        known: true,
        source: 'github',
        repository: 'anywhere-labs/dsh-desktop',
        currentVersion: desktopEnvironment.version,
        latestVersion,
        available: order < 0,
        installable: true,
        reason: order < 0
          ? `DSH Desktop 已发布 ${latestVersion}。`
          : order > 0
            ? `当前客户端新于稳定 Release ${latestVersion}，不会降级。`
            : '已是最新稳定客户端。',
      }
    } catch (error) {
      return unknownItem(`GitHub Release 检查失败：${error instanceof Error ? error.message : String(error)}`, desktopEnvironment.version)
    }
  }

  const installPlugin = !pluginInstallable ? null : async (_item, signal) => {
    return rpcValue(
      await connectionRpc.call(PLUGIN_UPDATE_CHANNEL, PLUGIN_UPDATE_ENDPOINT, {}, signal),
      'npm 插件更新',
    )
  }

  const installDesktop = !isDesktop || typeof fetchImpl !== 'function' ? null : async () => {
    const result = await responseJson(await postEmpty(fetchImpl, DESKTOP_UPDATE_CHECK_PATH), '完整客户端更新检查')
    if (result?.accepted !== true) throw new Error('完整客户端更新器未接受请求')
    return {
      accepted: true,
      restartRequired: false,
      message: 'DSH Desktop 官方更新检查已完成，请按桌面端提示完成后续操作。',
    }
  }

  return {
    isDesktop,
    platform: desktopEnvironment?.platform ?? 'web',
    desktopMode: desktopEnvironment?.mode ?? null,
    desktopVersion: desktopEnvironment?.version ?? null,
    pluginVersion,
    projectUrl: pluginProjectUrl,
    releasesUrl: desktopReleasesUrl,
    npmPackageUrl: NPM_PACKAGE_URL,
    async check() {
      const [plugin, desktop] = await Promise.all([checkPlugin(), checkDesktop()])
      return { plugin, desktop }
    },
    installPlugin,
    installDesktop,
    subscribe: null,
    openProject: () => openExternal(pluginProjectUrl),
    openReleases: () => openExternal(desktopReleasesUrl),
    openNpm: () => openExternal(NPM_PACKAGE_URL),
  }
}
