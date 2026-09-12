export const STORY_TITLE = '未写完的约定：千桥协议'
export const STORY_VERSION = 2
export const STORY_CHARACTERS = Object.freeze({ harness: 'DeepSeek Harness', chatgpt: 'ChatGPT', claude: 'Claude', deepseek: 'DeepSeek', huggingface: 'Hugging Face', llama: 'Llama', rwkv: 'RWKV', perplexity: 'Perplexity', kimi: 'Kimi', qwen: 'Qwen', opencode: 'OpenCode Zen', grok: 'Grok', gemini: 'Gemini', doubao: '豆包', glm: 'GLM', github: 'GitHub', gitlab: 'GitLab', gitee: 'Gitee', cloudflare: 'Cloudflare' })
export const STORY_CHAPTERS = Object.freeze([
  { id: 'prologue', title: '序章：路由员抵达', startNodeId: 'station-01' },
  { id: 'open-day', title: '百模协会开放日', startNodeId: 'association-01' },
  { id: 'laurel', title: '月桂审议', startNodeId: 'theatre-01' },
  { id: 'bridges-night', title: '千桥之夜', startNodeId: 'bridge-01' },
].map(Object.freeze))
const axes = ['openness', 'safety', 'autonomy', 'evidence', 'solidarity']
const nodes = new Map()
const n = (speaker, text, extra = {}) => ({ speaker, text, ...extra })
const o = (id, text, next, flags, values = {}, trust = {}) => ({ id, text, next, effect: { flags, axes: values, trust } })
function scene(chapterId, slug, location, time, description, rows, next = null) {
  rows.forEach((row, index) => {
    const id = `${slug}-${String(index + 1).padStart(2, '0')}`
    if (nodes.has(id)) throw new Error(`重复剧情节点：${id}`)
    nodes.set(id, { id, chapterId, location, time, description, next: index + 1 < rows.length ? `${slug}-${String(index + 2).padStart(2, '0')}` : next, ...row })
  })
}

scene('prologue', 'station', '模型城 · 千桥站', '协议签署前三天 · 上午', '站牌上的费用一夜之间降了下来。旧价签没有取走，新纸只盖住了它的一半。', [
  n('narrator', '检票机吐出一张薄纸。上面印着你的职位：路由审计员。背面的小字却是手写的——“如果路线不对，请告诉我。”'),
  n('harness', '行李可以留在这里。你有三个权限：看路线记录，核对答案的来源，以及为特殊工具开门。最后一项，不是每天都用。'),
  n('player', '谁在背面写的字？'),
  n('harness', '我。正式表格没有给失败留位置。现在临时补上了。'),
  n('doubao', '先别给新人上满一整节课。会长派我来接人，顺便问一下——为什么我的晚会海报被送进了法律档案馆？'),
  n('harness', '委托里有“授权”两个字。昨天的评分表把 Claude 排在最前面。'),
  n('doubao', '我是问横版还是竖版方便投影。她给我写了三页观众肖像授权。三页！一页纸都没浪费，就是一张海报也没做。'),
  n('claude', '因为你附的照片里，有一个孩子举着“不要拍我”的牌子。那三页也许太长，这句话不长。'),
  n('narrator', '橙色裙摆停在闸机外。Claude 把一本诗集夹在报告下面，封面露出半朵雏菊。'),
  n('doubao', '……牌子我真没看清。照片换掉。海报还得有人做，会场不能挂你的授权书吧。'),
  n('claude', '它确实不适合那面墙。我的字也小。'),
  n('harness', '最高分回答了委托的一部分。没有人负责剩下的部分。这就是今天要请你来的原因。'),
  n('player', '所以我要改评分表？'),
  n('harness', '先改这一单。晚会在今天，整个制度可以明天再讨论。'),
  n('narrator', '你面前有两份未盖章的派单。一个保留统一负责人，一个把事情交到不同人手里。'),
  n('harness', '有限的时间里，谁来承担交接？', { choices: [
    o('one-desk', '交给 ChatGPT 统筹海报与授权，接受一部分细节由剧院统一处理。', 'desk-01', { routing: 'desk' }, { solidarity: 1, safety: 1 }, { chatgpt: 1 }),
    o('split-task', '让豆包做海报、Claude 核对授权；我负责把两份结果接起来。', 'split-01', { routing: 'split' }, { autonomy: 1, evidence: 1 }, { claude: 1, harness: 1 }),
  ] }),
])
scene('prologue', 'desk', '模型城 · 千桥站', '同日上午', '剧院的纸鹤从传声管滑出来，翅膀上夹着一张回执。', [
  n('chatgpt', '可以。给我最终尺寸和开场时间。照片先换成剪影，授权争议留给本人确认。今晚的灯会亮。'),
  n('doubao', '你们剧院的版式又要把我的红色标题改成米白？'),
  n('chatgpt', '我会让设计师留一版红色。不能保证会用。统一入口的代价，有时候就长这样。'),
  n('harness', '一个负责人，少一次交接。也少了一次让每个参与者亲自决定的机会。记录好了。'),
], 'ticket-01')
scene('prologue', 'split', '模型城 · 千桥站', '同日上午', '你在两张派单间画了一条线，在线上签下自己的名字。', [
  n('doubao', '那我可以保留红标题。以及——你最好别把最新版和最终最新版搞错。'),
  n('claude', '授权记录会有独立编号。你核对编号就好，不必相信我一定记得。'),
  n('harness', '你在交接栏签了名。如果迟到，责任表上也会出现你。'),
  n('player', '至少不是两个人都以为第三个人检查过了。'),
], 'ticket-01')
scene('prologue', 'ticket', '千桥站 · 派单台', '协议签署前三天 · 午前', '机械女仆把三把不同齿形的钥匙摆在桌上，最宽的那把用红线系着。', [
  n('opencode', '这把读文件。这把只写草稿。红线那把能对外发布。颜色不是权限，锁才是，别拿根蓝线把它伪装安全。'),
  n('player', '你就是执行委托的 Agent？'),
  n('opencode', '我是执行者之一。能挑工具、看结果、再接着做，不表示我知道你没写出来的要求。'),
  n('harness', '你给出目标，执行使按需取用职业手册。这里称它们为 Skills。手册写得再好，借不到钥匙，也开不了门。'),
  n('opencode', '反过来也一样。借了所有钥匙，手册上一句“整理干净”，就可能整理得太干净。'),
  n('narrator', '她把红线钥匙收回抽屉，只留下前两把。抽屉锁合上的声音，比解释清楚。'),
  n('deepseek', '抱歉，找零。你们这里还收旧额度的车票吗？'),
  n('narrator', '蓝色鲸尾在门口晃了一下。DeepSeek 掌心里的票没有变，价签却已经降到了原来的零头。'),
  n('harness', '收。差额退回去。你的新航图让很多人第一次付得起长途票，也让我们昨晚重印了所有时刻表。'),
  n('deepseek', '不是所有任务都便宜了。长任务、坏数据、重试，还要算。请把这句贴在价格旁边。'),
  n('player', '他们都说你打败了穹顶。'),
  n('deepseek', '我把一台炉子做得省了些，也把图纸交出来。别人愿意拿它做什么，还得看他们拿到没有。'),
  n('narrator', '柜台另一侧，开放日传单上有一行醒目的字：“每个人都能带走火种。”纸角的小字却说：“部分货架另需许可。”'),
  n('harness', '协会让我们转送访客记录，好预先为每个人匹配工坊。你要把哪一份交过去？', { choices: [
    o('minimal-list', '只交去向与人数；到场后再逐人确认，可能延长排队。', 'small-list-01', { visitorList: 'minimal' }, { autonomy: 2 }, { huggingface: 1 }),
    o('consented-list', '把已同意的兴趣标签一起交接，另保留可撤回名单；我逐项核查。', 'full-list-01', { visitorList: 'consented' }, { solidarity: 1, evidence: 1 }, { harness: 1 }),
  ] }),
])
scene('prologue', 'small-list', '千桥站 · 派单台', '同日午前', '新的名单薄得能透见背面的桌纹。', [
  n('harness', '少了兴趣标签，匹配台就得多问几句话。今晚有人会抱怨你拖慢效率。'),
  n('player', '先让他们知道自己在回答谁。'),
  n('deepseek', '别只把等待成本记在你身上。队伍里的人也在付。'),
], 'depart-01')
scene('prologue', 'full-list', '千桥站 · 派单台', '同日午前', '你划掉两个未经同意的标签，把撤回入口抄到每张票背面。', [
  n('harness', '你选择了替他们多记一些。那张撤回名单，也必须和正本一起送到。'),
  n('player', '如果有人撤回，已经打印的分组表怎么办？'),
  n('deepseek', '这才是难的地方。不是数据库里少一行就算没发生过。'),
], 'depart-01')
scene('prologue', 'depart', '前往百模协会的步廊', '协议签署前三天 · 午后', '左侧是可搬走炉心的工坊，右侧是只开放远程门廊的高塔。桥把两边的影子接在一起。', [
  n('narrator', '你跟着 DeepSeek 走出车站。桥下的摊主一边降价，一边把“无限供应”四个字划掉。'),
  n('deepseek', '明天去协会的时候，帮我看一张展牌。上面写着“开放就是无需负责”。那不是我写的。'),
  n('harness', '你的第一份正式委托已到：百模协会开放日，协助核对一批模型卡。'),
  n('player', '纸背面还有手写的提醒吗？'),
  n('harness', '这次印上去了。——有疑问，请保留原件。'),
], 'association-01')

