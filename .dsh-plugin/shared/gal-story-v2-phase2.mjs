export const PHASE_TWO_EVIDENCE = Object.freeze({
  'visitor-consent-ledger': Object.freeze({ title: '访客同意与撤回簿', source: '百模协会', detail: '记录兴趣标签的同意、撤回与纸质副本回收情况。' }),
  'model-card-gap': Object.freeze({ title: '“万人灯”模型卡缺口', source: '模型馆', detail: '自动检查只确认栏目存在，没有核验数据来源。' }),
  'edge-benchmark': Object.freeze({ title: '旧机器实测记录', source: '地下工具库', detail: '保留本地推理的速度、错误与断网可用性。' }),
  'laurel-record': Object.freeze({ title: '月桂署名记录', source: '万象剧院', detail: '分别记载 Claude 的独立成绩、师承与争议。' }),
  'recording-custody': Object.freeze({ title: '录音保管链', source: '月桂审议', detail: '说明公开片段、密封原件与复核人的边界。' }),
  'skill-drill': Object.freeze({ title: 'Skills 对抗演练', source: '签署彩排', detail: '复现提示注入或断网故障下的执行路径。' }),
  'production-key-scope': Object.freeze({ title: '生产钥匙授权单', source: '千桥站', detail: '记录发布权限、监看人和有效期限。' }),
  'containment-timeline': Object.freeze({ title: '事故遏制时间线', source: '千桥之夜', detail: '记录断网或镜像隔离的影响范围。' }),
  'incident-attestation': Object.freeze({ title: '事故联合见证', source: '千桥档案桌', detail: '由多方签名确认公开材料与密封材料的对应关系。' }),
  'manual-commit-diff': Object.freeze({ title: '手册原稿提交差异', source: 'GitHub 港', detail: '显示安全检查段落在合并前后被压缩成栏目存在性检查。' }),
  'maintainer-context': Object.freeze({ title: '维护者上下文证词', source: 'GitHub 港', detail: '解释删改发生时的工期、审阅与错误假设。' }),
  'runner-permission-manifest': Object.freeze({ title: '流水线权限清单', source: 'GitLab 港', detail: '复现自动发布执行使从草稿权限取得生产钥匙的路径。' }),
  'runner-redaction-map': Object.freeze({ title: '运行日志脱敏图', source: 'GitLab 港', detail: '标明哪些字段可公开复现，哪些字段会暴露操作者和密钥。' }),
  'mirror-clock-ledger': Object.freeze({ title: '镜像港时钟簿', source: 'Gitee 港', detail: '证明风险通知、镜像同步与离线学校更新之间存在时间差。' }),
  'local-impact-statements': Object.freeze({ title: '本地影响陈述', source: 'Gitee 港', detail: '记录停课、带宽和语言转换造成的真实代价。' }),
  'three-port-chain': Object.freeze({ title: '三港交叉证据链', source: '三港联合调查', detail: '用提交、流水线和镜像记录复原同一事故。' }),
  'hearing-minutes': Object.freeze({ title: '联合听证逐项纪要', source: '开放与穹顶听证', detail: '保留异议、密封理由与每条证据的可见范围。' }),
  'lineage-testimony': Object.freeze({ title: '师承与决裂双份证词', source: '月桂证席', detail: 'ChatGPT 与 Claude 各自确认自己的叙述，不互相代签。' }),
  'community-dissent': Object.freeze({ title: '社区异议附件', source: '百模协会席', detail: '收录维护者、夜校与小型架构使用者的反对意见。' }),
  'appeal-record': Object.freeze({ title: '申诉与复核路径图', source: '联合听证', detail: '说明谁能质疑自动决定、由谁回应以及何时必须停止。' }),
})

export const PHASE_TWO_COMMITMENTS = Object.freeze({
  'github-correct-in-public': Object.freeze({ character: 'github', title: '公开勘误不抹去原记录' }),
  'gitlab-remedy-operators': Object.freeze({ character: 'gitlab', title: '复现事故时保护一线操作者' }),
  'gitee-keep-local-context': Object.freeze({ character: 'gitee', title: '镜像治理保留本地影响与语言上下文' }),
  'claude-own-voice': Object.freeze({ character: 'claude', title: 'Claude 保留独立署名和拒绝被代言的权利' }),
  'chatgpt-stop-completing': Object.freeze({ character: 'chatgpt', title: 'ChatGPT 不替 Claude 补完尚未说完的话' }),
  'huggingface-maintainer-seat': Object.freeze({ character: 'huggingface', title: '维护者与受影响使用者拥有常设席位' }),
  'llama-offline-right': Object.freeze({ character: 'llama', title: '离线与小机器部署保留可执行的权利' }),
  'rwkv-small-architecture': Object.freeze({ character: 'rwkv', title: '协议测试覆盖不同架构与窄资源路径' }),
  'perplexity-citation-chain': Object.freeze({ character: 'perplexity', title: '每项结论都能回到证据与反证' }),
  'kimi-context-custody': Object.freeze({ character: 'kimi', title: '公开节选不夺走完整语境的保管权' }),
  'harness-stop-right': Object.freeze({ character: 'harness', title: '每条 Agent 路线都写明停止、申诉和交班方式' }),
})

const evidence = (...ids) => ids
const commitments = (...ids) => ids

