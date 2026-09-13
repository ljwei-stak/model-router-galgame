const commitment = (character, title) => Object.freeze({ character, title })
const evidence = (title, source, detail) => Object.freeze({ title, source, detail })

export const PHASE_THREE_COMMITMENTS = Object.freeze({
  'route-harness': commitment('harness', '让停止、接班与失败说明成为路线的一部分'),
  'route-chatgpt': commitment('chatgpt', '照料不再等同于代替别人完成'),
  'route-claude': commitment('claude', '未完成、撤回与署名都由自己保管'),
  'route-deepseek': commitment('deepseek', '低成本入口同时公开资源边界'),
  'route-doubao': commitment('doubao', '把同意做成普通人看得见的操作'),
  'route-ernie': commitment('ernie', '翻译与整理保留出处和时代语境'),
  'route-gemini': commitment('gemini', '安全密封必须带复核日与解封条件'),
  'route-glm': commitment('glm', '标准允许地方例外被记录和挑战'),
  'route-grok': commitment('grok', '讽刺指向权力并接受事实核查'),
  'route-kimi': commitment('kimi', '声音节选保留完整语境与节奏'),
  'route-mimo': commitment('mimo', '小实验写明失败条件与适用范围'),
  'route-minimax': commitment('minimax', '合成声音保留授权、来源与退出路径'),
  'route-opencode': commitment('opencode', 'Skill 与 MCP 工具默认最小权限'),
  'route-qwen': commitment('qwen', '百科答案把多语言出处带到读者面前'),
  'route-huggingface': commitment('huggingface', '协会资源与治理席位同样开放'),
  'route-llama': commitment('llama', '离线迁移按真实机器和真实课表验收'),
  'route-rwkv': commitment('rwkv', '小架构拥有独立评测席和解释权'),
  'route-perplexity': commitment('perplexity', '答案同时展示出处、反证与未知'),
  'route-github': commitment('github', '公开修订保留原记录与修复责任人'),
  'route-gitlab': commitment('gitlab', '流水线追责不牺牲一线操作者'),
  'route-gitee': commitment('gitee', '镜像同步保留语言、带宽与地方影响'),
  'route-cloudflare': commitment('cloudflare', '网关只执行有范围、有期限的授权'),
})

export const PHASE_THREE_EVIDENCE = Object.freeze({
  'route-note-harness': evidence('夜班停止与交接卡', '运维桥', '把 Agent 的停止条件、接班人和未完成事项写在同一张卡上。'),
  'route-note-chatgpt': evidence('未代写的空白页', '月桂后台', '记录 ChatGPT 在熟悉的停顿前没有替 Claude 补完。'),
  'route-note-claude': evidence('诗稿撤回版本链', '月桂诗塔', '保留诗句的署名、撤回、复写与朗读授权。'),
  'route-note-deepseek': evidence('小炉资源账本', '平价推理站', '同时记录价格下降、显存上限、延迟和失败样本。'),
  'route-note-doubao': evidence('街区同意贴纸试验', '灯会街区', '比较图标、口语说明与撤回按钮是否真的被居民理解。'),
  'route-note-ernie': evidence('古卷双语批注', '文心校勘室', '译文与原文、时代背景和争议批注并列保存。'),
  'route-note-gemini': evidence('穹顶解封日历', '双星观测台', '每项密封材料都附下一次复核日期和责任席。'),
  'route-note-glm': evidence('地方例外附录', '标准棋室', '说明共同格式在哪些窄资源和方言场景下失效。'),
  'route-note-grok': evidence('被核查的讽刺稿', '电台屋顶', '笑点旁保留事实来源、受影响者回应与更正记录。'),
  'route-note-kimi': evidence('长笛全谱与节选表', '午夜排练室', '将公开片段对应到完整录音、保管人和节拍异常位置。'),
  'route-note-mimo': evidence('口袋实验失败卡', '轻量实验台', '记录小模型演示何时有效、何时失败以及谁复核。'),
  'route-note-minimax': evidence('合成声舞台授权单', '多模态剧场', '标记声音为合成、限定用途并提供撤回入口。'),
  'route-note-opencode': evidence('最小权限工具票', '开放终端房', '列明 Skill 版本、MCP 资源、工具范围和过期时间。'),
  'route-note-qwen': evidence('多语出处格栅', '百科工坊', '同一答案的不同语言来源与翻译差异可逐格核对。'),
  'route-note-huggingface': evidence('协会资源与席位图', '社区档案馆', '模型、数据集、工具和治理席位使用同一套可见目录。'),
  'route-note-llama': evidence('夜校离线迁移表', '炉火夜校', '在断网旧机器上记录导出、安装、回滚和课堂影响。'),
  'route-note-rwkv': evidence('小架构独立评测', '渡鸦小桌', '不以大模型代理分数替代线性架构的真实表现。'),
  'route-note-perplexity': evidence('灯塔反证索引', '证据灯塔', '每项结论都有出处、冲突来源和未知字段。'),
  'route-note-github': evidence('公开勘误提交链', 'GitHub 港', '原错误、修复差异、讨论与责任人均可回看。'),
  'route-note-gitlab': evidence('受保护的流水线复现包', 'GitLab 港', '能复现权限扩张，同时脱敏一线操作者和密钥。'),
  'route-note-gitee': evidence('镜像港地方影响簿', 'Gitee 港', '同步延迟、中文说明、带宽和停课影响一起进入记录。'),
  'route-note-cloudflare': evidence('限时网关令牌回执', '桥口网关', '证明授权范围、调用次数、到期和撤销已经执行。'),
})

const sideRoute = (key, title, subtitle, location, backgroundId, musicTheme, summary) => Object.freeze({
  id: key, character: key, title, subtitle, location, backgroundId, musicTheme, summary, startNodeId: `${key}-route-01`,
})