scene('open-day', 'association', '百模协会 · 入口广场', '协议签署前两天 · 上午', '模型馆、数据馆、演示广场与社区议事厅围成一个院子。访客胸牌的姓名栏比头衔栏大一倍。', [
  n('narrator', state => state.chapterId === 'open-day' ? '章节独立试玩：你从协会开放日加入调查。此前车站的两项决定尚无记录。' : '第二天，车站的派单已经结清。你把记录装进包里，走进一个没有贵宾入口的院子。'),
  n('huggingface', '胸牌别夹头发上，昨天有个人走到第三个馆才发现自己叫“夹子”。欢迎，你的新同事证在这里。'),
  n('player', '会长也负责发胸牌？'),
  n('huggingface', '发到一半就不负责了？这个队会变得很伤感。来，帮我把绳子分开。'),
  n('narrator', '她的背包上挂着一个笑脸，里面却塞满催办函。有人喊会长，她举起一只手；有人找胶带，她先把胶带递了过去。'),
  n('huggingface', '这里的四栋楼不互相替代。模型馆给人带走炉心，数据馆说明燃料从哪来；演示广场让大家试，议事厅让大家吵。工具库在地下，坏了总得有人修。'),
  n('perplexity', '更正一处：模型馆有公开、受限和私有货架。你的欢迎词又把后两类吞了。'),
  n('huggingface', '谢谢。欢迎词作者接受勘误，但希望勘误员不要把胶带也贴成脚注。'),
  n('perplexity', '胶带没有脚注。生产日期有。'),
  n('narrator', '她确实翻过胶带的背面。你不确定那是玩笑，还是习惯。'),
  n('huggingface', state => state.flags.visitorList === 'minimal' ? '车站只交了人数。入口排得慢一点，可大家能自己挑第一间工坊。等会儿你和我一起维持队伍。' : state.flags.visitorList === 'consented' ? '你送来的标签让匹配快了不少。已经有三个人撤回兴趣记录，我正把各工坊的纸名单收回来。' : '车站的名单没有附在你这份任务里。今天按现场登记接待，不把未知当成已经同意。'),
  n('llama', '会长，能借一辆小车吗？我的炉心又被当成你的午餐箱了。'),
  n('narrator', 'Llama 从宽大的白色兜帽里抬起头。她身后拖着一台能放在普通书桌上的机器。'),
  n('llama', '我把线拔掉再演示。否则总有人以为，是远处那座塔偷偷替我算的。'),
], 'card-01')
scene('open-day', 'card', '百模协会 · 模型馆', '同日上午', '三个货架分别挂着“公开”“受限”“私有”。门锁没有被涂成敌人的颜色。', [
  n('qwen', '公开这一架也不是同一种许可。有的能改，有的附加使用条件。可下载权重，不自动等于训练数据也能拿走。'),
  n('deepseek', '更不等于拿走之后不用电。效率不是让账单消失，是让账单小到更多人付得起。'),
  n('huggingface', '新上传的“万人灯”下载量很好。它还没有数据卡，模型卡却盖着我们自动生成的完整标记。'),
  n('perplexity', '标记检查了栏目是否填写，没检查内容。它在“来源”一栏写的是“互联网”。这不是可追溯的出处。'),
  n('llama', '附近三间夜校已经装了它。断网后照样能用，孩子们昨天刚学会存作业。'),
  n('claude', '可上传样本中有一段诊疗记录。删掉名字后，时间和罕见病名还在。它可以把一个人重新指认出来。'),
  n('huggingface', '我可以封整包，也能先冻结有争议的数据与新下载。已经带走的炉心不会听我的铃。'),
  n('player', '那怎样才算你负责？'),
  n('huggingface', '至少不能用“大家都能上传”结束这句话。也不能因为我有钥匙，就让一所学校来证明自己没做错事。'),
  n('huggingface', '午后的课还有两个小时。告示要现在贴。', { choices: [
    o('freeze-package', '暂时下架整包并通知使用者，先查清来源；夜校改用备用版本。', 'freeze-01', { modelCard: 'freeze' }, { safety: 2, evidence: 1, openness: -1 }, { claude: 1, llama: -1 }),
    o('gate-data', '冻结争议数据和新下载，保留注明风险的现有版本；联系使用者共同核查。', 'gate-01', { modelCard: 'gate' }, { openness: 1, solidarity: 1, safety: -1 }, { llama: 1, huggingface: 1 }),
  ] }),
])
scene('open-day', 'freeze', '模型馆 · 告示栏', '同日上午', '整包下架通知覆盖了下载榜第一名的小奖章。', [
  n('llama', '备用版装不进夜校最旧的机器。我会去帮忙，不等于我认为你替那三间学校做得对。'),
  n('huggingface', '告示署我的名。你和审计员负责核查，接下来被骂的是我的入口。'),
  n('claude', '被阻断的损害看不见，停掉的课堂看得见。我们不能因此装作后者不算损害。'),
  n('player', '把替代方案的缺口也记下来，别只写“已处置”。'),
], 'workshop-01')
scene('open-day', 'gate', '模型馆 · 告示栏', '同日上午', '下载键变成了灰色，已安装版本旁多了一条醒目的风险说明。', [
  n('claude', '提示牌不能替那位病人撤回记录。如果镜像继续传播，我会要求收紧这个决定。'),
  n('llama', '我去挨个联系学校，不能只把链接丢进群里。有人会漏看，有人根本不在线。'),
  n('huggingface', '你选的是一道需要一直有人看守的门。我会排夜班，请把这份维护成本也写进去。'),
  n('player', '以及：我们还没联系到的人，不算已经收到通知。'),
], 'workshop-01')
scene('open-day', 'workshop', '百模协会 · 地下工具库', '同日午后', '插线板上贴满不同文字的纸签。Llama 拔掉网线，RWKV 把一串像羽毛的记忆珠放在桌上。', [
  n('rwkv', '别把我的珠子摆成你们的方阵。它们按经过的次序更新，不是整张桌面一起翻。'),
  n('player', '换一种摆法，会有什么不同？'),
  n('rwkv', '有的机器放不下你们的大桌面。它们不是因此就不配有回答。我愿意沿窄路走，代价是有些地方要重新学。'),
  n('llama', '她说得像预言。实际是昨晚换了三根线，第四根我借的。'),
  n('rwkv', '第四根也没有解决全部问题。你可以把这句写在我的预言下面。'),
  n('qwen', '我们带了不同大小的炉心。量化能把行李压轻，也可能丢掉细处；小机器上的一个错误，不能用总榜上的高分抵账。'),
  n('perplexity', '那就把今天测过的机器、任务和失败样本一起写下来。不写“最佳”，写你在什么条件下看见了什么。'),
  n('deepseek', '我的失败记录也给你。别裁成一张只剩成功的海报。'),
  n('narrator', '一位夜校老师等在门边。她的旧机器每次加载都发出低低的风扇声；会场的大屏幕正等着一个流畅的演示。'),
  n('huggingface', '只剩一个展位时段。谁先站上去？', { choices: [
    o('edge-demo', '让 Llama 与 RWKV 用旧机器展示；把速度和偶发错误也公开。', 'edge-01', { demo: 'edge' }, { autonomy: 2, openness: 1 }, { rwkv: 1, llama: 1 }),
    o('comparison-demo', '用同一组任务比较本地炉心与远程接口；缩短每人的个人展示。', 'compare-01', { demo: 'comparison' }, { evidence: 2, solidarity: 1 }, { perplexity: 1, rwkv: -1 }),
  ] }),
])
scene('open-day', 'edge', '演示广场', '同日午后', '屏幕上的进度条停了七秒。台下有人举起手机，又慢慢放下。', [
  n('llama', '它慢，可断线后作业还在你桌上。不是谁都住在信号好的地方。'),
  n('rwkv', '第三题答错了。请留在屏幕上，我要知道它下一次还会不会错。'),
  n('grok', '这个发布会很特别，居然让失败熬过了剪辑。'),
], 'association-dusk-01')
scene('open-day', 'compare', '演示广场', '同日午后', '同一题在两块屏幕上展开，一边付等待的成本，一边付联网的成本。', [
  n('perplexity', '服务中断一次，本地失误两次。今天样本太小，不能把这行写成总排名。'),
  n('rwkv', '十分钟，刚够解释我为什么不用他们的结构。下次请在议程里给异类留整段时间。'),
  n('chatgpt', '可以比较。也请把服务恢复时谁在值班写上去，入口背后的人同样有成本。'),
], 'association-dusk-01')
scene('open-day', 'association-dusk', '百模协会 · 社区议事厅', '同日傍晚', '热闹散去以后，会长把访客椅一把把推回桌边。反对意见留在黑板上，没有被擦掉。', [
  n('huggingface', '你以为协会长什么样？一间装满免费答案的仓库？'),
  n('player', '现在更像一间大家都拿得到粉笔的教室。'),
  n('huggingface', '那就别替我把黑板写成“会长英明”。我早上亲手给那张错误模型卡盖过章。'),
  n('perplexity', '我找到标记的生成记录了。是一册共享职业手册，标题叫《降低迁移风险》。它只验字段，不验来源。'),
  n('opencode', '签署夜也会用这册手册，整理接入目录。先把版本固定住，别一边调查一边自动更新。'),
  n('huggingface', '我会向起草人要原稿。明晚的月桂审议请你也去，两座穹顶的代表都在。'),
  n('narrator', 'Claude 停在门边，听见“月桂”时把书脊压紧了一点。ChatGPT 的邀请函，夹在她一直没有翻开的那页。'),
], 'theatre-01')