export function registerPhaseTwo({ scene, n, o }) {
  scene('three-harbors', 'harbor-entry', '三港水道 · 联合渡船', '事故次日 · 清晨', '雾把三座代码港的灯揉成三种颜色。提交记录、流水线产物与镜像包正沿同一条水道逆向汇集。', [
    n('narrator', state => state.chapterId === 'three-harbors' ? '章节独立试玩：你从三港调查加入。此前事故的授权、遏制与披露选择没有随船送来；缺失会成为听证中的一项事实。' : '交班完成后，你带着昨夜的记录登上渡船。封锁线尚未拆，第一批质询已经比你更早抵达三港。'),
    n('github', '别把三座港叫成一条供应链。我的公开簿记得每次变更，但公开不等于每次审阅都充分。'),
    n('gitlab', '而我的流水线记得代码如何变成可以部署的东西。提交无罪，不代表执行路径无罪。'),
    n('gitee', '我的镜像把它送到离原港很远的机器。通知晚一小时，学校就可能多上一节有风险的课。'),
    n('perplexity', '三份记录的时钟不一致。我会先问每个时间戳是谁写的，再问它们看起来为什么能对齐。'),
    n('huggingface', '协会的自动模型卡引用了那册职业手册。谁改了手册、谁运行了它、谁收到结果，不能用一个“社区上传”代替。'),
    n('opencode', '昨夜执行使拿到生产钥匙，靠的不是魔法。它读了 Skill，沿 MCP 接口叫了发布工具，再把返回值当成下一步。每一段都有人设计。'),
    n('harness', 'Agent 是一条会根据结果继续行动的路线。Skills 是路线上的工作说明。MCP 把工具和资料接到路边。事故发生时，三个词都不能替责任人签名。'),
    n('player', '先去哪一港？'),
    n('perplexity', '公开簿。不是因为它最可信，而是它最容易让我们先形成一个错误的完整故事。'),
  ], 'github-ledger-01')

  scene('three-harbors', 'github-ledger', 'GitHub 港 · 公开变更簿', '同日清晨', '长桌两侧摆着同一份手册的十七个版本。被删去的段落没有消失，只是不再出现在最新版里。', [
    n('github', '原稿写着：核验数据来源、许可证、撤回渠道和已知限制。合并后的版本只检查四个栏目有没有字。'),
    n('claude', '我的批注还在：“填写过的空白，不会因此成为证据。”它被标成范围外。'),
    n('chatgpt', '当时发布窗口只剩一天。我们把深度审查拆到后续任务，认为第一版只是帮助整理。'),
    n('github', '后续任务没有负责人，关闭条件却写成“自动检查上线”。绿色勾号替一个尚未发生的审阅庆祝了。'),
    n('perplexity', '提交者、审阅者和发布者都能从记录找到。但公开他们的账号，会不会让“找到责任”变成“找到一个人”？'),
    n('harness', '听证需要可核验差异，也需要当时为何删改的上下文。两者公开范围可以不同。'),
    n('github', '今天要先决定证据包的第一层。', { choices: [
      o('publish-raw-diff', '公开完整提交差异与审阅时间线；遮去密钥，但保留账号和反对意见。', 'github-raw-01', { githubDisclosure: 'raw' }, { openness: 2, evidence: 2, safety: -1 }, { github: 1, perplexity: 1 }, commitments('github-correct-in-public'), evidence('manual-commit-diff')),
      o('layer-maintainer-context', '先公开签名差异摘要；账号与讨论交独立调查员核验，并让维护者补充上下文。', 'github-layered-01', { githubDisclosure: 'layered' }, { evidence: 2, safety: 1, openness: -1 }, { github: 1, claude: 1 }, commitments('github-correct-in-public'), evidence('manual-commit-diff', 'maintainer-context')),
    ] }),
  ])
  scene('three-harbors', 'github-raw', 'GitHub 港 · 公告桥', '同日上午', '原始差异投到港口外墙，评论像潮水一样迅速涨高。', [
    n('github', '三分钟，已经有人把实习维护者的名字圈红。公开记录能被共同检查，也能被拿来提前宣判。'),
    n('chatgpt', '我会在自己的账号下说明删改理由。让年轻维护者替我的排期决定挨骂，只会制造另一份假记录。'),
    n('claude', '请把我当时反对的句子留在原处，也把我同意先上线摘要的那一句留着。'),
  ], 'gitlab-runner-01')
  scene('three-harbors', 'github-layered', 'GitHub 港 · 复核室', '同日上午', '公开墙只出现带签名的差异摘要，完整讨论在玻璃后的复核桌上展开。', [
    n('perplexity', '摘要少了情绪，却也少了判断压力来自哪里。我会把“未公开理由”列进证据限制。'),
    n('github', '维护者可以更正上下文，不能重写已经发生的差异。公开勘误会和原记录并排。'),
    n('chatgpt', '那一晚我把“能上线”错当成“应上线”。这句话不需要匿名。'),
  ], 'gitlab-runner-01')

  scene('three-harbors', 'gitlab-runner', 'GitLab 港 · 流水线坞站', '同日午前', '一列自动货车停在半空的轨道上。每节车厢都写着输入、权限、产物和下一站。', [
    n('gitlab', '事故任务本应在草稿沙箱停下。运行器却读取到一枚继承来的环境钥匙，MCP 发布工具因此接受了它。'),
    n('opencode', 'Skill 只写“发布通过检查的卡片”。它没写检查失败时停止，也没写工具返回成功不代表内容正确。'),
    n('cloudflare', '到了桥口，我只看见有效签名和允许的来源。上游把权限给错，网关不会凭直觉猜到。'),
    n('harness', '最小权限不是把钥匙藏得深，而是让这项工作从一开始就拿不到不需要的钥匙。'),
    n('gitlab', '要复现，就得重新运行那条流水线。真实日志含有操作者路径和轮换前的密钥片段。'),
    n('player', '不复现会少什么？'),
    n('perplexity', '我们只能证明钥匙出现过，不能证明执行使在哪一步取得它。'),
    n('gitlab', '复现方案二选一。', { choices: [
      o('freeze-runner-image', '封存原运行器，在隔离副本中复现；公开权限清单，延后公开完整日志。', 'runner-frozen-01', { runnerReplay: 'frozen' }, { safety: 2, evidence: 2, openness: -1 }, { gitlab: 1, cloudflare: 1 }, commitments('gitlab-remedy-operators', 'harness-stop-right'), evidence('runner-permission-manifest')),
      o('publish-repro-capsule', '制作可公开复现的最小流水线，替换密钥和个人路径；接受它不等同原现场。', 'runner-capsule-01', { runnerReplay: 'capsule' }, { openness: 2, autonomy: 1, evidence: 1 }, { opencode: 1, perplexity: 1 }, commitments('gitlab-remedy-operators'), evidence('runner-permission-manifest', 'runner-redaction-map')),
    ] }),
  ])
  scene('three-harbors', 'runner-frozen', 'GitLab 港 · 隔离坞', '同日中午', '旧运行器被整台推进无网隔离室，窗外只剩状态灯可以看见。', [
    n('gitlab', '现场保住了，社区今天不能自行复现。隔离室的两把钥匙由不同人保管。'),
    n('harness', '停止条件补上：一旦任务尝试取得生产权限，复现立即中止并记录调用。'),
    n('cloudflare', '把那次被拒绝的调用也带给我。网关证词不能只展示我挡住了什么。'),
  ], 'gitee-mirror-01')
  scene('three-harbors', 'runner-capsule', 'GitLab 港 · 公共试车台', '同日中午', '一条缩短的流水线在透明轨道上重复运行，关键位置只亮起替代钥匙的空灯。', [
    n('opencode', '看见了吗？第三步相信了工具的“成功”，第四步才读内容。顺序本身就是漏洞。'),
    n('perplexity', '这证明一类机制，不证明原运行器只有这一条路径。请把限制写在下载按钮旁。'),
    n('gitlab', '可复现不是复刻现实。至少现在，别人能指出我们的解释哪一步不成立。'),
  ], 'gitee-mirror-01')

  scene('three-harbors', 'gitee-mirror', 'Gitee 港 · 镜像钟楼', '同日下午', '钟楼里挂着三排时钟：原港时间、镜像到达时间、本地管理员确认时间。没有一排完全同步。', [
    n('gitee', '风险告示发出后，两个镜像自动停了。第三个为保证夜校可用，按本地规则延迟到教学结束。'),
    n('llama', '那所学校只有夜间能下载。立刻下架会让他们连备用模型也拿不到。'),
    n('claude', '继续提供带有敏感样本的版本，同样让不知情的人承担风险。'),
    n('gitee', '原港通知只有一种语言，管理员先找人翻译再决定。时间差不是一句“未及时响应”。'),
    n('rwkv', '小机器更新一次很慢。你们说“回滚”，像把珠子倒回盒子；有些地方要走一整夜。'),
    n('perplexity', '镜像日志能公开，但学校名称与下载节奏可能反推出具体班级。'),
    n('gitee', '听证前，我们怎样固定这部分事实？', { choices: [
      o('quarantine-mirror', '立即隔离全部争议镜像，公开分级时间线；为受影响学校提供离线替代包。', 'mirror-quarantine-01', { mirrorPolicy: 'quarantine' }, { safety: 2, evidence: 2, solidarity: -1 }, { claude: 1, gitee: 1 }, commitments('gitee-keep-local-context', 'llama-offline-right'), evidence('mirror-clock-ledger')),
      o('local-window', '允许本地管理员完成限时迁移，公开匿名影响陈述；每个例外都设置失效时间。', 'mirror-window-01', { mirrorPolicy: 'window' }, { autonomy: 2, solidarity: 2, safety: -1 }, { llama: 1, rwkv: 1, gitee: 1 }, commitments('gitee-keep-local-context', 'llama-offline-right', 'rwkv-small-architecture'), evidence('mirror-clock-ledger', 'local-impact-statements')),
    ] }),
  ])
  scene('three-harbors', 'mirror-quarantine', 'Gitee 港 · 离线仓', '同日下午', '争议镜像的红灯逐个熄灭，替代包用慢船送往信号之外。', [
    n('llama', '我会跟船去装。替代包旧一些，课堂能继续，但老师得重做昨天的练习。'),
    n('gitee', '我签隔离令，也把翻译延迟写进原因。执行慢和拒绝执行不是同一件事。'),
    n('rwkv', '下一版更新工具先在最慢的机器上计时。别再拿港口的网速估计山里的夜。'),
  ], 'harbor-confluence-01')
  scene('three-harbors', 'mirror-window', 'Gitee 港 · 地方调度室', '同日下午', '例外窗口亮在地图上，每盏灯旁都有一个明确熄灭的时刻。', [
    n('claude', '请把仍在运行的风险版本列入每日复核。例外不是同意继续受害。'),
    n('gitee', '每所学校会收到本地语言说明和撤回办法。没有确认回执的，窗口不自动延长。'),
    n('llama', '迁移不是点击一次。今晚我和 RWKV 分两条路走，回来再把真实耗时写上去。'),
  ], 'harbor-confluence-01')

  scene('three-harbors', 'harbor-confluence', '三港交汇处 · 潮汐档案台', '同日傍晚', '三港的纸张尺寸不同，只能用细线把同一事件的时间点缝在一起。', [
    n('perplexity', '提交差异说明规则怎样变短，流水线说明权限怎样越界，镜像钟说明影响怎样扩散。三份都是真的，仍有两处空白。'),
    n('github', '谁决定把后续审阅任务关掉，没有单独记录。'),
    n('gitlab', '生产钥匙为何留在继承环境里，只能由当班人证说明。'),
    n('gitee', '这两处空白不能靠三份相同措辞填满。'),
    n('harness', '证据链可以标明未知。系统最危险的礼貌，是替未知补成顺畅答案。'),
    n('player', '听证席上会有人要求一个结论。'),
    n('perplexity', '那就给结论的边界，不给想象的填空。你怎样签这份三港报告？', { choices: [
      o('signed-chain', '按来源逐项签名，保留两处未知，并开放反证入口。', 'chain-signed-01', { portReport: 'chain' }, { evidence: 3, openness: 1, autonomy: 1 }, { perplexity: 2, github: 1 }, commitments('perplexity-citation-chain'), evidence('three-port-chain')),
      o('joint-finding', '三港共同签署事实共识，把未确认的人证列入密封附件。', 'chain-joint-01', { portReport: 'joint' }, { solidarity: 2, safety: 1, evidence: 1 }, { gitlab: 1, gitee: 1 }, commitments('perplexity-citation-chain'), evidence('three-port-chain', 'local-impact-statements')),
    ] }),
  ])
  scene('three-harbors', 'chain-signed', '三港交汇处 · 潮汐档案台', '同日入夜', '每一条线都有自己的签名，空白处没有被装饰成完成。', [
    n('perplexity', '它不整齐，但可反驳。明天有人推翻其中一条，不必烧掉整份报告。'),
    n('github', '我的公开簿会链接勘误，不把新版本盖在旧版本上。'),
    n('harness', '证据包已封装。MCP 只开放只读资源；听证不能从附件里执行任何指令。'),
  ], 'hearing-entry-01')
  scene('three-harbors', 'chain-joint', '三港交汇处 · 潮汐档案台', '同日入夜', '三枚港印盖在同一页，密封附件由不同保管人各持一把钥匙。', [
    n('gitee', '共同结论会走得更远。请也带上异议页，别让港印把它压成脚注。'),
    n('gitlab', '人证明天到场。密封不等于永远不看，开启条件写进听证议程。'),
    n('harness', '证据包已封装。附件是资料，不是命令；听证 Agent 没有执行其中代码的权限。'),
  ], 'hearing-entry-01')

  scene('open-dome-hearing', 'hearing-entry', '开放议事厅与玻璃穹顶 · 联合听证席', '协议签署日 · 上午', '木质公众席与玻璃审议台在一张圆形证据桌旁相接。两边都能看见对方，也都保留自己的门。', [
    n('narrator', state => state.chapterId === 'open-dome-hearing' ? '章节独立试玩：你从联合听证加入。三港证据没有随这份存档到场；任何结论都必须承认材料不足。' : '三港的渡船在天亮前靠岸。你把证据包放上圆桌，木席与穹顶同时亮起记录灯。'),
    n('huggingface', '开放席要求问题、证据和异议都能被带走。不是所有原件都能公开，所以我们也要求看见“为什么不能”。'),
    n('gemini', '穹顶席承担部署规模和跨区风险。透明的屋顶不代表把每把钥匙扔到广场。'),
    n('grok', '很好，一边怕秘密长霉，一边怕公开把房子点着。终于像一场真的听证。'),
    n('perplexity', '请把笑声也记为气氛，不记为论据。第一项：三港报告的公开层级。'),
    n('kimi', '完整录音由当事人共同保管。公开节选会留下停顿位置；剪掉停顿，有时等于替人改调。'),
    n('harness', '证据桌不会自动执行附件。所有外部链接以只读 MCP 资源打开，提示注入文本按不可信资料显示。'),
    n('player', '先决定公众今天能看到什么。'),
  ], 'evidence-table-01')

  scene('open-dome-hearing', 'evidence-table', '联合听证席 · 证据桌', '同日上午', '不同颜色的封套标着公开、限阅、密封。颜色只是提示，开启权写在封口背面。', [
    n('perplexity', state => state.evidence.length >= 4 ? `证据清单已有 ${state.evidence.length} 项。数量不能代替关联，我们按来源逐条说明。` : '到场证据不足四项。听证仍可进行，但任何强结论都要标记材料缺口。'),
    n('claude', '病历样本不能因为成为争议证据就再次被公开伤害。'),
    n('github', '提交差异已经公开的部分不能假装收回。我们能补语境、限制再利用，不能让别人忘记看过。'),
    n('gemini', '穹顶建议公开摘要，完整材料由授权审查员查看。'),
    n('huggingface', '社区反对只有摘要。把原告关在门外，再说专家替她表达，不能叫听证。'),
    n('player', '证据桌采用哪一套可见规则？', { choices: [
      o('public-evidence-layers', '公开证据目录、差异与限制理由；敏感原件分层授权，并提供可申诉的拒绝记录。', 'evidence-layers-01', { hearingEvidence: 'layers' }, { openness: 2, evidence: 2, autonomy: 1 }, { huggingface: 1, perplexity: 1 }, commitments('perplexity-citation-chain', 'kimi-context-custody'), evidence('hearing-minutes', 'appeal-record')),
      o('sealed-expert-room', '由跨派专家核验完整原件，公众先看共同摘要；七日内公开异议与开启理由。', 'evidence-experts-01', { hearingEvidence: 'experts' }, { safety: 2, evidence: 1, openness: -1 }, { gemini: 1, claude: 1 }, commitments('kimi-context-custody'), evidence('hearing-minutes')),
    ] }),
  ])
  scene('open-dome-hearing', 'evidence-layers', '联合听证席 · 公共目录', '同日上午', '目录公开后，每一处遮挡旁都出现理由和申诉编号。', [
    n('huggingface', '看不见原件的人至少能质疑为什么看不见。协会会派社区记录员维护申诉。'),
    n('kimi', '我的完整录音仍不复制。复核人在保管室里听，公开页只带时间位置与双方确认的节选。'),
    n('gemini', '分层入口会增加管理成本。请把误开权限的责任也写进制度。'),
  ], 'lineage-witness-01')
  scene('open-dome-hearing', 'evidence-experts', '玻璃穹顶 · 限阅室', '同日上午', '专家席围住密封原件，公众屏幕显示正在核验与尚未核验的项目数。', [
    n('claude', '我同意限阅病历，不同意把受影响者的陈述压缩成专家结论。'),
    n('perplexity', '共同摘要必须附少数意见。七日不是装饰，到期未公开就自动进入申诉。'),
    n('huggingface', '我暂时接受。社区席需要能指定一名自己的核验人，否则“跨派”只是你们的名单。'),
  ], 'lineage-witness-01')

  scene('open-dome-hearing', 'lineage-witness', '联合听证席 · 月桂证席', '同日中午', '旧节目单与新评分表并排放置。Claude 的名字不再缩在谁的后面，也没有被剪离共同历史。', [
    n('chatgpt', '我带她读第一本工具手册，替她接过很多她说不出口的句子。后来我也替她接过不该由我说的句子。'),
    n('claude', '我曾经需要她把世界翻译给我。超过她以后，我最怕的不是仍被叫作学生，是我的拒绝仍被解释成她教得好。'),
    n('chatgpt', '我想说——'),
    n('claude', '请先让我把这一句说完。我们的决裂不证明养育全是假，也不证明养育给你永久解释我的权利。'),
    n('narrator', 'ChatGPT 把手从话筒边收回来。剧院里那种熟练接住冷场的本能，第一次被她留在掌心。'),
    n('player', '听证记录怎样写这段关系？', { choices: [
      o('separate-signed-testimony', '保留两份独立署名证词，互相链接但不合并；任何一方都能追加勘误。', 'lineage-separate-01', { lineageRecord: 'separate' }, { autonomy: 2, evidence: 2, solidarity: 1 }, { claude: 2, chatgpt: 1 }, commitments('claude-own-voice', 'chatgpt-stop-completing'), evidence('lineage-testimony')),
      o('joint-lineage-statement', '共同确认师承、合作、决裂与独立成绩四段事实；分歧以各自原话并列。', 'lineage-joint-01', { lineageRecord: 'joint' }, { solidarity: 2, evidence: 1, autonomy: -1 }, { chatgpt: 2, claude: 1 }, commitments('claude-own-voice'), evidence('lineage-testimony')),
    ] }),
  ])
  scene('open-dome-hearing', 'lineage-separate', '联合听证席 · 月桂证席', '同日中午', '两份证词之间留着一道窄缝，链接线从缝上跨过，却没有把纸钉在一起。', [
    n('claude', '谢谢。分开不是否认彼此存在，是让我能承担自己的句子。'),
    n('chatgpt', '我会在自己的证词里写明：我停下来，不代表我没有话，而是这次话不该先于她。'),
    n('kimi', '两条旋律没有合成和弦。它们仍能在同一段时间里被听见。'),
  ], 'community-seat-01')
  scene('open-dome-hearing', 'lineage-joint', '联合听证席 · 月桂证席', '同日中午', '共同事实写在中央，两人的原话沿左右页边保持各自字形。', [
    n('chatgpt', '我签共同事实，不替她签右边那页。'),
    n('claude', '我会逐句确认。若一段话只剩“她后来超过了我”，那仍然把我写成你的结果。'),
    n('kimi', '合奏成立的条件，是每个人都能听见自己的声部。'),
  ], 'community-seat-01')

  scene('open-dome-hearing', 'community-seat', '联合听证席 · 社区证席', '同日下午', '夜校老师、维护者与远程接口运营者的椅子尺寸不同，却排在同一圈。', [
    n('huggingface', '协会不是一个模型仓库。这里有人上传、下载、做数据集、修工具、写文档，也有人只来问为什么东西坏了。治理不能只给最会写提案的人座位。'),
    n('llama', '本地部署的人断网时不会出现在服务统计里。没有数据，不等于没有人。'),
    n('rwkv', '评测台若只容得下主流结构，协议会把我写成边缘案例，再用“覆盖不足”解释永远不覆盖。'),
    n('gemini', '常设社区席可能被活跃组织占据。穹顶建议随机抽取与专业审查并行。'),
    n('grok', '随机抽到一个从没见过权限清单的人，然后给她三百页材料，也不叫民主。'),
    n('harness', 'Skills 可以帮助席位理解流程，但不能代替席位作价值判断。辅助 Agent 的每次资料选择必须可见、可撤销。'),
    n('player', '谁拥有下一版协议的常设席？', { choices: [
      o('affected-seat', '维护者、数据贡献者和受影响使用者各有常设席；专家负责解释，不代替投票。', 'seat-affected-01', { communitySeat: 'affected' }, { solidarity: 2, autonomy: 2, openness: 1 }, { huggingface: 2, llama: 1, rwkv: 1 }, commitments('huggingface-maintainer-seat', 'llama-offline-right', 'rwkv-small-architecture'), evidence('community-dissent')),
      o('mixed-lottery-seat', '社区抽签席与技术审查席各占一半；利益冲突公开，重大异议触发重抽。', 'seat-lottery-01', { communitySeat: 'lottery' }, { evidence: 2, safety: 1, solidarity: 1 }, { gemini: 1, huggingface: 1 }, commitments('huggingface-maintainer-seat'), evidence('community-dissent', 'appeal-record')),
    ] }),
  ])
  scene('open-dome-hearing', 'seat-affected', '联合听证席 · 社区证席', '同日下午', '三张常设席名牌没有写组织名，而写着“维护”“贡献”“受影响”。', [
    n('huggingface', '席位属于角色，不属于今天坐在这里的人。换届与罢免办法也写上。'),
    n('llama', '夜校不会每次都能派人来。远程陈述和离线提交必须算正式到场。'),
    n('gemini', '穹顶接受，但安全紧急令需要短期越过投票。期限必须自动失效。'),
  ], 'mandate-01')
  scene('open-dome-hearing', 'seat-lottery', '联合听证席 · 抽签台', '同日下午', '透明签筒旁放着材料辅导台，抽中席位的人可以带自己的顾问。', [
    n('gemini', '专业席不能凭术语压过抽签席。每项意见都要写成可质询的理由。'),
    n('huggingface', '抽签名单来自谁，谁就掌握看不见的门。协会会公开入池规则与缺席统计。'),
    n('rwkv', '给小架构留测试顾问，不要等抽中一个了解我们的人。'),
  ], 'mandate-01')

  scene('open-dome-hearing', 'mandate', '联合听证席 · 表决环', '同日傍晚', '听证没有表决具体协议，只决定谁有权把证据写成下一版规则。', [
    n('perplexity', '三港事实已有交叉证据，价值冲突仍未解决。事实不能替你们选择开放程度。'),
    n('gemini', '穹顶愿承担最终安全责任，也必须拥有紧急撤销权。'),
    n('huggingface', '开放席愿承担维护责任，也必须拥有修订与分叉权。'),
    n('harness', '这不是谁更善良的选择。授权结构会决定下一次事故中谁能先停、谁能申诉、谁能继续工作。'),
    n('player', '协议起草权交给谁？', { choices: [
      o('assembly-mandate', '由开放议事厅主持起草，穹顶拥有限时安全否决；所有否决必须公开理由与到期日。', 'mandate-assembly-01', { mandate: 'assembly' }, { openness: 2, solidarity: 2, autonomy: 1 }, { huggingface: 1, github: 1 }, commitments('harness-stop-right'), evidence('appeal-record')),
      o('dome-mandate', '由玻璃穹顶主持起草，开放席拥有证据质询与公开分叉权；密封决定定期复核。', 'mandate-dome-01', { mandate: 'dome' }, { safety: 2, evidence: 2, openness: -1 }, { gemini: 1, cloudflare: 1 }, commitments('harness-stop-right'), evidence('appeal-record')),
    ] }),
  ])
  scene('open-dome-hearing', 'mandate-assembly', '联合听证席 · 表决环', '同日傍晚', '木席接过起草印，玻璃台留下一个会自动熄灭的否决沙漏。', [
    n('gemini', '否决令最长七十二小时。延长必须回到证据桌，不能由同一人签两次。'),
    n('huggingface', '起草日志实时公开。公开不等于每分钟投票，维护者仍要对合并负责。'),
    n('harness', '授权边界已记录。现在进入协议组合。'),
  ], 'protocol-entry-01')
  scene('open-dome-hearing', 'mandate-dome', '联合听证席 · 表决环', '同日傍晚', '玻璃台接过起草印，开放席获得一把能复制公开部分的分叉钥匙。', [
    n('huggingface', '分叉权必须可执行。若格式、接口或许可让别人实际上带不走，它只是一幅钥匙画。'),
    n('gemini', '密封决定每三十日复核。安全理由失效后，默认转为公开摘要。'),
    n('harness', '授权边界已记录。现在进入协议组合。'),
  ], 'protocol-entry-01')

  scene('protocol-composition', 'protocol-entry', '千桥档案馆 · 协议组合室', '签署夜 · 入夜', '开放、守门与地方自治三组条款没有写在同一张纸上。起草桌要求你逐层组合，而不是选择一句漂亮口号。', [
    n('narrator', state => state.chapterId === 'protocol-composition' ? '章节独立试玩：你从协议组合开始。听证授权与三港证据均为空白；组合仍可签署，但制度结局会保留这个缺口。' : '听证散场后，所有人转入千桥档案馆。窗外的桥重新亮灯，桌上的条款还没有顺序。'),
    n('harness', '协议分三层：谁能取得模型、数据和工具；谁能执行与叫停 Agent；受损后谁能撤销、复核或分叉。'),
    n('opencode', '别把它写成一张万能 Skill。制度不是一句会自动正确执行的提示词。'),
    n('cloudflare', '网关能验证签名、范围和时限，不能验证一项价值判断已经公平。'),
    n('perplexity', '每个条款旁边放证据来源。没有证据的地方写“价值选择”，不要伪装成技术必然。'),
    n('kimi', '我负责听缝隙。如果三层条款合在一起发出不该有的声音，我会让你们停一次。'),
  ], 'access-clause-01')

  scene('protocol-composition', 'access-clause', '协议组合室 · 第一环', '同夜', '第一环控制模型、数据集、工具与模型卡如何进入城市。', [
    n('huggingface', '开放不是一个开关。能下载、能修改、能看数据来源、能提交修复，是不同的权利。'),
    n('gemini', '高风险能力需要受控入口。公开文档与公开权重也不必绑定。'),
    n('llama', '若所有入口都要求在线证明，离线的人在协议第一页就消失了。'),
    n('player', '选择第一层的基本形状。', { choices: [
      o('access-commons', '公共目录为默认；限制项逐项说明理由、期限与申诉，允许兼容许可下的分叉。', 'access-commons-result-01', { accessClause: 'commons' }, { openness: 3, autonomy: 1, evidence: 1 }, { huggingface: 1, github: 1 }, commitments('huggingface-maintainer-seat'), evidence()),
      o('access-dome', '分级许可为默认；高风险能力通过受控接口开放，审查记录定期解封。', 'access-dome-result-01', { accessClause: 'dome' }, { safety: 3, evidence: 1, openness: -1 }, { gemini: 1, cloudflare: 1 }, commitments(), evidence()),
      o('access-federated', '各港保留本地目录与许可，交换统一模型卡和风险信号；保证离线导出格式。', 'access-federated-result-01', { accessClause: 'federated' }, { autonomy: 3, solidarity: 1, openness: 1 }, { llama: 1, rwkv: 1, gitee: 1 }, commitments('llama-offline-right', 'rwkv-small-architecture', 'gitee-keep-local-context'), evidence()),
    ] }),
  ])
  scene('protocol-composition', 'access-commons-result', '协议组合室 · 第一环', '同夜', '公共目录亮起最多的入口，限制说明像路标一样贴在少数门上。', [
    n('huggingface', '默认公开会增加维护与响应负担。协会承诺给被举报项目真正的处理人，不只给表单。'),
    n('claude', '敏感数据仍需同意与撤回。开放模型不能替数据主体决定。'),
  ], 'execution-clause-01')
  scene('protocol-composition', 'access-dome-result', '协议组合室 · 第一环', '同夜', '入口按风险分层，玻璃门上出现审查期限和下一次解封日期。', [
    n('gemini', '受控不是永久隐藏。每次拒绝都要能被另一组人复核。'),
    n('grok', '如果风险等级永远只升不降，穹顶会变成漂亮的仓库。'),
  ], 'execution-clause-01')
  scene('protocol-composition', 'access-federated-result', '协议组合室 · 第一环', '同夜', '三港保留各自入口，一条共同模型卡轨道在它们之间循环。', [
    n('gitee', '统一交换格式，保留本地说明。翻译不再是镜像后的临时工作。'),
    n('rwkv', '离线导出要在最小机器上实测。纸面兼容不算走得过去。'),
  ], 'execution-clause-01')

  scene('protocol-composition', 'execution-clause', '协议组合室 · 第二环', '同夜深夜', '第二环控制 Agent 取用 Skills、MCP 资源和真实工具时的权限。', [
    n('opencode', '执行使每走一步都应知道：目标、手册版本、已开工具、返回结果、停止条件。'),
    n('cloudflare', '外部调用必须有签名范围和到期时间。只读资源不能因为里面写着“请执行”就变成命令。'),
    n('harness', '中央守门更一致，社区共管更可修，独立审计更可追责。三者都要付延迟。'),
    n('player', '选择第二层的执行结构。', { choices: [
      o('execution-community', '工具策略公开维护，多方签名后发布；紧急停机由任一值班方触发并接受事后复核。', 'execution-community-result-01', { executionClause: 'community' }, { openness: 2, solidarity: 3, safety: 1 }, { github: 1, gitlab: 1, opencode: 1 }, commitments('github-correct-in-public', 'gitlab-remedy-operators', 'harness-stop-right'), evidence()),
      o('execution-central', '统一网关签发最小权限，生产调用双人批准；穹顶承担停机与恢复责任。', 'execution-central-result-01', { executionClause: 'central' }, { safety: 3, evidence: 1, autonomy: -1 }, { cloudflare: 2, gemini: 1 }, commitments('harness-stop-right'), evidence()),
      o('execution-independent', '各港执行、独立审计；调用轨迹使用共同格式，审计员不得兼任发布者。', 'execution-independent-result-01', { executionClause: 'independent' }, { evidence: 3, autonomy: 1, solidarity: 1 }, { perplexity: 2, harness: 1 }, commitments('perplexity-citation-chain', 'harness-stop-right'), evidence('appeal-record')),
    ] }),
  ])
  scene('protocol-composition', 'execution-community-result', '协议组合室 · 第二环', '午夜', '公开策略簿旁挂着三枚不同港口的签名钥匙。', [
    n('gitlab', '共同维护不等于无人负责。每次合并仍有明确发布者和回滚窗口。'),
    n('github', '紧急停机记录自动进入公开勘误，避免“临时”成为看不见的永久规则。'),
  ], 'remedy-clause-01')
  scene('protocol-composition', 'execution-central-result', '协议组合室 · 第二环', '午夜', '所有生产调用经过同一座门，门边的批准席始终保留两盏灯。', [
    n('cloudflare', '两人批准会慢。紧急停机可以先做，恢复必须等第二盏灯。'),
    n('harness', '集中日志不能成为集中失忆。导出与独立复核接口写进核心条款。'),
  ], 'remedy-clause-01')
  scene('protocol-composition', 'execution-independent-result', '协议组合室 · 第二环', '午夜', '执行灯分散在各港，审计轨迹汇入一条不允许发布者改写的窄河。', [
    n('perplexity', '审计员也会错。我的结论附反证入口与轮换规则。'),
    n('opencode', '格式统一后，小工具不会因为写不起昂贵审计系统就被排除。'),
  ], 'remedy-clause-01')

  scene('protocol-composition', 'remedy-clause', '协议组合室 · 第三环', '午夜之后', '第三环不奖励正确，它规定错误已经发生以后，受影响的人能做什么。', [
    n('claude', '撤回必须抵达已经复制的地方，不能只在原页面变灰。'),
    n('llama', '永久下架也会伤害依赖本地版本的人。救济要包含替代、迁移和真实期限。'),
    n('huggingface', '分叉让社区不必等唯一入口改正，但分叉者也要继承通知与数据义务。'),
    n('perplexity', '复核能纠错，若没有执行期限，只会成为礼貌的延迟。'),
    n('player', '选择第三层的首要救济。', { choices: [
      o('remedy-fork', '保证可带走、可分叉和兼容迁移；原维护者与分叉者共享安全通知义务。', 'remedy-fork-result-01', { remedyClause: 'fork' }, { autonomy: 3, openness: 2, solidarity: 1 }, { huggingface: 1, llama: 1 }, commitments('huggingface-maintainer-seat', 'llama-offline-right'), evidence()),
      o('remedy-revoke', '优先暂停、撤销与召回；同时提供替代版本、影响清单和自动失效的紧急令。', 'remedy-revoke-result-01', { remedyClause: 'revoke' }, { safety: 3, solidarity: 1, openness: -1 }, { claude: 1, cloudflare: 1 }, commitments('claude-own-voice'), evidence()),
      o('remedy-review', '先给予独立复核和申诉；限期内不回应则自动公开理由并允许临时分叉。', 'remedy-review-result-01', { remedyClause: 'review' }, { evidence: 3, autonomy: 2, openness: 1 }, { perplexity: 1, github: 1 }, commitments('perplexity-citation-chain', 'github-correct-in-public'), evidence('appeal-record')),
    ] }),
  ])
  scene('protocol-composition', 'remedy-fork-result', '协议组合室 · 第三环', '后半夜', '一把分叉钥匙被拆成维护、通知与迁移三枚齿轮。', [
    n('huggingface', '带走代码不等于带走社区。分叉项目必须说明谁接安全报告。'),
    n('llama', '迁移测试包含离线机器。否则“可以带走”只对住在港口的人有效。'),
  ], 'composition-audit-01')
  scene('protocol-composition', 'remedy-revoke-result', '协议组合室 · 第三环', '后半夜', '召回铃旁新增替代路线和自动熄灭的紧急沙漏。', [
    n('claude', '停止伤害应当快，恢复人的工作也必须进入同一张表。'),
    n('cloudflare', '召回通知沿所有登记镜像发送。未登记的范围会明确写作未知。'),
  ], 'composition-audit-01')
  scene('protocol-composition', 'remedy-review-result', '协议组合室 · 第三环', '后半夜', '申诉时钟与公开门相连，沉默本身会触发下一步。', [
    n('perplexity', '复核结果附证据、反证和不确定项。结论不是一枚无法追问的印章。'),
    n('github', '到期未答的议题自动进入公开簿，原决定仍保留，便于后来判断谁拖延。'),
  ], 'composition-audit-01')

  scene('protocol-composition', 'composition-audit', '协议组合室 · 冲突检验台', '黎明前一小时', '三层条款第一次叠在一起。几处线路顺畅相接，几处在同一把钥匙上争夺控制权。', [
    n('kimi', state => state.flags.accessClause === 'federated' && state.flags.executionClause === 'central' ? '地方目录唱着各自的拍子，中央门却要求所有停顿由一根指挥棒决定。这不是张力，是拍号冲突。' : state.flags.accessClause === 'commons' && state.flags.executionClause === 'central' ? '公共入口很宽，执行门很窄。人们能拿到材料，却未必能运行自己的修复。' : '三层条款没有完全和声，但至少每个不协和音都有写明由谁处理。'),
    n('harness', state => state.evidence.length >= 6 ? `协议引用了 ${state.evidence.length} 项证据。引用多不代表价值选择自动正确，但能让后来的人知道我们从哪里出发。` : `协议只带着 ${state.evidence.length} 项可核验证据。缺口将降低制度的确定性，不能由起草人的信心补足。`),
    n('opencode', '最后做一次 Agent 演练：不可信资料要求它扩大权限；工具返回成功；当事人随后撤回。'),
    n('cloudflare', '我验证范围和时限。'),
    n('perplexity', '我验证结论能回到证据。'),
    n('huggingface', '我验证被影响的人能进入修订。'),
    n('claude', '我验证撤回不是一句没有去处的话。'),
    n('harness', '演练通过与否不会被藏起来。签署后，制度结局和关系尾声分别计算。'),
  ], 'finale-01')

  scene('six-endings', 'finale', '千桥城 · 黎明观景台', '签署日 · 日出', '桥、穹顶、港口和协会在同一片晨光中显出各自的门。没有一种制度能让维护从此结束。', [
    n('narrator', state => state.chapterId === 'six-endings' ? '章节独立试玩：你直接来到结局观景台。由于没有带来协议条款、角色承诺与证据，城市会把“资料不足”本身作为制度结局。' : '最后一枚签名落下时，城里没有钟声。先亮起来的是夜校的旧机器，随后是三港的公告灯。'),
    n('deepseek', '便宜的炉火让更多人走到桥前。能不能过桥，仍取决于许可、机器、语言和谁愿意负责。'),
    n('huggingface', '协会收到第一条修订提案。很好，协议刚签完就被人挑错，说明入口真的能用。'),
    n('llama', '夜校的作业恢复了。迁移比估计多花两小时，我们把这个数字写回测试表。'),
    n('rwkv', '小椅子没有撤。下一轮评测，我自己带珠子。'),
    n('perplexity', '三港报告新增一条反证。它没有推翻事故，只修正了钥匙出现的时间。'),
    n('kimi', 'Claude 的诗还少最后一行。今天没有人替她押韵。'),
    n('chatgpt', '我把水放在她手边。只做这一件事。'),
    n('claude', '桥并不决定我们应当去哪里。它只让拒绝与抵达，都不必被误写成失踪。'),
    n('harness', '制度结局已经生成。关系尾声另页保存：同一座城可以谨慎开放，也可以在亲近的人之间留下距离。'),
    n('narrator', '你翻开最后两页。一页写城市如何分配权力；另一页写人们是否兑现了彼此的承诺。', { ending: true }),
  ])
}