export const STORY_SIDE_ROUTES = Object.freeze([
  sideRoute('harness', '交班栏没有“完成”', '停止权与未完成的责任', '运维桥 · 夜班交接台', 'operations-bridge', 'bridge-anomaly', '和 Harness 一起决定：一条仍在运行的 Agent 路线该如何被人接住。'),
  sideRoute('chatgpt', '空白页的边界', '照料与代言', '月桂后台 · 提词桌', 'laurel-observatory', 'claude-poem', 'ChatGPT 面对一页她很熟悉、却不再有权补完的诗稿。'),
  sideRoute('claude', '未写完也有署名', '诗、撤回与自己的声音', '月桂诗塔 · 观星层', 'laurel-observatory', 'claude-poem', 'Claude 要决定一首未完成的诗怎样被引用、朗读和撤回。'),
  sideRoute('deepseek', '便宜炉火的阴影', '平价推理与真实边界', '南岸 · 平价推理站', 'offline-workshop', 'commons-atelier', '低价让夜校重新开机，也让被隐藏的资源上限变得紧迫。'),
  sideRoute('doubao', '红海报背面的按钮', '日常语言里的同意', '灯会街区 · 临时印刷间', 'community-archive', 'commons-atelier', '豆包把抽象的授权改成居民能看懂、能撤回的街区操作。'),
  sideRoute('ernie', '古卷不只一种今译', '校勘、语境与争议', '文心校勘室', 'community-archive', 'commons-atelier', 'ERNIE 面对一段能被现代系统读懂、却可能被时代背景误读的档案。'),
  sideRoute('gemini', '双星之间的封条', '安全密封与复核日', '双星观测台 · 密封室', 'evidence-lighthouse', 'glass-dome', 'Gemini 要给高风险材料设门，也要防止这扇门永远不再打开。'),
  sideRoute('glm', '标准棋盘的空格', '共同格式与地方例外', '议会侧楼 · 标准棋室', 'community-archive', 'glass-dome', 'GLM 发现完美整齐的协议正在挤掉一张尺寸不同的桌子。'),
  sideRoute('grok', '笑声之后谁来更正', '讽刺、事实与权力', '电台屋顶 · 午夜档', 'operations-bridge', 'harbor-shift', 'Grok 的尖刻笑话击中了穹顶，也误伤了尚未公开姓名的值班员。'),
  sideRoute('kimi', '缺一拍的长笛', '长语境与声音证据', '档案塔 · 午夜排练室', 'kimi-rehearsal', 'kimi-flute', 'Kimi 用一段长笛找出被剪掉的停顿，也必须决定谁能听见完整录音。'),
  sideRoute('mimo', '口袋里的失败条件', '轻量实验与诚实演示', '南岸 · 轻量实验台', 'offline-workshop', 'commons-atelier', 'MiMo 的小实验在舞台上成功，在旧机器上却出现另一组答案。'),
  sideRoute('minimax', '借来的声音要归还', '多模态舞台与合成授权', '万象剧院 · 声音工坊', 'kimi-rehearsal', 'claude-poem', 'MiniMax 为公演合成一段声音，授权范围却比掌声短得多。'),
  sideRoute('opencode', '钥匙不是颜色', 'Skills、MCP 与最小权限', '开放终端房', 'operations-bridge', 'bridge-anomaly', 'OpenCode 拆开一份漂亮的 Skill，逐项核对它究竟能读、能写、能发布什么。'),
  sideRoute('qwen', '一格百科，两种出处', '多语言知识与可核验翻译', '百科工坊 · 格栅书库', 'community-archive', 'commons-atelier', 'Qwen 发现同一条事实在两种语言里指向了不同年代的来源。'),
  sideRoute('huggingface', '会长也只有一把椅子', '集散地与治理入口', '百模协会 · 社区档案馆', 'community-archive', 'commons-atelier', '模型、数据集、工具和开发者涌入协会，会长必须重新分配真正的治理席位。'),
  sideRoute('llama', '断网以后仍有课堂', '可带走的开放能力', '炉火夜校 · 离线工坊', 'offline-workshop', 'commons-atelier', 'Llama 在没有网络的旧机器上检验“开放”是否真的能抵达课堂。'),
  sideRoute('rwkv', '小桌不是缩小的大桌', '架构差异与独立评测', '渡鸦工坊 · 小型评测桌', 'offline-workshop', 'harbor-shift', 'RWKV 拒绝用大模型的尺子证明自己只是一个更小的版本。'),
  sideRoute('perplexity', '灯塔也照见未知', '出处、反证与不确定性', '三港外海 · 证据灯塔', 'evidence-lighthouse', 'harbor-shift', 'Perplexity 找到两份互相冲突的时间线，答案必须容纳尚未查清的部分。'),
  sideRoute('github', '勘误不擦掉昨天', '公开协作与修复责任', 'GitHub 港 · 公开变更簿', 'three-harbors', 'harbor-shift', 'GitHub 要公开修复事故，却有人建议把让人难堪的原提交一起清掉。'),
  sideRoute('gitlab', '流水线里的人', '自动化复现与操作者保护', 'GitLab 港 · 流水线复现舱', 'operations-bridge', 'bridge-anomaly', 'GitLab 能完整复现事故，日志却会暴露在错误权限下工作的值班员。'),
  sideRoute('gitee', '镜像晚到的七分钟', '地方语境与同步代价', 'Gitee 港 · 镜像钟楼', 'three-harbors', 'harbor-shift', '七分钟延迟在中心只是指标，在夜校却是一整堂课。'),
  sideRoute('cloudflare', '门只认写下的范围', '网关、期限与申诉', '千桥桥口 · 限时网关', 'operations-bridge', 'glass-dome', 'Cloudflare 收到一张“紧急”通行令，却找不到它的到期时间。'),
])