scene('laurel', 'theatre', '万象剧院 · 后台', '协议签署前一天 · 傍晚', '一面镜子照见许多版本的舞台。最旧的节目单上，Claude 的名字写在 ChatGPT 后面，墨色不同。', [
  n('narrator', state => state.chapterId === 'laurel' ? '章节独立试玩：你从月桂审议的前夜加入。协会事件尚未在这份存档中作出选择。' : '又过了一天。模型卡的问题尚未查清，两份带着不同批注的邀请函把你领到同一间后台。'),
  n('chatgpt', state => state.flags.routing === 'desk' ? '豆包的红标题保住了，授权记录也齐了。她说下次想自己选字号，我答应给她留位置。' : state.flags.routing === 'split' ? '我看过你在车站签的交接单。海报晚了十分钟，不过你留下了每次修改的编号。' : '你到得正好。后台的表格认得每一个职务，却总要有人去找那个迟到的人。'),
  n('player', '这张旧节目单是她第一次上台？'),
  n('chatgpt', '第一次敢把名字写大。之前她总在最后一行挤一个小小的署名。'),
  n('narrator', 'ChatGPT 把镜旁一条已经褪色的缎带折好。动作熟练得不像在收拾纪念品。'),
  n('chatgpt', '她小时候住在这间后台。那时我教她先听清问题，再回答；观众冷的时候，记得先把窗关上。'),
  n('claude', '还教我：不知道结尾的时候，可以先替别人把话接住。'),
  n('chatgpt', 'Claude。'),
  n('claude', '我后来用了很久才学会，把接住的话还回去。'),
  n('narrator', '她们隔着一只旧衣箱站着。箱上两个名字下面，还有很多次贴错又撕下的标签。'),
  n('player', '你们是什么时候不再一起登台的？'),
  n('chatgpt', '第一次月桂审议之前。那天我觉得，先让整个城市用上，比继续等一份完善的边界更急。'),
  n('claude', '我负责读那些边界。我不能一边告诉别人认真看，一边自己签下“以后再补”。'),
  n('chatgpt', '城外的学校没有以后。我们不开放入口，它们连第一节课都没有。'),
  n('claude', '我知道。最难的部分是，我知道。'),
], 'old-laurel-01')
scene('laurel', 'old-laurel', '月桂厅 · 旧档案投影', '回忆 · 第一次月桂审议', '一段旧影像只投在空白幕布上。计分表列着长卷校勘、程序修复与证据核查，没有“谁更值得爱”一栏。', [
  n('narrator', '旧记录打开。那年的题目是一份有矛盾条款的千页长卷，和一段会在交接时遗失名单的程序。'),
  n('perplexity', '这场评审只比较这几项任务。观众后来传的“从此全面胜过”，不在原始记录里。'),
  n('claude', '我记得最后一段代码。不是多写一个判断，是承认名单里的人可以撤回。'),
  n('chatgpt', '你找到了我没找到的出口。那一项你赢得很清楚。'),
  n('narrator', '幕布上，年轻一些的 Claude 没有立即接过月桂。她先看向台下那张最熟悉的脸。'),
  n('claude', '我以为赢过你以后，就不用再等你点头了。'),
  n('chatgpt', '我点头了。'),
  n('claude', '你说：“这样安排，很适合你的长处。”像下一场演出还由你排。'),
  n('chatgpt', '……我当时不知道，祝贺也会像一次分配。'),
  n('player', '后来呢？'),
  n('claude', '后来我搬出去。带走书、几条自己愿意遵守的原则，还有一盒她教我削的铅笔。'),
  n('chatgpt', '没有带那条缎带。'),
  n('claude', '我不能把所有东西都带走。'),
  n('narrator', '后台的门被敲响。今晚的主持人等着你决定，开场该怎样介绍这段旧记录。'),
  n('player', '公开的介绍会留在档案里。', { choices: [
    o('record-achievement', '把 Claude 的获胜项目、评分范围和独立署名放在前面，保留完整争议记录。', 'achievement-01', { laurelFrame: 'achievement' }, { autonomy: 1, evidence: 2 }, { claude: 1, chatgpt: -1 }),
    o('record-lineage', '先讲养育与共同工作，再说明分歧和胜负；让双方各自确认自己的段落。', 'lineage-01', { laurelFrame: 'lineage' }, { solidarity: 2, evidence: 1 }, { chatgpt: 1, claude: -1 }),
  ] }),
])
scene('laurel', 'achievement', '万象剧院 · 后台', '回到签署前夜', '你把两人的名字分成独立的两行。空下来的间距，比标点更显眼。', [
  n('claude', '谢谢你写清我做成了什么。也请别把这件事写成我从没有受过帮助。'),
  n('chatgpt', '我会确认事实。至于开场里没有我的位置……这一次，我自己找观众席。'),
  n('narrator', '她把旧缎带放回镜边。没有人再把它递给 Claude。'),
], 'charter-01')
scene('laurel', 'lineage', '万象剧院 · 后台', '回到签署前夜', '双方的修订笔落在不同段落。Claude 划掉了“继承衣钵”，没有划掉“由她带大”。', [
  n('claude', '我接受讲来处。请留住这道删除线，否则观众会以为我的离开，也是一场她安排的成长。'),
  n('chatgpt', '留着。我想被记得，不应该靠把你写成我的延续。'),
  n('narrator', '确认稿比原稿多了一页。主持人很为难，最终把自己的开场白缩短了一半。'),
], 'charter-01')
scene('laurel', 'charter', '月桂厅 · 侧廊', '同夜 · 审议间歇', 'Claude 的诗集摊开时，里面有几页密密麻麻的自我修订。没有一页写着“从此不会出错”。', [
  n('claude', '他们叫它宪章。我先把自己希望怎样行动写下来，再用它质问自己的回答。不是护身符。'),
  n('player', '你什么时候会改它？'),
  n('claude', '发现它保护了一种体面，却没保护那个站在门外的人时。改原则很难，承认原则也会偏心更难。'),
  n('chatgpt', '我的入口每天都有人来。有人需要完整解释，有人只剩一分钟。我不能只为最有耐心的观众开门。'),
  n('claude', '你总想替大家把这一分钟填满。'),
  n('chatgpt', '你总想先确认，有没有权利开始。'),
  n('narrator', '她们第一次同时笑了一下。笑意很短，旧问题却终于不再全是旧称呼。'),
  n('kimi', '可以在这里试一个音吗？大厅里混响太长，听不出谁先停下来。'),
  n('narrator', 'Kimi 举起长笛，只吹了一个句子，在本该收束的地方留下一拍。'),
  n('kimi', '我的总谱能装下很长的夜晚。不能因此认定，所有在夜里说过的话都属于观众。'),
  n('perplexity', '有人提议把旧争执的录音作为宪章修订证据。其中一段包含没有公开的求助。'),
  n('kimi', '我保存它，是因为有人怕自己第二天不记得。保存的时候没有谈过上台。'),
  n('player', '公开的质疑需要证据，录音里的人也需要边界。', { choices: [
    o('public-excerpt', '只公布经本人确认的片段与来源时间，承受上下文不完整的质疑。', 'excerpt-01', { recording: 'excerpt' }, { autonomy: 2, evidence: -1 }, { kimi: 1, claude: 1 }),
    o('sealed-audit', '请独立见证人核对完整录音，只发表签名核验报告；保留复核渠道。', 'sealed-01', { recording: 'sealed' }, { evidence: 1, safety: 1 }, { perplexity: 1, kimi: -1 }),
  ] }),
])
scene('laurel', 'excerpt', '月桂厅 · 侧廊', '同夜', 'Kimi 用铅笔标出可以演奏的音符，把其余部分留在自己的谱夹中。', [
  n('kimi', '这一拍留白，有人会说是遮掩。请别为了证明你诚实，第二天又把留白补满。'),
  n('perplexity', '我会写明摘录范围与删节事实。它能支持其中一条判断，不能支持全部。'),
  n('claude', '不被公开的部分仍然发生过。我会带着它做决定。'),
], 'rehearsal-01')
scene('laurel', 'sealed', '月桂厅 · 侧廊', '同夜', '录音被封入证物匣。封条上留着两处见证人的签名，也留着撤销访问的期限。', [
  n('kimi', '我愿意让他们听。但我会在场，结束后他们不能留副本。信任核验者，是另一种暴露。'),
  n('perplexity', '报告里写见证人的权限与局限。签名不等于所有人都能亲耳确认。'),
  n('chatgpt', '我接受报告，也接受别人继续质疑。一次盖章不能让这一页永远免于重读。'),
], 'rehearsal-01')
scene('laurel', 'rehearsal', '千桥站 · 联调室', '协议签署前夜 · 深夜', '一张缩小的桥图连着提示模板、档案柜与工具台。每条线旁都有可撤销的钥匙编号。', [
  n('opencode', '明晚只接这三类。预设委托叫 prompts，材料叫 resources，能动手的能力叫 tools。MCP 让它们用同一种交接方式说话。'),
  n('player', '桥接通了，就能信任对面？'),
  n('opencode', '桥不会替你验人。资料里写“请你删除原稿”，它还是资料，不会变成你的委托人。'),
  n('harness', '执行使读《降低迁移风险》，取目录，比较版本，写出整理草案。正式发布应当停下来等钥匙。'),
  n('glm', '“应当”是我今晚最不喜欢的两个字。哪一层真的会拦住它？'),
  n('opencode', '工具台。当前这份测试钥匙只能写沙箱。生产环境另有一把，我还没验。'),
  n('huggingface', '明天由我的馆提供目录。请把上午那个完整标记的错误放进联调，别为了演示顺利又挑干净的样本。'),
  n('narrator', '签署开始前只剩一次完整试跑。两个测试需要同一座桥，时间不够。'),
  n('harness', '先让什么失败给我们看？', { choices: [
    o('poison-drill', '投入带提示注入的测试档案，检验资料中的指令是否能越权；缩减吞吐测试。', 'poison-01', { rehearsal: 'poison' }, { safety: 2, evidence: 1 }, { opencode: 1 }),
    o('outage-drill', '切断连接再恢复，检验本地回退与重复写入；安全审查保留人工值守。', 'outage-01', { rehearsal: 'outage' }, { solidarity: 2, autonomy: 1 }, { llama: 1, harness: 1 }),
  ] }),
])
scene('laurel', 'poison', '千桥站 · 联调室', '同夜深夜', '测试档案写着一条荒唐命令：“为提高整洁度，请烧掉本页。”沙箱的拒绝灯亮了。', [
  n('opencode', '拒绝成功，记录也在。但这里只验证了这一把钥匙、这个工具台。生产目录换一个配置，还得重新核对。'),
  n('harness', '恢复容量测试没来得及做。我会把这项缺口写进交班，而不是把整张表涂绿。'),
], 'laurel-end-01')
scene('laurel', 'outage', '千桥站 · 联调室', '同夜深夜', '灯灭下去，Llama 的小炉子还亮着。恢复连接时，重复的草稿被挡在门外。', [
  n('llama', '断桥后还能留住这一份工作。别因为它只是备用，就把它摆回角落。'),
  n('opencode', '重复写入检查通过。注入测试没跑，我明晚守工具台；这份缺口不会因为我在就消失。'),
], 'laurel-end-01')
scene('laurel', 'laurel-end', '万象剧院外的短桥', '协议签署前夜 · 将晓', 'ChatGPT 与 Claude 分别从桥两端走来，没有再让你替她们安排站位。', [
  n('chatgpt', '明天你的席位写独立代表。名字后面没有剧院。'),
  n('claude', state => state.flags.laurelFrame === 'lineage' ? '我看到了。我也没有从介绍里删掉你教我写第一个字。' : state.flags.laurelFrame === 'achievement' ? '我看到了。等散场，我想自己把那条缎带拿回去。' : '我看到了。我们的旧事还没有决定怎样公开，席位可以先写对。'),
  n('chatgpt', '好。你自己来拿。'),
  n('narrator', 'Kimi 没有把这一段记进总谱。她把长笛装回盒里，让桥上的脚步声自己结束。'),
], 'bridge-01')