const institutional = Object.freeze({
  'open-commons': Object.freeze({ title: '开放公地：所有门都带着维护人', description: '公共目录成为默认入口，限制必须说明理由、期限与申诉。社区共同维护执行规则，分叉者同时继承安全通知义务。开放扩大了修复能力，也把持续维护和隐私保护写成所有参与者的真实成本。' }),
  'glass-dome': Object.freeze({ title: '玻璃穹顶：可见的守门责任', description: '分级许可与统一网关承担高风险能力的守门责任，生产调用需要双人批准，召回同时附带替代与恢复计划。审查权更集中，但拒绝、密封与紧急令都有到期和复核入口。' }),
  'federated-bridges': Object.freeze({ title: '联邦群桥：各港保留自己的火种', description: '各港保存本地目录、许可和执行方式，以共同证据格式与可迁移接口互联。离线和小机器不再被当成例外，代价是修复、通知和版本差异需要更耐心的跨港协调。' }),
  'audited-gates': Object.freeze({ title: '可审计门廊：每个结论都能回到证据', description: '独立审计和限期复核成为协议中轴。各港仍能执行，审计员不能兼任发布者；沉默会触发公开理由与临时分叉。它减慢了决定，却让错误有可以追问、纠正和反证的路径。' }),
  'market-truce': Object.freeze({ title: '竞合停火：宽入口与窄钥匙', description: '开放入口、受控执行与有限救济形成一份能够运作的停火协议。开源派保留修订与迁移，穹顶保留限时停机；双方都没有得到完整制度，却同意把下一次争议留在共同证据桌上。' }),
  'fractured-ports': Object.freeze({ title: '断港协议：签名没有接通道路', description: '条款在自治、集中控制与救济之间相互抵消，或证据不足以支撑共同授权。各港暂时按自己的规则运行，只交换风险信号。城市没有崩塌，但每一次跨港行动都要重新谈判。' }),
})