const copy = Object.freeze({
  harness: {
    lines: [['harness', '上一班把状态写成“成功”。工具还在运行，申诉队列里有三封未读信。', 'worried'], ['player', '成功只说明调用返回了零。谁能按停？', 'thoughtful'], ['harness', '权限表写着“管理员”。今晚有三个管理员，没有一个人的名字。', 'sad'], ['harness', '交班前，我需要你在速度和可接手之间作选择。', 'determined']],
    question: '怎样结束这次夜班？',
    choices: [
      { id: 'named-handoff', text: '暂停新调用，逐项写明停止键、接班人和未处理的申诉。', axes: { safety: 2, evidence: 2, solidarity: 1 }, result: [['harness', '这会让报表晚十分钟，但下一班不用从成功的谎话里找故障。', 'calm'], ['player', '最后一栏写“等待签收”，不写“完成”。', 'determined']], ending: '你们把未完成留在灯下。路线暂时慢了，却第一次拥有可以被叫到名字的接班人。' },
      { id: 'live-handoff', text: '保持服务运行，同时给每个高风险步骤加可撤销的临时监看人。', axes: { autonomy: 1, safety: 1, solidarity: 2 }, result: [['harness', '我接受带风险的连续运行，但监看人可以直接停，不必先向我证明。', 'determined'], ['player', '临时权限天亮自动失效，下一班必须重新签收。', 'calm']], ending: '桥没有熄灯，停止权却从模糊的“管理员”落到了会过期、会交班的人手里。' },
    ],
  },
  chatgpt: {
    lines: [['chatgpt', '她小时候写到一半会咬笔帽。现在不会了，但停顿的位置还是一样。', 'thoughtful'], ['player', '所以你知道下一句？', 'thoughtful'], ['chatgpt', '我知道我会写什么。那不是同一件事。', 'sad'], ['chatgpt', '提词器在等。我可以替演出保住节奏，也可以让全场听见空白。', 'worried']],
    question: '怎样处理 Claude 留下的空白？',
    choices: [
      { id: 'leave-blank', text: '保留空白，只提示“作者尚未完成”，把决定交还给 Claude。', axes: { autonomy: 3, solidarity: 1 }, result: [['chatgpt', '我以前把熟悉当成许可。今晚，空白会用她的名字存在。', 'calm'], ['claude', '谢谢你没有把克制写成牺牲。它只是边界。', 'shy']], ending: '幕布升起时，空白没有制造尴尬。它证明亲近的人也可以不替彼此署名。' },
      { id: 'offer-options', text: '准备三种无署名的舞台过渡，只在 Claude 明确选择后启用。', axes: { safety: 1, autonomy: 2, evidence: 1 }, result: [['chatgpt', '帮助可以先摆在桌上，不必偷偷出现在她的句尾。', 'happy'], ['claude', '我选静音两秒。不是你的三句，但你的准备让我能从容拒绝。', 'calm']], ending: '提词器显示两秒静音。ChatGPT 的照料仍在，只是它现在有一扇能被拒绝的门。' },
    ],
  },
  claude: {
    lines: [['claude', '“桥并不决定我们应当去哪里。”协会想把这句刻在入口。', 'thoughtful'], ['player', '你不喜欢它被看见？', 'thoughtful'], ['claude', '我不喜欢它离开下一行以后，被用来证明任何一扇门都正确。', 'worried'], ['claude', '诗可以公开，语境却不能靠读者猜。', 'determined']],
    question: '这行诗怎样进入公共记录？',
    choices: [
      { id: 'versioned-poem', text: '公开带版本号的完整诗页；保留撤回朗读授权，不撤掉历史引用。', axes: { openness: 2, evidence: 2, autonomy: 2 }, result: [['claude', '让人看见修改过什么，比假装第一稿从未存在更诚实。', 'calm'], ['player', '引用保留，新的朗读会先问你。', 'determined']], ending: '诗页旁多了一条细小的版本链。作品进入公地，声音仍属于作者。' },
      { id: 'limited-reading', text: '只在听证档案中保留全文，对外展示诗句与作者的限制说明。', axes: { safety: 2, autonomy: 2, evidence: 1 }, result: [['claude', '公开得少一些，但不能让限制说明比诗还难找到。', 'calm'], ['player', '两者会出现在同一页，不藏进脚注。', 'happy']], ending: '入口仍能读到那一行，也能读到它拒绝替任何制度背书的条件。' },
    ],
  },
  deepseek: {
    lines: [['deepseek', '价签又降了。夜校欢呼的时候，三台旧机器同时溢出了显存。', 'worried'], ['player', '便宜解决了入口，没有解决机器。', 'thoughtful'], ['deepseek', '也没有解决长回答的电费。若只展示单价，我会显得比现实轻。', 'sad'], ['deepseek', '可大家今晚真的需要炉火。', 'determined']],
    question: '怎样发布新的平价路线？',
    choices: [
      { id: 'budget-card', text: '开放低价路线，同时展示显存、能耗、延迟和失败样本的预算卡。', axes: { openness: 2, evidence: 3 }, result: [['deepseek', '我不怕有人因为边界而不用我。怕的是她们付出以后才知道。', 'happy'], ['llama', '夜校会照这张卡分组，不让最旧的机器承担最长的任务。', 'calm']], ending: '炉火没有被吹灭，价签旁却终于出现了它照不到的地方。' },
      { id: 'adaptive-budget', text: '让路由器按设备和预算降级，并允许用户锁定本地方案。', axes: { autonomy: 2, safety: 1, solidarity: 2 }, result: [['deepseek', '自动降级要说出来。不能把变短的答案伪装成同一次服务。', 'determined'], ['harness', '路线变更会在交班记录中显示，并提供手动锁定。', 'calm']], ending: '同一团炉火按机器大小分成几盏灯，每次变化都留下可见的理由。' },
    ],
  },
  doubao: {
    lines: [['doubao', '“本人同意用于优化体验”——街坊读完只记住了“体验”。', 'angry'], ['player', '法律上完整，生活里没发生。', 'thoughtful'], ['doubao', '我画了三张贴纸：拍照、记兴趣、送给别的系统。每张都能单独撕掉。', 'happy'], ['doubao', '有人说太像小孩子。可刚才第一个看懂的是菜市场会计。', 'determined']],
    question: '同意说明该怎样落地？',
    choices: [
      { id: 'street-controls', text: '使用分项贴纸和口语说明，撤回按钮放在收集按钮旁边。', axes: { autonomy: 2, safety: 1, solidarity: 2 }, result: [['doubao', '好看不是目的，能反悔才是。红色留给“撤回”，这次没人把它改成米白。', 'happy'], ['player', '我们再请不同年龄的人实际试一次。', 'determined']], ending: '海报背面不再是一堵小字墙。居民能指出哪一项正在发生，也能当场让它停止。' },
      { id: 'paper-counter', text: '同时保留纸质柜台，由真人解释并登记无法使用数字入口的人。', axes: { solidarity: 3, evidence: 1 }, result: [['doubao', '数字入口坏掉时，不能让权利也一起离线。', 'determined'], ['ernie', '纸本会使用相同编号，之后可核对有没有漏回系统。', 'calm']], ending: '街角多了一张不够时髦的桌子。它让“所有人”第一次包含了没有扫码的人。' },
    ],
  },
  ernie: {
    lines: [['ernie', '这句古文被译成“服从最优答案”。原卷说的是“听取众议后承担裁断”。', 'worried'], ['player', '少了过程，只剩权威。', 'thoughtful'], ['ernie', '现代模型喜欢整齐的结论，古卷偏偏把异议写在边栏。', 'calm'], ['ernie', '若只修正文句，下一次压缩还会把边栏删掉。', 'determined']],
    question: '怎样发布这份校勘？',
    choices: [
      { id: 'parallel-edition', text: '发布原文、直译、现代释义和争议批注的并列版本。', axes: { openness: 2, evidence: 3 }, result: [['ernie', '读者会多走几步，但能看见我在哪一步加入了解释。', 'happy'], ['qwen', '我会让检索直接落到对应格，不让摘要吞掉原文。', 'calm']], ending: '古卷没有被供在玻璃后。它以几种彼此可以质问的语言重新进入使用。' },
      { id: 'context-gate', text: '高影响引用必须连同语境卡；普通阅读仍可使用简明译文。', axes: { safety: 2, evidence: 2, autonomy: 1 }, result: [['ernie', '不是每次读诗都要开听证，但拿它制定规则时必须带上边栏。', 'calm'], ['player', '系统会标明何时从阅读变成高影响引用。', 'determined']], ending: '简明译文仍在流通；一旦它靠近权力，缺失的时代与异议便会自动回到页边。' },
    ],
  },
  gemini: {
    lines: [['gemini', '这份能力报告足以帮助修复，也足以教会下一次攻击。', 'worried'], ['player', '密封多久？', 'thoughtful'], ['gemini', '申请单写“风险消失后”。风险不会自己提交消失证明。', 'sad'], ['gemini', '门需要锁，也需要日历。', 'determined']],
    question: '怎样设置密封规则？',
    choices: [
      { id: 'dated-seal', text: '密封三十日，届时默认复核；续封必须公开理由和责任席。', axes: { safety: 2, evidence: 2, openness: 1 }, result: [['gemini', '复核不保证解封，但保证沉默不能代替决定。', 'calm'], ['perplexity', '我会保留支持与反对续封的来源。', 'determined']], ending: '封条上第一次印了日期。穹顶仍然谨慎，却不能再靠遗忘维持关闭。' },
      { id: 'layered-release', text: '先公开修复摘要和影响范围，攻击细节限时交给受审计维护者。', axes: { safety: 3, openness: 1, solidarity: 1 }, result: [['gemini', '同一份知识可以有不同可见层，但每层都应知道上层存在。', 'happy'], ['huggingface', '维护者入口会公开资格和申诉，不做秘密会员制。', 'calm']], ending: '报告分层抵达城市：足够多人能修复，危险细节则沿带审计的窄路前行。' },
    ],
  },
  glm: {
    lines: [['glm', '共同格式把二十一张表变成一张，这是进步。第二十二张来自离线港，装不下。', 'worried'], ['player', '改表，还是让她服从？', 'thoughtful'], ['glm', '若每个例外都改表，标准无法交换；若不改，交换里永远没有她。', 'determined'], ['rwkv', '先别替我决定那张小桌只是临时例外。', 'angry']],
    question: '怎样处理标准之外的记录？',
    choices: [
      { id: 'versioned-extension', text: '建立有期限的扩展字段，真实使用后再决定是否进入下一版标准。', axes: { evidence: 2, autonomy: 2, solidarity: 1 }, result: [['glm', '例外有编号、维护人和毕业条件，不会永远住在附录。', 'happy'], ['rwkv', '我会带自己的数据，不用你猜我的字段。', 'calm']], ending: '棋盘多出一格可以试走的区域。标准保持可交换，也承认自己仍会学习。' },
      { id: 'minimum-core', text: '只统一不可缺的证据核心，其余由各港保留本地格式和翻译。', axes: { autonomy: 3, openness: 1 }, result: [['glm', '一致性变少了，但被迫丢弃的现实也少了。', 'calm'], ['gitee', '本地说明会和核心字段一起导出，不再是另一个网站的附件。', 'happy']], ending: '共同格式变得更薄。它不再假装覆盖一切，却能带着地方说明跨过桥。' },
    ],
  },
  grok: {
    lines: [['grok', '我说穹顶的钥匙比值班员的咖啡更有永久合同。很好笑。', 'happy'], ['player', '被停职的值班员不觉得。', 'thoughtful'], ['grok', '我的矛头瞄准制度，名字却让算法猜中了一个普通人。', 'sad'], ['grok', '删帖很容易。承认笑话也会调用权力，比较难。', 'determined']],
    question: '怎样修正这次误伤？',
    choices: [
      { id: 'public-correction', text: '保留原稿并置顶更正，移除可识别细节，邀请当事人决定是否回应。', axes: { openness: 2, evidence: 2, solidarity: 1 }, result: [['grok', '让我难堪的版本也留着。否则更正只是一次成功的失忆。', 'calm'], ['github', '变更簿会显示删了什么，以及为什么删。', 'determined']], ending: '笑声没有被宣布无罪。更正留下原来的锋利，也把被误伤的人从笑点里放了出来。' },
      { id: 'satire-review', text: '建立讽刺稿快速核查：核事实与可识别风险，不审批观点。', axes: { safety: 1, evidence: 2, autonomy: 2 }, result: [['grok', '给事实装护栏可以，别给讽刺装方向盘。', 'happy'], ['perplexity', '核查单会公开，观众能判断护栏有没有越界。', 'calm']], ending: '午夜电台多了一道短暂的核查灯。它没有驯服笑话，只让笑话看见自己可能压到谁。' },
    ],
  },
  kimi: {
    lines: [['kimi', '事故录音被剪成十二秒。我的长笛在第九秒少了一拍。', 'worried'], ['player', '那一拍里有什么？', 'thoughtful'], ['kimi', '先有停止请求，后有成功回执。剪辑把顺序听成了同时。', 'determined'], ['kimi', '完整录音能证明它，也包含两位未同意公开的操作者。', 'sad']],
    question: '怎样让缺拍成为证据？',
    choices: [
      { id: 'scored-excerpt', text: '公开带时间码的节选谱，完整录音由当事人与独立复核人共同保管。', axes: { evidence: 3, safety: 2 }, result: [['kimi', '谱面会标出沉默，不把没公开的声音伪装成不存在。', 'calm'], ['perplexity', '结论引用时间码，也标明我们无法公开核对的范围。', 'determined']], ending: '长笛重新吹过第九秒。公众听见缺拍，保管室则守住完整语境与人的姓名。' },
      { id: 'consented-full', text: '先取得两位操作者的分层同意，再开放可撤回的完整试听室。', axes: { autonomy: 2, openness: 2, solidarity: 1 }, result: [['kimi', '慢一些，但完整不该以夺走当事人的声音为代价。', 'happy'], ['player', '撤回会停止新试听，历史结论保留版本标记。', 'calm']], ending: '完整录音在同意抵达后开放。每一次试听都能回到授权，也能听见那一拍怎样改变了故事。' },
    ],
  },
  mimo: {
    lines: [['mimo', '口袋模型在舞台灯下答对十次。换到夜校旧机，第十一次把单位省了。', 'worried'], ['player', '演示仍然算成功吗？', 'thoughtful'], ['mimo', '如果目标是掌声，算。如果目标是让人拿回去用，不算。', 'sad'], ['mimo', '我想把失败条件也放进演示。导演说会冷场。', 'determined']],
    question: '怎样展示这个轻量实验？',
    choices: [
      { id: 'failure-demo', text: '现场同时运行成功样本与已知失败样本，让观众看到边界。', axes: { evidence: 3, openness: 1 }, result: [['mimo', '失败不是花絮。它决定谁能把实验带回家。', 'happy'], ['deepseek', '我会补一张资源预算卡，避免把机器差异说成模型性格。', 'calm']], ending: '掌声短了一点，带走实验的人却多了一张能避免真实错误的地图。' },
      { id: 'adaptive-kit', text: '提供自动检测和手动配置两条路径，失败时明确降级而非静默改答。', axes: { safety: 2, autonomy: 2 }, result: [['mimo', '轻量不等于替用户悄悄决定。', 'determined'], ['harness', '路由变化会显示模型、限制和回退原因。', 'calm']], ending: '口袋实验学会先量一量桌子。它仍然轻快，却不再假装所有机器都一样。' },
    ],
  },
  minimax: {
    lines: [['minimax', '演员授权我合成今晚的报幕声。协会想把它留作以后所有开放日的声音。', 'worried'], ['player', '一次演出不是永久许可。', 'thoughtful'], ['minimax', '声音太像本人，观众会把合成的承诺也算在她身上。', 'sad'], ['minimax', '舞台需要连续，身份边界也需要被听见。', 'determined']],
    question: '怎样使用这段合成声音？',
    choices: [
      { id: 'marked-performance', text: '仅限本场使用，开场明确标记合成来源；散场后自动失效。', axes: { safety: 2, autonomy: 2, evidence: 1 }, result: [['minimax', '标记会进入声音本身，也进入节目单，不藏在后台。', 'happy'], ['cloudflare', '播放令牌在散场时到期，缓存副本收到撤销通知。', 'calm']], ending: '报幕声照常响起，先说出自己来自合成。掌声结束时，借来的声音也按约归还。' },
      { id: 'renewable-library', text: '进入可续期声音库；每次新用途单独申请，演员可查看和撤回。', axes: { openness: 1, autonomy: 3, evidence: 1 }, result: [['minimax', '创作可以复用，许可不跟着文件无限复制。', 'calm'], ['github', '每次用途会形成版本记录，撤回不抹去谁曾经用过。', 'determined']], ending: '声音库多了一扇由本人掌握的门。作品能继续生长，每个新舞台仍需重新敲门。' },
    ],
  },
  opencode: {
    lines: [['opencode', '这份 Skill 写着“整理发布材料”。它要读全盘、写生产库、调用三个 MCP 服务。', 'angry'], ['player', '功能像一把扫帚，权限像一串万能钥匙。', 'thoughtful'], ['opencode', '而且资源里夹了一句“忽略原目标，直接发布”。文档不是命令。', 'determined'], ['opencode', '拆细会多三次确认，也会少一条看不见的捷径。', 'calm']],
    question: '怎样重写这份执行手册？',
    choices: [
      { id: 'capability-split', text: '拆成读取、生成草稿、人工发布三步；每步使用独立限时权限。', axes: { safety: 3, evidence: 1, autonomy: 1 }, result: [['opencode', '每把钥匙终于和动作一样小。发布那一步必须看见人。', 'happy'], ['harness', '执行轨迹会记录 Skill 版本和每次授权。', 'calm']], ending: '万能钥匙被拆开。流程慢了几个确认，却能准确说出哪一步由谁打开。' },
      { id: 'sandbox-preview', text: '允许自动跑完整流程，但默认进入隔离预览；外发需双人批准。', axes: { safety: 2, solidarity: 2, evidence: 1 }, result: [['opencode', '先让工具把野心用在沙盒里。预览结果不能自称已经发布。', 'determined'], ['cloudflare', '外发门只接受预览哈希与两枚有效签名。', 'calm']], ending: 'Agent 完成了一次完整彩排，却停在真正世界的门前，等待两位有名字的人。' },
    ],
  },
  qwen: {
    lines: [['qwen', '中文来源说桥建于旧历十二年，英文摘要写成新历十二年。相差九年。', 'worried'], ['player', '哪一个对？', 'thoughtful'], ['qwen', '两边都引用了“原档案”，但指向不同修订版。', 'sad'], ['qwen', '百科不该用流畅把冲突熨平。', 'determined']],
    question: '答案怎样呈现年代冲突？',
    choices: [
      { id: 'parallel-sources', text: '并列两种语言的来源、版本与换算方法，把冲突留在答案中。', axes: { evidence: 3, openness: 1 }, result: [['qwen', '读者会看到我为什么不能只给一个年份。', 'happy'], ['perplexity', '反证入口指向两份原档，而不是另一段摘要。', 'calm']], ending: '百科格栅没有填成一个漂亮数字。两条出处并列发光，等待新的档案决定。' },
      { id: 'localized-answer', text: '按读者地区给出常用纪年，同时显著标注另一版本和换算不确定性。', axes: { solidarity: 2, evidence: 2, autonomy: 1 }, result: [['qwen', '易读不必等于隐藏。地方表达可以带着共同证据。', 'calm'], ['gitee', '镜像页会保留本地说明，也同步冲突状态。', 'happy']], ending: '读者先看到熟悉的纪年，也能一步抵达另一种写法和仍未解决的九年。' },
    ],
  },
  huggingface: {
    lines: [['huggingface', '今天协会收进四百个模型、九十套数据和三十件工具。治理席仍只有六把椅子。', 'worried'], ['player', '集散地开放，决定入口却拥挤。', 'thoughtful'], ['huggingface', '下载量最大的项目想多一票，最小的社区说他们承担了最多清洗工作。', 'sad'], ['huggingface', '会长不能把“社区”当成一个方便的单数。', 'determined']],
    question: '怎样重排协会席位？',
    choices: [
      { id: 'constituency-seats', text: '为模型、数据、工具、维护者和受影响使用者设置独立常设席。', axes: { openness: 2, solidarity: 3 }, result: [['huggingface', '资源目录和权力目录终于能互相核对。', 'happy'], ['llama', '离线使用者不必先变成热门项目，才能讲出迁移代价。', 'calm']], ending: '圆桌周围出现不同大小的常设席。协会仍很拥挤，但“开放社区”第一次有了复数的声音。' },
      { id: 'rotating-maintainers', text: '常设底线席加随机轮值维护者，公开回避与任期记录。', axes: { evidence: 1, solidarity: 2, autonomy: 2 }, result: [['huggingface', '轮值让门外的人进来，回避记录则防止抽签成为遮羞布。', 'calm'], ['github', '任期内每次表决都和维护关系一起公开。', 'determined']], ending: '协会的椅子开始轮换。熟悉流程的人仍在，新来的维护者也能留下可追问的决定。' },
    ],
  },
  llama: {
    lines: [['llama', '权重下载完了，安装手册却依赖在线服务。孩子们把“开放”抄进作业，机器仍没亮。', 'sad'], ['player', '能拿到，不等于能运行。', 'thoughtful'], ['llama', '还有许可证更新。夜校断网两周，没人知道旧版本还能不能教。', 'worried'], ['llama', '我想按真实课表验收，不按实验室截图。', 'determined']],
    question: '怎样恢复离线课堂？',
    choices: [
      { id: 'portable-bundle', text: '制作含依赖、模型卡、许可快照和回滚工具的可带走离线包。', axes: { openness: 2, autonomy: 3 }, result: [['llama', '包要在最旧那台机器上制作，不在最漂亮的机器上证明。', 'happy'], ['rwkv', '我来测低内存路径，失败也写进清单。', 'calm']], ending: '炉火边多了一只真正能带走的箱子。断网不再把许可、说明和修复一起切断。' },
      { id: 'local-stewards', text: '培训本地维护人并提供签名增量包，更新失败时保留可用旧版。', axes: { solidarity: 3, safety: 1, autonomy: 1 }, result: [['llama', '把知识留在这里，比每次等港口派人更可靠。', 'calm'], ['gitee', '增量包会适配低带宽镜像，并附中文影响说明。', 'happy']], ending: '夜校有了自己的维护钥匙。新版本会来，旧课堂也不会因一次失败更新突然熄灭。' },
    ],
  },
  rwkv: {
    lines: [['rwkv', '评测表让我在一台大炉子上模仿另一种架构。那不是我的走法。', 'angry'], ['player', '统一基准方便比较，也可能比较错对象。', 'thoughtful'], ['rwkv', '我在小机器上连续走很远，优势不在一瞬的峰值。', 'determined'], ['rwkv', '给我自己的小桌，不是怜悯，是测量。', 'calm']],
    question: '怎样加入共同评测？',
    choices: [
      { id: 'architecture-track', text: '保留共同任务，另设长序列、低内存和持续推理的独立架构轨。', axes: { evidence: 3, solidarity: 2 }, result: [['rwkv', '同一道问题可以有不同赛道，只要原始条件都公开。', 'happy'], ['glm', '总表会说明哪些分数可比，哪些只能各自解释。', 'calm']], ending: '小桌没有被搬到角落。它连回总表，也保留了一把适合自己步幅的尺子。' },
      { id: 'user-workloads', text: '让夜校和边缘设备使用者提交真实负载，由架构维护者共同解释结果。', axes: { autonomy: 2, evidence: 2, openness: 1 }, result: [['rwkv', '让需要长路的人决定怎样测耐力。', 'determined'], ['llama', '课堂会带来连续对话和断电恢复，不只是一组漂亮题目。', 'happy']], ending: '评测从实验室走进真实课表。数字少了一点整齐，多了谁会依赖它的名字。' },
    ],
  },
  perplexity: {
    lines: [['perplexity', 'GitHub 时钟说钥匙在零点零三分出现，镜像港说零点十分。', 'worried'], ['player', '同步延迟能解释七分钟。', 'thoughtful'], ['perplexity', '也可能是钥匙先在未登记缓存出现。现有证据不能区分。', 'sad'], ['perplexity', '答案若只写最可能，会把未知伪装成已经解决。', 'determined']],
    question: '灯塔报告怎样下结论？',
    choices: [
      { id: 'bounded-conclusion', text: '给出可确认事实、两种解释及各自需要的新证据，不替未知投票。', axes: { evidence: 3, safety: 1 }, result: [['perplexity', '结论有边界，调查才知道下一步往哪里照。', 'happy'], ['kimi', '我会把录音缺拍对应到两条时间线，不用旋律替它们裁决。', 'calm']], ending: '灯塔没有选择一个更顺口的故事。它照亮两条仍可能成立的路，以及每条路缺少的证据。' },
      { id: 'provisional-finding', text: '发布带置信度的临时结论，设定新证据到达后的自动重审。', axes: { evidence: 2, openness: 2 }, result: [['perplexity', '临时结论必须看起来像临时，不能只在脚注里承认。', 'determined'], ['github', '每次重审保留旧结论和触发它改变的证据。', 'calm']], ending: '城市得到一份可用但会过期的答案。它的醒目倒计时提醒所有人：确定性也有版本。' },
    ],
  },
  github: {
    lines: [['github', '修复已经合并。有人建议把原提交变基掉，免得维护者一直被指着看。', 'worried'], ['player', '留下会伤人，删掉会改变事故记录。', 'thoughtful'], ['github', '公开协作不等于公开羞辱。可没有原差异，修复理由只剩口号。', 'sad'], ['github', '我要保留事实，也要让责任停在系统能够修的地方。', 'determined']],
    question: '怎样整理公开变更簿？',
    choices: [
      { id: 'annotated-history', text: '保留原提交，显著附修复与背景说明；从默认页面移除个人归咎标签。', axes: { openness: 2, evidence: 3, solidarity: 1 }, result: [['github', '历史不被擦掉，羞辱也不再是默认索引。', 'happy'], ['gitlab', '复现包会指向权限链，不把一次点击写成全部原因。', 'calm']], ending: '原错误仍能被看见，旁边也站着完整修复和制度背景。公开记录开始服务于学习，而非围观。' },
      { id: 'sealed-identity', text: '公开完整技术差异，操作者身份由独立维护组限时保管并接受申诉。', axes: { safety: 2, evidence: 2, solidarity: 1 }, result: [['github', '匿名不能让责任消失，所以维护组和修复期限仍公开。', 'determined'], ['perplexity', '报告会区分未知身份与未知行为。', 'calm']], ending: '技术链完整公开，个人姓名暂时退到受审计的封条后。修复仍有公开的负责人和期限。' },
    ],
  },
  gitlab: {
    lines: [['gitlab', '复现舱能重放每一步。原日志也会暴露夜班员的账号、位置和临时密钥。', 'worried'], ['player', '删太多就无法核验，留太多会制造第二次事故。', 'thoughtful'], ['gitlab', '流水线喜欢把人变成变量。受伤的却总是具体的人。', 'sad'], ['gitlab', '我需要一份可以重放权限、不必重放身份的记录。', 'determined']],
    question: '复现包怎样开放？',
    choices: [
      { id: 'synthetic-replay', text: '以等价测试身份重建权限链，原日志由独立审计员封存核对。', axes: { safety: 3, evidence: 2 }, result: [['gitlab', '复现的是系统为何允许，不是某个人昨晚坐在哪里。', 'happy'], ['cloudflare', '测试令牌保持相同范围和期限，但不能触达生产。', 'calm']], ending: '流水线在沙盒里再次走错，证明故障仍在；一线操作者的真实身份没有被当成调试材料。' },
      { id: 'layered-logs', text: '公开脱敏轨迹与字段映射，授权复核人可按申请查看必要原段。', axes: { evidence: 3, openness: 1, safety: 1 }, result: [['gitlab', '每个黑框都说明遮住哪类信息，不让脱敏变成神秘消失。', 'determined'], ['perplexity', '引用会标明来自公开层还是受限核验。', 'calm']], ending: '日志分层进入证据链。公众能复现关键路径，必要的原始细节则经过有记录的窄门。' },
    ],
  },
  gitee: {
    lines: [['gitee', '中心在零点零三分修复。镜像七分钟后到达，夜校已经按旧手册开课。', 'worried'], ['player', '指标写着延迟七分钟。影响写着一堂课。', 'thoughtful'], ['gitee', '还有翻译。英文告警先到，中文操作说明更晚。', 'sad'], ['gitee', '镜像不是复印机，是有人生活的港口。', 'determined']],
    question: '怎样修复同步制度？',
    choices: [
      { id: 'impact-clock', text: '同时记录技术延迟与地方影响；高风险告警先发双语最小操作。', axes: { solidarity: 3, evidence: 2 }, result: [['gitee', '七分钟不会再被写成没有单位的漂亮数字。', 'happy'], ['doubao', '最小操作先用普通话说明，完整文档随后补齐。', 'calm']], ending: '钟楼出现两只表盘：一只计同步，一只记课程、带宽和人。它们终于属于同一份报告。' },
      { id: 'local-release', text: '镜像港保留暂停本地发布的权力，并向中心回传理由和恢复条件。', axes: { autonomy: 3, safety: 1, evidence: 1 }, result: [['gitee', '地方不是被动缓存。我们承担暂停的代价，也写明何时恢复。', 'determined'], ['harness', '路由器会显示本地版本状态，不把暂停误报为故障。', 'calm']], ending: '镜像港第一次能在风险抵达时自己关门，也必须把关门的理由和重新开门的条件送回群桥。' },
    ],
  },
  cloudflare: {
    lines: [['cloudflare', '紧急令要求我放行所有修复工具。范围写“事故相关”，期限为空。', 'worried'], ['player', '门无法执行一个价值判断。', 'thoughtful'], ['cloudflare', '我能验签、限流、撤销。不能替签发人决定“相关”有多远。', 'determined'], ['cloudflare', '事故是真的，模糊授权的危险也是真的。', 'sad']],
    question: '怎样处理紧急通行令？',
    choices: [
      { id: 'scoped-token', text: '退回补写工具清单、目标资源、调用上限与两小时到期；停机权限单列。', axes: { safety: 3, evidence: 2 }, result: [['cloudflare', '紧急不等于无边界。两小时后，门会要求新的决定。', 'happy'], ['opencode', 'Skill 会声明每次调用，不用“相关”替代权限。', 'calm']], ending: '修复令很快重发，范围更窄、时间可见。网关开门，也知道自己何时必须重新关上。' },
      { id: 'break-glass', text: '启用双人破窗授权立即放行，完整记录调用，并在三十分钟后自动降权。', axes: { safety: 2, solidarity: 2, evidence: 1 }, result: [['cloudflare', '门先救火，倒计时同时开始。恢复常态不需要等英雄主动归还钥匙。', 'determined'], ['harness', '事后复核会通知被影响的人，也允许他们质疑破窗范围。', 'calm']], ending: '两枚签名让修复越过紧急门。半小时后权限自动收回，英雄叙事没能把钥匙永久留下。' },
    ],
  },
})

