/**
 * Web capability selection for the bundled ModSearch + Ego Browser pair.
 *
 * ModSearch owns search/fetch engines and SSRF protection. Ego Browser owns
 * the real visible browser, login state, screenshots, and human-check handoff.
 * This module only classifies intent and creates an auditable instruction for
 * the model; it never fetches an untrusted URL itself.
 */

export const MODSEARCH_PACKAGE = '@liustack/modsearch'
export const MODSEARCH_VERSION = '5.10.1'
export const EGO_BROWSER_PACKAGE = '@ljwei-stak/dsh-ego-browser'
export const EGO_BROWSER_VERSION = '0.8.3'

const WEB_RE = /https?:\/\/|www\.|联网|上网|网页|网站|搜索|查找|资料|文献|新闻|最新|实时|网页内容|页面|来源|引用|网络|x\s*帖子|twitter|推特|github|反爬|验证码|登录|人机验证/i
const BROWSER_RE = /反爬|验证码|人机验证|cloudflare|turnstile|recaptcha|hcaptcha|登录|需要点击|动态页面|网页窗口|浏览器|可见窗口|手动验证|页面交互/i

function text(value, max = 12000) {
  return String(value ?? '').slice(-max)
}

export function classifyWebIntent(input) {
  const value = text(input)
  const needsWeb = WEB_RE.test(value)
  const directBrowser = BROWSER_RE.test(value)
  return {
    needsWeb,
    directBrowser,
    antiBotFallback: needsWeb,
    primary: needsWeb ? 'modsearch' : 'native-model',
    fallback: needsWeb ? 'ego-browser' : null,
    reason: directBrowser
      ? '用户明确要求动态网页、登录态或反爬页面，优先使用可见 Ego Browser。'
      : needsWeb
        ? '先使用 ModSearch 搜索/抓取；失败、内容不完整或触发人机验证时切换 Ego Browser。'
        : '',
  }
}

export function webCapabilityForPlan(input, plan = null) {
  const intent = classifyWebIntent(input)
  const tasks = Array.isArray(plan?.subtasks) ? plan.subtasks : []
  return {
    ...intent,
    taskCount: tasks.length,
    stageAware: tasks.length > 1,
    packages: {
      search: MODSEARCH_PACKAGE,
      browser: EGO_BROWSER_PACKAGE,
    },
    versions: {
      search: MODSEARCH_VERSION,
      browser: EGO_BROWSER_VERSION,
    },
    humanCheckPolicy: 'pause-and-handoff',
  }
}

export function webCapabilityStatus(ctx) {
  let web = false
  let tools = false
  try {
    web = Boolean(ctx?.get?.('web'))
    tools = Boolean(ctx?.get?.('tools'))
  } catch {
    web = false
    tools = false
  }
  return {
    modsearch: { package: MODSEARCH_PACKAGE, version: MODSEARCH_VERSION, bundled: true, webServiceDetected: web },
    egoBrowser: { package: EGO_BROWSER_PACKAGE, version: EGO_BROWSER_VERSION, bundled: true, toolServiceDetected: tools },
    antiBotWindow: 'ego_space_open -> ego_navigate -> ego_page_info/ego_captcha -> ego_snapshot/ego_screenshot',
    humanCheck: 'pause-and-handoff',
  }
}

export function webInstruction(capability) {
  if (!capability?.needsWeb) return ''
  const browserFirst = capability.directBrowser
  return [
    '[联网与可见浏览器适配]',
    browserFirst
      ? '本任务涉及动态网页、登录态或反爬页面：优先使用 Ego Browser 的真实可见窗口。'
      : '普通联网先使用 ModSearch 提供的 web_search/read_page；需要 X 内容时使用 x_search。',
    '如果搜索或抓取返回 unavailable、内容不完整、JS 页面空白或 warnings，切换 Ego Browser：先 ego_space_open，再 ego_navigate；随后调用 ego_page_info 或 ego_captcha 检查 humanCheck。',
    '页面可读时使用 ego_snapshot、ego_read_element、ego_screenshot 或 ego_http(browser) 提取证据；必须交互时使用 ego_click、ego_fill、ego_wait*。',
    '检测到验证码、Cloudflare、Turnstile、登录或其他 humanCheck=true 时，暂停当前工作包，提示用户在 Agent 浏览器观察窗完成验证；用户确认后再继续。不要绕过验证码或伪造验证结果。',
    '联网证据必须保留 URL、页面状态和不确定性说明；批量抓取仍遵守审批门控。',
  ].join('\n')
}