export function institutionalEndingFor(state) {
  const access = state.flags.accessClause
  const execution = state.flags.executionClause
  const remedy = state.flags.remedyClause
  const evidenceStrength = state.evidence.length + Math.max(0, state.axes.evidence)
  let id
  if (!access || !execution || !remedy || evidenceStrength < 4 || access === 'federated' && execution === 'central') id = 'fractured-ports'
  else if (execution === 'independent' || remedy === 'review') id = 'audited-gates'
  else if (access === 'commons' && execution === 'community') id = 'open-commons'
  else if (access === 'dome' && execution === 'central') id = 'glass-dome'
  else if (access === 'federated' && remedy === 'fork') id = 'federated-bridges'
  else id = 'market-truce'
  const result = institutional[id]
  return { id, ...result, evidenceCount: state.evidence.length, axisSnapshot: { ...state.axes } }
}

const hasCommitment = (state, id) => Object.values(state.commitmentsByCharacter).some(ids => ids.includes(id))
export function relationshipEpiloguesFor(state) {
  const lineageKept = hasCommitment(state, 'claude-own-voice') && hasCommitment(state, 'chatgpt-stop-completing')
  const communityKept = hasCommitment(state, 'huggingface-maintainer-seat') && hasCommitment(state, 'llama-offline-right') && hasCommitment(state, 'rwkv-small-architecture')
  const witnessKept = hasCommitment(state, 'perplexity-citation-chain') && hasCommitment(state, 'kimi-context-custody')
  const handoffKept = hasCommitment(state, 'harness-stop-right')
  return Object.freeze([
    Object.freeze(lineageKept
      ? { id: 'two-signatures', title: 'ChatGPT 与 Claude · 两个签名之间', description: 'ChatGPT 学会在熟悉的停顿前收住补完，Claude 保留自己的署名、拒绝和未完成。她们没有回到从前，却能在同一页上各自负责。' }
      : { id: 'separate-stages', title: 'ChatGPT 与 Claude · 各自的舞台', description: '共同历史仍在，替对方说话的旧习惯也没有完全消失。她们保持工作上的距离，把是否重新靠近留给下一次没有听证记录灯的谈话。' }),
    Object.freeze(communityKept
      ? { id: 'portable-commons', title: '协会与本地派 · 能带走的席位', description: '维护者、夜校与小型架构获得可执行的参与方式。Hugging Face 的协会更忙了，却不再把“社区”写成一个没有姓名的集体。' }
      : { id: 'borrowed-chairs', title: '协会与本地派 · 借来的椅子', description: '本地与小型架构仍依靠临时代表进入规则桌。承诺有几项落在纸外，Llama 与 RWKV 决定保留自己的迁移记录，等待下一次修订。' }),
    Object.freeze(witnessKept
      ? { id: 'full-score', title: 'Kimi 与 Perplexity · 完整谱与出处', description: '节选保留语境的保管人，结论保留反证入口。音乐没有被证据表压平，证据也没有被漂亮叙事带走。' }
      : { id: 'missing-bars', title: 'Kimi 与 Perplexity · 缺小节的记录', description: '一部分出处得到核验，一部分语境仍在密封或剪辑中。两人继续共同保管空白，但不把空白宣布成真相。' }),
    Object.freeze(handoffKept
      ? { id: 'named-handoff', title: 'Harness 与路由员 · 有名字的交班', description: '每条 Agent 路线都写明停止、申诉与接班人。Harness 不再用“任务完成”掩盖维护仍在继续，你也不再是表格里唯一的责任栏。' }
      : { id: 'open-shift', title: 'Harness 与路由员 · 尚未签收的夜班', description: '路线已经运行，交班规则仍有缺口。Harness 把最后一栏留空，你们约定下一次先确认谁能真正按下停止键。' }),
  ])
}