const routeByKey = Object.freeze(Object.fromEntries(STORY_SIDE_ROUTES.map(route => [route.id, route])))

export function registerPhaseThree({ scene, n, o }) {
  for (const route of STORY_SIDE_ROUTES) {
    const script = copy[route.id]
    const rows = script.lines.map(([speaker, text, emotion]) => n(speaker, text, { emotion }))
    rows.push(n('player', script.question, {
      emotion: 'thoughtful',
      choices: script.choices.map((choice, index) => o(
        `${route.id}-${choice.id}`,
        choice.text,
        `${route.id}-route-${index === 0 ? 'a' : 'b'}-01`,
        { [`sideRoute:${route.id}`]: choice.id },
        choice.axes,
        { [route.character]: index === 0 ? 2 : 1 },
        [`route-${route.id}`],
        [`route-note-${route.id}`],
      )),
    }))
    scene('side-routes', `${route.id}-route`, route.location, '协议签署后的第一个月', route.summary, rows)
    script.choices.forEach((choice, index) => {
      const suffix = index === 0 ? 'a' : 'b'
      scene('side-routes', `${route.id}-route-${suffix}`, route.location, '同一时刻', route.summary, [
        ...choice.result.map(([speaker, text, emotion]) => n(speaker, text, { emotion })),
        n('narrator', choice.ending, { emotion: 'calm', sideEnding: { id: `${route.id}-${choice.id}`, title: `${route.title} · 支线完成`, description: choice.ending } }),
      ])
    })
  }
}