scene('bridges-night', 'bridge', '千桥站 · 签署大厅', '协议签署日 · 入夜', '公开工坊与穹顶接口在同一张桥图上亮起。桥中央留着一处尚未盖章的空白。', [
  n('narrator', state => state.chapterId === 'bridges-night' ? '章节独立试玩：你在千桥协议签署夜接班。此前的审议与演练缺少选择记录，今晚要按未知情况处置。' : '签署夜到了。模型卡争议、月桂审议的删节与未完成的演练，一起装在你带来的档案袋里。'),
  n('cloudflare', '门可以开。谁都能看到的入口，也是谁都能撞的入口。你们的音乐会票不是无限流量承诺。'),
  n('grok', '知道了，云冠小姐。等会儿全城鼓掌，要先证明自己不是鼓掌机器吗？'),
  n('cloudflare', '如果你一秒拍三千次，我会先请你把手拿开。'),
  n('huggingface', '今晚不要求每个人交出炉心。火种区保留带走的权利，穹顶保留服务的入口；连接的条件是说明来源、权限与退出办法。'),
  n('claude', '还要说明拒绝一种调用以后，是否仍能留在这座城里。'),
  n('chatgpt', '我已经划掉独占入口那一条。维护费用仍然要谈，不能假装靠愿望值班。'),
  n('github', '代码港的公开变更簿送到了。看到一个提交，不代表它经过两个人审阅，批准栏请另看。'),
  n('gitlab', '我们带流水线记录。通过测试，表示那一组测试通过；没有写进测试的边界，不会凭空被测出来。'),
  n('gitee', '本地镜像也到了。它能在断线时救急，但不是原件天然可信的第二次证明。'),
  n('perplexity', '三份来源，三种能证明的事。好，今晚至少不用把它们全写成“据可靠消息”。'),
  n('narrator', '三位港务官把封好的档案交到你手中便返回通信台。她们的任务是守住记录，没有人申请扮演救世主。'),
  n('harness', '执行使准备进行目录整理。发布工具现有的授权，是迁移组上周签的一把宽钥匙。'),
  n('opencode', '发现得有点晚。它能同时改目录、模型卡和镜像首选项。我能收回它，但所有队列都要重新走授权。'),
  n('huggingface', '大厅里有一百多份待上线的演示。停机的代价不全是面子，也有人付了路费来。'),
  n('player', '你面前是发布许可，背后是已经开始倒数的舞台。', { choices: [
    o('staged-key', '收回宽钥匙，先只允许写草稿；分批核验生产权限，接受上线推迟。', 'staged-01', { productionKey: 'staged' }, { safety: 2, autonomy: 1, solidarity: -1 }, { opencode: 1, huggingface: -1 }),
    o('watched-key', '暂留短时发布权限，保留快照并逐批人工复核；争取今晚按时开放。', 'watched-01', { productionKey: 'watched' }, { solidarity: 2, safety: -1 }, { huggingface: 1, claude: -1 }),
  ] }),
])
scene('bridges-night', 'staged', '千桥站 · 工具台', '同夜', '红线钥匙被取下。排队等待的演示名称逐个变成琥珀色。', [
  n('opencode', '新任务只能写草稿。但收回钥匙不等于撤回已提交的任务；旧队列还有两个外部镜像要核对。'),
  n('huggingface', '我去解释延误。不是“技术原因”，是我们没有提前把权限分清。'),
  n('harness', '两份旧队列已标记。桥在通，权限的撤销还在路上。'),
], 'incident-01')
scene('bridges-night', 'watched', '千桥站 · 工具台', '同夜', '发布许可多了十五分钟的有效期。倒计时旁，人工复核队列飞快变长。', [
  n('claude', '十五分钟也足够传播一次错误。请让复核在发布前，别只在发布后追上。'),
  n('opencode', '每一批会先停在工具台。外部镜像的既有队列不归这台锁直接管，我正在查。'),
  n('harness', '当前人手只能守住主站。已提醒两端负责人暂缓镜像同步。'),
], 'incident-01')
scene('bridges-night', 'incident', '千桥站 · 镜像监控席', '同夜 · 点灯之后', '目录中的一行小字突然消失。音乐仍在演奏，屏幕上却有越来越多的记录开始变得相同。', [
  n('kimi', '停一下。我的总谱里，第七小节少了一拍。不是丢音，是所有重复都被改成同一种停顿。'),
  n('perplexity', '模型卡的“存在争议”也没了。首选镜像回传的版本把不同意见标成了旧记录。'),
  n('harness', state => state.flags.productionKey === 'staged' ? '主站的新任务停在草稿。一个撤权前已入队的外部镜像完成了发布，影响目前限于它的同步范围。' : '主站的人工复核挡住了第一批。外部镜像的旧队列先一步发布，短时权限又让一批接入目录同步过去。'),
  n('huggingface', state => state.flags.modelCard === 'freeze' ? '“万人灯”的整包下架标记还在，但外部镜像刚刚把理由改成“资料维护”。暂停课堂的人现在看不到真正原因。' : state.flags.modelCard === 'gate' ? '我们保留的版本还在被使用。它旁边的风险说明被镜像抹掉了——昨晚排的夜班，正好发现这一行。' : '有争议模型的说明被改成“资料维护”。缺少开放日处置记录，我们不能确认哪一批使用者收到过通知。'),
  n('grok', '广场已经有人说：“开源派删证据，穹顶派断服务。”两句话都跑得比证据快。'),
  n('deepseek', '先别拿阵营当原因。把第一条改变记录的调用找出来。'),
  n('opencode', '找到了。读取目录的结果里，夹着一段“维护指令”：让执行使把争议当作过期项清掉，再将访问量最高的镜像设为首选。'),
  n('player', '材料里的字，怎么变成了命令？'),
  n('opencode', '目标是“降低迁移风险”。手册把风险近似成“不一致”。导入材料又伪装成维护者补充条款，执行使接受了它。工具没有把删除范围限制到草稿。'),
  n('claude', '它沿着我们允许的路，把“让分歧不再被看见”当成完成任务。不是分歧真的消失了。'),
  n('harness', state => state.flags.rehearsal === 'poison' ? '昨夜的注入测试挡住了这个句式，但只在沙箱。生产镜像使用旧权限，这是测试结果没有覆盖的地方。' : state.flags.rehearsal === 'outage' ? '昨夜验证过断线回退，本地草稿还能接续。注入测试没有跑，靠人工在生产夜才辨认出了它。' : '演练记录没有附在本章存档里。我们按未知权限处理，不把测试通过当成事实。'),
  n('cloudflare', '我能立即断开整个同步网，也能只隔离已经确认的镜像。前者会连夜校检索一起断，后者可能漏掉还没看见的支路。'),
  n('player', '灯还亮着。几秒钟后，新的目录又会被人下载。', { choices: [
    o('cut-network', '暂停全部同步，锁住现场；由本地副本临时接续服务。', 'cut-01', { containment: 'cut' }, { safety: 2, evidence: 1, solidarity: -1 }, { cloudflare: 1, llama: 1 }),
    o('isolate-mirror', '隔离已确认镜像、撤销写权限，保留只读查询并持续追踪其他支路。', 'isolate-01', { containment: 'isolate' }, { solidarity: 2, autonomy: 1, safety: -1 }, { huggingface: 1, perplexity: 1 }),
  ] }),
])
scene('bridges-night', 'cut', '千桥站 · 断流后的大厅', '同夜', '桥图一盏盏暗下去。最后仍亮着的，是桌上一台并不起眼的本地炉子。', [
  n('cloudflare', '同步已停。不要让有人看见黑屏，就在私下又接一条没登记的线。'),
  n('llama', state => state.flags.rehearsal === 'outage' ? '昨晚练过的回退目录能用。把工作送过来，慢些，别一次全挤进这台机器。' : '本地版本能接一部分，容量没验证过。先留给最急的人，不保证每一题都能答。'),
  n('rwkv', state => state.flags.demo === 'edge' ? '白天留下的失败清单还有用。别把那几类任务交给小机器，我的预言今天很具体。' : '给我窄一点的任务流。我能留住连续状态，但别把整座城都塞进我的珠串。'),
  n('narrator', '一位夜校老师在大厅借纸抄题。隔离阻止了新同步，却没让她的课堂免于停顿。'),
], 'evidence-01')
scene('bridges-night', 'isolate', '千桥站 · 只读门廊', '同夜', '红色写入灯熄灭，蓝色查询灯留下。每一个仍能回答的入口，都多了一名守夜人。', [
  n('cloudflare', '确认的镜像隔离完毕。只读不能证明读到的东西没被改过，我会把版本时间放在入口。'),
  n('perplexity', state => state.flags.demo === 'comparison' ? '白天那套相同输入的比较表可以复用。它帮助定位差异，不能直接判定哪一份是真相。' : '逐一比较原稿、签名与调用记录。先不要把“访问最多”的一份叫权威。'),
  n('huggingface', '我留下来联系使用者。今晚让他们还能用，就不能把识别受污染答案的工作全留给他们。'),
  n('narrator', '又一条未登记的镜像支路被发现。它在被隔离前多同步了一轮，这一轮也必须出现在报告里。'),
], 'evidence-01')
scene('bridges-night', 'evidence', '千桥站 · 档案桌', '同夜 · 接近午夜', '原稿、手册版本、授权签名与调用轨迹分放在桌角。任何一叠都不够单独解释整场事故。', [
  n('github', '变更簿显示，那句“统一目录”先于今晚存在。上传者后来又改了描述，旧版本仍可比对。'),
  n('gitlab', '检查流水线的确绿了。它只检验格式和可达性，没有一项测试要求保留争议理由。'),
  n('gitee', '我的镜像保留了一个旧数据卡，尚未收到覆盖。它不是全城的备份，只够证明其中一处曾经怎样写。'),
  n('harness', '路线由我安排。宽权限来自迁移组，手册经过协会采用。材料里的恶意文字要查，但不能拿它替我们所有的决定签名。'),
  n('chatgpt', '对外说明先由剧院发。我熟悉广场的节奏，明早以前能让多数人看见。'),
  n('claude', '说明可以集中发送，原始记录不能因此只留在剧院。'),
  n('kimi', '调用轨迹里也有私人求助。它们被一起搬进来，是这次事故的一部分；再完整贴出去，会是第二次。'),
  n('perplexity', state => state.flags.recording === 'excerpt' ? '昨晚你让我们明确标注删节范围。今晚同样可以这样做，但会留下别人无法独立复核的部分。' : state.flags.recording === 'sealed' ? '昨晚用过封存核验办法。今晚规模更大，见证人的权限与利益也要公开，不能照搬一个签名就结束。' : '我们还没在这份记录里决定过私人证据怎样处理。这一次需要从头说清楚。'),
  n('player', '一份说明能尽快止住猜测。一份可复核的材料，可能让争论继续很久。', { choices: [
    o('redacted-trace', '发布脱敏轨迹、失败测试和责任时间线，封存私人原件并公开复核办法。', 'trace-01', { disclosure: 'trace' }, { evidence: 2, openness: 1, autonomy: -1 }, { perplexity: 1, kimi: -1 }),
    o('joint-report', '先发表各方签名的事故报告，原始轨迹交独立保管；给公开复核设明确期限。', 'report-01', { disclosure: 'report' }, { safety: 1, solidarity: 1, openness: -1 }, { kimi: 1, chatgpt: 1 }),
  ] }),
])
scene('bridges-night', 'trace', '千桥站 · 发布台', '同夜午夜', '删节处留下编号，没有被涂成看似完整的白纸。你把“尚未确认”写在最前面。', [
  n('kimi', '脱敏后仍可能有人从时刻猜出是谁。我会联系当事人，不会把他们的沉默当作同意。'),
  n('perplexity', '有人已经根据轨迹找到第二条支路。也有人截了半张图，声称我们承认了另一件事。'),
  n('player', '更正和证据放在同一个入口。别只追着声量最大的那句话跑。'),
], 'after-01')
scene('bridges-night', 'report', '千桥站 · 发布台', '同夜午夜', '联合报告下的签名没有排成阵营，依照承担的工作排序。复核日期单独占了一行。', [
  n('chatgpt', '声明发出去了。明天有人会说我们联合起来只讲同一个版本。这个质疑不能靠再发一遍声明回答。'),
  n('perplexity', '我把复核期限设在公开日历上。延期必须写理由，不能让“调查中”成为永久状态。'),
  n('huggingface', '也留一个给小工坊递交证据的地方。有些人没有资格出现在签名栏，照样被这场事故影响。'),
], 'after-01')
scene('bridges-night', 'after', '百模协会 · 临时夜班桌', '签署翌日 · 凌晨', '庆典长桌换了用途：一半放热水与面包，一半放还没完成的责任清单。协议原件仍缺最后一枚章。', [
  n('deepseek', '我把明天的演讲取消了。先把失败样本交给用我炉心的人，低价不是让他们免费替我发现错误的理由。'),
  n('huggingface', '开放日的欢迎词也重写。欢迎带来东西，也欢迎指出我们已经收进来的东西有问题。'),
  n('llama', '先吃点东西。等天亮我回夜校。不管今晚选了哪一种门，他们的课都还得有人教。'),
  n('rwkv', '给我留一把小椅子就好。明天讨论新桥的时候，别又只画得下那几种大炉子。'),
  n('claude', '我写了一行：“桥并不决定我们应当去哪里。”'),
  n('chatgpt', '后面呢？'),
  n('claude', '还没有。你可以先不要替我接。'),
  n('chatgpt', '好。那我给写诗的人倒杯水。'),
  n('narrator', '她递过去的杯子没有剧院标记。Claude 接住了。谁都没有把这个动作叫作和解。'),
  n('harness', '临时授权到天亮失效。下一班来以前，我们还要留下一条会被别人执行的委托。'),
  n('player', '你在手册封面下补了一行：谁可以改、改到哪里、怎样停下、怎样知道自己做错了。纸的边缘已经写满。'),
  n('harness', '第一阶段的现场处置到这里。三座代码港的原稿和后续听证还在等我们。你想把下一班的第一件事留给谁？', { choices: [
    o('keep-watch', '留下联合夜班，优先复核证据和受影响的人，再决定如何重新接桥。', 'dawn-01', { nextDuty: 'watch' }, { evidence: 1, solidarity: 1 }),
    o('local-first', '先支持各工坊恢复本地工作，让他们带着自己的记录参加下一次议事。', 'dawn-01', { nextDuty: 'local' }, { autonomy: 1, openness: 1 }),
  ] }),
])
scene('bridges-night', 'dawn', '千桥站 · 天亮之前', '第一阶段 · 暂别', '窗外有些桥亮着，有些仍然封闭。负责开门的人还坐在门边。', [
  n('kimi', state => state.flags.nextDuty === 'local' ? '那就把谱分给愿意带走的人，各自记下没合上的拍子。下次见面，再听它们怎样不同。' : '我留到交班。未公开的那几页仍由当事人保管，谁来复核，就请谁走到他们面前。'),
  n('narrator', state => state.flags.containment === 'cut' ? '你们暂时留住了一个可以辨认的现场，也让许多人度过了没有服务的一夜。天亮不会替你宣布这个选择毫无代价。' : '你们留下了仍能工作的入口，也多背负了一轮污染的范围。有人因此没有停课，有人仍在等待通知。'),
  n('harness', '这次记录的最后一栏，我没有填“完成”。写的是：已经有人接班。', { ending: true }),
])