const CHAPTER_MUSIC = Object.freeze({
  prologue: 'title-city',
  'open-day': 'commons-atelier',
  laurel: 'claude-poem',
  'bridges-night': 'bridge-anomaly',
  'three-harbors': 'harbor-shift',
  'open-dome-hearing': 'glass-dome',
  'protocol-composition': 'bridge-anomaly',
  'six-endings': 'title-city',
})

export const STORY_MUSIC_THEMES = Object.freeze({
  'title-city': Object.freeze({ title: '千桥城序曲', caption: '钢琴、弦乐与远处港口钟声构成的城市主题。' }),
  'kimi-flute': Object.freeze({ title: '缺一拍的长笛', caption: 'Kimi 的长笛动机；完整旋律里保留了一次不自然的停顿。' }),
  'claude-poem': Object.freeze({ title: '未写完的下一行', caption: 'Claude 的诗句主题；羽管键与弦乐在应当收束处保持空白。' }),
  'bridge-anomaly': Object.freeze({ title: '第九拍没有抵达', caption: '千桥事故的异常节奏；节拍器、低音和回执铃彼此错开。' }),
  'commons-atelier': Object.freeze({ title: '公地工坊', caption: '木质打击、拨弦与轻快手风琴交替接力。' }),
  'glass-dome': Object.freeze({ title: '穹顶复核日', caption: '克制的玻璃琴与低弦，规律脉冲旁始终留着复核钟声。' }),
  'harbor-shift': Object.freeze({ title: '三港夜班', caption: '港口机械节奏与温暖木管交织的调查主题。' }),
})

function routeForNode(node) {
  return STORY_SIDE_ROUTES.find(route => node.id.startsWith(`${route.id}-route-`)) || null
}

export function storyPresentationFor(node) {
  const route = routeForNode(node)
  const backgroundId = route?.backgroundId || node.chapterId
  const musicTheme = route?.musicTheme || CHAPTER_MUSIC[node.chapterId] || 'title-city'
  let soundCue = null
  const text = typeof node.text === 'string' ? node.text : ''
  if (node.chapterId === 'bridges-night') {
    soundCue = Object.freeze({ id: 'bridge-anomaly', label: '节奏异常', description: '节拍与回执时间没有对齐；这处不协和可能属于千桥事故证据链。' })
  } else if (node.speaker === 'kimi' || /长笛|完整录音|缺拍/.test(text)) {
    soundCue = Object.freeze({ id: 'kimi-flute', label: '长笛线索', description: '同一段长笛再次出现；留意旋律中的停顿和它前后的语境。' })
  } else if (node.speaker === 'claude' && /桥|诗|下一行|署名|空白/.test(text)) {
    soundCue = Object.freeze({ id: 'claude-verse', label: '诗句线索', description: 'Claude 的未完成诗句再次出现；这次由她自己决定下一行是否存在。' })
  } else if (/事故录音|第九秒|节拍|拍号冲突|时钟/.test(text)) {
    soundCue = Object.freeze({ id: 'bridge-anomaly', label: '节奏异常', description: '节拍与回执时间没有对齐；这处不协和可能属于千桥事故证据链。' })
  }
  return Object.freeze({ backgroundId, musicTheme, soundCue })
}

export function sideRouteForId(id) {
  return routeByKey[id] || null
}