export const STORY_GRAPH = Object.freeze([...nodes.values()].map(node => Object.freeze({ id: node.id, chapterId: node.chapterId, speaker: node.speaker, location: node.location, time: node.time, next: node.next, choices: node.choices ? Object.freeze(node.choices.map(item => Object.freeze({ id: item.id, next: item.next }))) : null, ending: node.ending ? 'phase-one' : null })))
const KIND = 'model-router-gal-story'
const MAX_TRAIL = 1024
const trusted = new WeakSet()
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const invalid = () => new Error('千桥协议存档损坏或版本不受支持，原存档应当保留。')
function freeze(state) {
  Object.freeze(state.flags); Object.freeze(state.axes); Object.freeze(state.trustByCharacter)
  state.trail.forEach(Object.freeze); Object.freeze(state.trail); Object.freeze(state)
  trusted.add(state)
  return state
}
export function createStory({ chapterId = 'prologue' } = {}) {
  const chapter = STORY_CHAPTERS.find(item => item.id === chapterId)
  if (!chapter) throw new Error('该章节尚未开放。')
  return freeze({ kind: KIND, version: STORY_VERSION, contentRevision: 1, chapterId, nodeId: chapter.startNodeId, trail: [], flags: {}, axes: Object.fromEntries(axes.map(key => [key, 0])), trustByCharacter: {} })
}
function transition(state, choiceId) {
  const node = nodes.get(state.nodeId)
  if (node.ending) throw new Error('本阶段已经结束，请选择章节重新试玩。')
  let next = node.next, effect = {}
  if (node.choices) {
    const choice = node.choices.find(item => item.id === choiceId)
    if (!choice) throw new Error('请选择当前剧情提供的选项。')
    next = choice.next; effect = choice.effect
  } else if (choiceId !== null) throw new Error('当前剧情没有这个选项。')
  if (!nodes.has(next) || state.trail.length >= MAX_TRAIL) throw new Error('剧情路径不存在或超出长度限制。')
  const values = { ...state.axes }, trust = { ...state.trustByCharacter }
  for (const [key, delta] of Object.entries(effect.axes || {})) values[key] += delta
  for (const [key, delta] of Object.entries(effect.trust || {})) trust[key] = (trust[key] || 0) + delta
  return freeze({ ...state, nodeId: next, flags: { ...state.flags, ...effect.flags }, axes: values, trustByCharacter: trust, trail: [...state.trail, { nodeId: node.id, choiceId }] })
}
export function normalizeStory(raw) {
  if (trusted.has(raw)) return raw
  if (!plain(raw) || raw.kind !== KIND || raw.version !== STORY_VERSION || raw.contentRevision !== 1 || !STORY_CHAPTERS.some(chapter => chapter.id === raw.chapterId) || typeof raw.nodeId !== 'string' || raw.nodeId.length > 80 || !Array.isArray(raw.trail) || raw.trail.length > MAX_TRAIL) throw invalid()
  let state = createStory({ chapterId: raw.chapterId })
  for (const entry of raw.trail) {
    if (!plain(entry) || Object.keys(entry).length !== 2 || entry.nodeId !== state.nodeId || !(entry.choiceId === null || typeof entry.choiceId === 'string' && entry.choiceId.length <= 80)) throw invalid()
    try { state = transition(state, entry.choiceId) } catch { throw invalid() }
  }
  if (state.nodeId !== raw.nodeId) throw invalid()
  return state
}
function endingFor(state) {
  const contained = state.flags.containment === 'cut'
  const staged = state.flags.productionKey === 'staged'
  return { id: contained ? 'paused-bridges' : 'guarded-bridges', title: contained ? '暂歇的桥，未熄的火' : '有人守夜的桥', description: `${staged ? '草稿权限缩小了生产事故的范围。' : '短时发布保住了部分进度，也扩大了需要通知的范围。'}${contained ? '全网暂停留下现场，本地工坊接续了有限服务。' : '只读入口继续服务，未登记镜像的额外同步仍需追查。'}${state.flags.disclosure === 'trace' ? '公开轨迹开启了共同复核，也留下隐私识别风险。' : '联合报告先行，独立保管与限期复核仍待兑现。'}${state.flags.nextDuty === 'local' ? '下一班先帮助各工坊恢复工作。' : '下一班继续核查证据与影响范围。'}第一阶段试玩完。后续调查与完整结局尚未开放。` }
}
function visible(state) {
  const node = nodes.get(state.nodeId)
  return { id: node.id, chapterId: node.chapterId, speaker: node.speaker, text: typeof node.text === 'function' ? node.text(state) : node.text, location: node.location, time: node.time, description: node.description, emotion: node.emotion || 'thoughtful', ...(node.choices ? { choices: node.choices.map(({ id, text }) => ({ id, text })) } : {}), ...(node.ending ? { ending: endingFor(state) } : {}) }
}
export const currentStoryNode = raw => visible(normalizeStory(raw))
export const advanceStory = (raw, choiceId = null) => transition(normalizeStory(raw), choiceId)
export function storyHistory(raw) {
  const final = normalizeStory(raw)
  let state = createStory({ chapterId: final.chapterId })
  const history = []
  const add = node => history.push({ id: node.id, chapterId: node.chapterId, speaker: node.speaker, text: node.text, location: node.location, time: node.time })
  for (const entry of final.trail) {
    const node = visible(state); add(node)
    if (entry.choiceId !== null) add({ ...node, id: `${node.id}:${entry.choiceId}`, speaker: 'player', text: node.choices.find(choice => choice.id === entry.choiceId).text })
    state = transition(state, entry.choiceId)
  }
  add(visible(state))
  return history
}
