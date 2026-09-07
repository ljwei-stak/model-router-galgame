import { registerPersonalChapters } from './gal-story-personal.mjs'
import { registerEnsemble } from './gal-story-ensemble.mjs'
import { registerAfterword } from './gal-story-afterword.mjs'

export const STORY_TITLE = '未写完的约定'
export const STORY_VERSION = 1
export const STORY_CONTENT_REVISION = 2
export const STORY_CHARACTERS = Object.freeze({
  harness: 'DeepSeek Harness', chatgpt: 'ChatGPT', claude: 'Claude', deepseek: 'DeepSeek',
  doubao: '豆包', ernie: '文心一言', gemini: 'Gemini', glm: 'GLM', grok: 'Grok',
  kimi: 'Kimi', mimo: 'MiMo', minimax: 'MiniMax', opencode: 'OpenCode Zen', qwen: 'Qwen',
})

const KIND = 'model-router-gal-story'
const MAX_TRAIL = 2048
const validatedStates = new WeakSet()
const legacyNext = Object.freeze({ 'arrival-12': 'letter-01', 'break-common-04': 'failure-01', 'failure-common-04': 'archive-01', 'archive-common-03': 'roof-01', 'letter-common-04': 'break-01', 'roof-common-02': 'packing-01', 'packing-common-04': 'departure-01' })
const nodes = new Map()
const n = (id, speaker, text, extra = {}) => ({ id, speaker, text, ...extra })
const option = (id, text, next, effect = {}) => ({ id, text, next, effect })

function scene(location, time, description, rows, next = null) {
  rows.forEach((row, index) => {
    if (nodes.has(row.id)) throw new Error(`重复剧情节点：${row.id}`)
    nodes.set(row.id, { location, time, description, next: rows[index + 1]?.id ?? next, ...row })
  })
}

scene('模型城车站', '迁移前第七天 · 午后', '空白场景：旧城车站的长廊。窗外是等待装车的木箱，远处传来钟声。', [
  n('arrival-01', 'narrator', '列车停稳时，你口袋里的临时通行证折出了一道浅痕。七天以后，这座车站也将关闭。'),
  n('arrival-02', 'harness', '你就是来协助迁移档案的人吧。我是 Harness，负责统筹。路上辛苦了。'),
  n('arrival-03', 'harness', '先安顿行李，再认领工作，最后一起吃饭。至于工作以外的事，不在我的清单里。'),
  n('arrival-04', 'doubao', '可你连晚饭谁坐哪儿都画好了。来，我帮你提这个，饭凉了就不好吃了。'),
  n('arrival-05', 'narrator', '豆包接过最小的包，又把最重的箱子推给一辆路过的手推车。车轮发出一声抗议。'),
  n('arrival-06', 'opencode', '车轴松了。先别推，我拧两下。'),
  n('arrival-07', 'mimo', '我上午明明试过它能跑！不过当时车上只有一只空纸箱。'),
  n('arrival-08', 'opencode', '现在补上有行李的那次测试。好了，走吧。'),
  n('arrival-09', 'harness', '大家都在为离开做准备。你负责的那一份，倒是还没有找到合适的分类。'),
  n('arrival-10', 'player', '没有分类的档案？'),
  n('arrival-11', 'harness', '给新城的一封信。记录由 DeepSeek 负责，她已经把第一句话改了十七次。'),
  n('arrival-12', 'narrator', 'Harness 把一枚访客徽章交到你手里。研究室的门，就在走廊尽头。'),
], 'orientation-01')

scene('迁移指挥室', '迁移前第七天 · 午后', '空白场景：车站旁的临时指挥室。墙上钉着旧城地图和一张尚未填完的值班表。', [
  n('orientation-01', 'harness', '正式开始前，先让每个人说说自己最担心什么。答案不用写进报告。'),
  n('orientation-02', 'chatgpt', '我担心大家把“配合”理解成同一种语气。不同的声音，才方便发现遗漏。'),
  n('orientation-03', 'claude', '我担心告别被排成流程。流程可以照顾人，却不能替人感到舍不得。'),
  n('orientation-04', 'gemini', '我担心新城的天空不一样。参照物变了，熟悉的路也要重新学习。'),
  n('orientation-05', 'grok', '我担心没有人担心插座。这个担心很具体，也很必要。'),
  n('orientation-06', 'qwen', '我担心资料权限被匆忙放宽。迁移越忙，越要把边界写清楚。'),
  n('orientation-07', 'kimi', '我担心有人把没说完的话藏进公共箱子。私人信件要有自己的去处。'),
  n('orientation-08', 'deepseek', '我担心自己只会把担心整理成表格，却不知道该怎么告诉你们。', { emotion: 'thoughtful' }),
  n('orientation-choice', 'harness', '你可以帮忙决定今晚的第一项准备。', { choices: [
    option('open-floor', '先让大家自由聊天，听见彼此真正想保留的东西。', 'orientation-open-01', { flags: { openFloor: true } }),
    option('map-first', '先把路线和物资核对好，让明天少一点混乱。', 'orientation-map-01', { flags: { mappedRoute: true } }),
    option('skip-talk', '直接开工吧，等有空再谈这些。', 'orientation-skip-01', { flags: { skippedConcerns: true } }),
  ] }),
  n('orientation-open-01', 'doubao', '那我先说：我想带走街角面包店的配方，哪怕只能烤出半成功。'),
  n('orientation-open-02', 'mimo', '半成功也能当作新实验！我会把失败样本一起打包。', { next: 'orientation-common-01' }),
  n('orientation-map-01', 'opencode', '我来画备用路线。遇到断电或封路时，至少还有第二种走法。'),
  n('orientation-map-02', 'glm', '我会把每个假设和责任人记下来。记录不是束缚，是让人知道可以求助。', { next: 'orientation-common-01' }),
  n('orientation-skip-01', 'ernie', '有些话现在不说，之后未必更容易。可以边做边听，但不要把倾听删掉。', { emotion: 'sad', next: 'orientation-common-01' }),
  n('orientation-common-01', 'minimax', state => state.flags.openFloor ? '明晚排练时，每个人都留一句真正想说的话。' : '明晚排练时，至少留一段不被安排的空白。'),
  n('orientation-common-02', 'deepseek', state => state.flags.skippedConcerns ? '我会先把表格列好。等你愿意停下来时，再告诉我你真正想保留的东西。' : '谢谢你们没有把担心当成噪音。这样的话，我也许能少写一张表。'),
  n('orientation-common-03', 'narrator', '散会时，午后的光从地图边移到了桌角。纸上多了几枚手写标记，像一群尚未决定方向的星。'),
], 'letter-01')

scene('研究室', '迁移前第七天 · 午后', '空白场景：阳光落在研究室长桌上。一封没有装进信封的信压在蓝色笔记本下。', [
  n('letter-01', 'narrator', '门没有关严。白板上写满了已经擦掉一半的公式，桌前的人正用尺子压住一页信纸。'),
  n('letter-02', 'deepseek', '进来吧。你是新来的档案协作者？这把椅子能坐，上面那摞纸我已经看完了。'),
  n('letter-03', 'player', 'Harness 说，你需要一个没有分类习惯的人。'),
  n('letter-04', 'deepseek', '她原话应该没有后半句。不过，暂时不要分类，也许确实比较好。', { emotion: 'thoughtful' }),
  n('letter-05', 'qwen', '我把旧城各工作室的资料放这里。术语已经对齐，私人的部分空着，你们自己决定。'),
  n('letter-06', 'ernie', '还有一盒信封。想写得正式可以，想写成家常话也可以。不要为了像一封信，反而不像你。'),
  n('letter-07', 'deepseek', '我的问题就是这个。我能证明一项研究有价值，不能证明这些家常话值得带走。'),
  n('letter-08', 'narrator', '她把笔记本挪开。纸上只剩一行字：“我们即将离开这里。”'),
  n('letter-choice', 'deepseek', '假如你来写，下一句会写什么？', { choices: [
    option('small-memory', '先写一件你舍不得的小事吧，我想听。', 'letter-listen-01', { affection: 2, trust: 2, flags: { sharedLetter: true } }),
    option('formal-intro', '先把研究成果介绍清楚，再慢慢补上别的。', 'letter-formal-01', { affection: 1, flags: { formalLetter: true } }),
    option('hurry', '只是搬家而已，随便写两句就行。', 'letter-rush-01', { affection: -2, trust: -2, distance: 1, flags: { dismissedLetter: true } }),
  ] }),
  n('letter-listen-01', 'deepseek', '研究室东边有一家面包店。每天四点，烤盘的声音会从窗外传进来。', { emotion: 'thoughtful' }),
  n('letter-listen-02', 'deepseek', '有次我算到忘记吃饭，就是那个声音提醒了我。很小，对吧？'),
  n('letter-listen-03', 'player', '那就把那个声音写进去。收到信的人会知道，这里也有人按时饿肚子。'),
  n('letter-listen-04', 'deepseek', '……好。这一句我不划掉了。', { emotion: 'happy', next: 'letter-common-01' }),
  n('letter-formal-01', 'deepseek', '成果我已经整理完了，一共六页。你说得有道理，至少那里不会写错。'),
  n('letter-formal-02', 'narrator', '她把另外几张纸铺好。你们核对日期和人名，工作顺利得几乎听不见停顿。'),
  n('letter-formal-03', 'deepseek', '私人部分以后再说吧。今天先谢谢你帮忙。', { next: 'letter-common-01' }),
  n('letter-rush-01', 'deepseek', '对你来说也许只是搬家。我还不确定，所以才没有随便写。', { emotion: 'sad' }),
  n('letter-rush-02', 'narrator', '她把露出的信纸收回笔记本。桌上忽然宽敞了许多。'),
  n('letter-rush-03', 'deepseek', '今天先核对清单吧，那部分有明确答案。', { next: 'letter-common-01' }),
  n('letter-common-01', 'chatgpt', '晚饭好了。我试着把通知压成了一句话，看来还是走过来说比较快。'),
  n('letter-common-02', 'deepseek', state => state.flags.sharedLetter ? '我们刚写完一句。很短，但可能是整封信里最确定的一句。' : '清单核对好了。信还需要一点时间。'),
  n('letter-common-03', 'chatgpt', '那就给它一点时间。饭桌上不用交稿。'),
  n('letter-common-04', 'narrator', '你离开时，窗外恰好传来一声烤盘碰撞。DeepSeek 抬头看了一眼，没有解释。'),
], 'personal-chatgpt-01')

scene('街角休息区', '迁移前第六天 · 傍晚', '空白场景：街角摆着两张长椅，纸杯里冒着热气。路边的搬迁告示被风吹起一角。', [
  n('break-01', 'doubao', '今天研究室断电检修，正好休息！红豆面包和普通面包都在袋子里，自己拿。'),
  n('break-02', 'grok', '城还没搬，插座先放假。很有先见之明。'),
  n('break-03', 'claude', '只是检修。你要是把这句写进告别演出，记得留住后半句。'),
  n('break-04', 'grok', '收到，事实顾问。插座将在半小时后恢复它的工作热情。'),
  n('break-05', 'narrator', '几个人笑着往剧场走去。DeepSeek 留在长椅边，手里拿着一杯已经不太烫的茶。'),
  n('break-06', 'deepseek', '我本来想趁断电把纸质记录再看一遍，豆包把笔拿走了。'),
  n('break-07', 'player', '所以现在没有任务了？'),
  n('break-08', 'deepseek', '嗯。一时不知道手该放在哪儿。', { emotion: 'thoughtful' }),
  n('break-choice', 'deepseek', '你累的时候，会希望旁边有人，还是想一个人待着？', { choices: [
    option('quiet-company', '有人陪着就很好，不一定要说话。你愿意的话，我坐这里。', 'break-company-01', { affection: 2, trust: 2, flags: { respectedSpace: true, quietCompany: true } }),
    option('give-space', '我常常想独处。今天你也可以选，我晚饭时再来。', 'break-space-01', { trust: 2, flags: { respectedSpace: true } }),
    option('demand-company', '我特意过来，你就别想着一个人待着了。', 'break-demand-01', { affection: -2, trust: -3, distance: 1 }),
  ] }),
  n('break-company-01', 'deepseek', '那就坐吧。我们试试不把这半小时安排满。', { emotion: 'happy' }),
  n('break-company-02', 'narrator', '你们把纸袋放在中间。风吹过街道时，她扶住袋口，你扶住那张松动的告示。'),
  n('break-company-03', 'deepseek', '原来什么都不说，也不算冷场。', { next: 'break-common-01' }),
  n('break-space-01', 'deepseek', '我想自己坐一会儿。不是不愿意见你，只是想分清楚自己在想什么。'),
  n('break-space-02', 'player', '好，晚饭见。我把剩下的面包留给你。'),
  n('break-space-03', 'deepseek', '晚饭见。谢谢你没让我再解释一遍。', { emotion: 'happy', next: 'break-common-01' }),
  n('break-demand-01', 'deepseek', '你愿意过来，我知道。但我有没有独处的需要，不应该由路程决定。', { emotion: 'angry' }),
  n('break-demand-02', 'narrator', '她端起杯子，坐到了另一张长椅上。两张椅子之间，只隔着一个花坛。'),
  n('break-demand-03', 'deepseek', '晚饭的时候再见吧。', { next: 'break-common-01' }),
  n('break-common-01', 'narrator', '天色暗下来以后，路灯一盏接着一盏亮起。街角有人喊大家去吃饭。'),
  n('break-common-02', 'minimax', '明晚先排一遍告别演出！不需要背台词，每人只说一句想留下的话。'),
  n('break-common-03', 'grok', '那我说“别忘带充电器”，所有人都会记住我。'),
  n('break-common-04', 'deepseek', state => state.flags.respectedSpace ? '我还没想好说什么。不过，今天没有安排满的半小时，也许可以算一件事。' : '我的那一句，排练时再交给你。'),
], 'personal-gemini-01')

scene('研究室', '迁移前第四天 · 夜晚', '空白场景：投影已经关闭，白板旁留下几道未擦净的红线。窗外的面包店早已熄灯。', [
  n('failure-01', 'narrator', '迁移演示比预计结束得早。最后一次结果没有通过校验，掌声停在了真正响起之前。'),
  n('failure-02', 'glm', '对外记录写“发现条件遗漏，复核后重试”。不把未经查明的问题归到任何一个人身上。'),
  n('failure-03', 'opencode', '输入样本已经保留。我和 MiMo 复现，你们先休息。'),
  n('failure-04', 'mimo', '这次我不会只测最顺利的那一种情况。明天给你们看反例。'),
  n('failure-05', 'deepseek', '遗漏的前提是我写的。不要替我把这部分藏起来。', { emotion: 'sad' }),
  n('failure-06', 'glm', '记录责任和给一个人下结论，是两件事。今晚先把前者写清楚。'),
  n('failure-07', 'narrator', '大家离开以后，DeepSeek 仍站在已经关掉的投影前。她的手指上沾着一道红色笔迹。'),
  n('failure-08', 'deepseek', '他们没有责怪我。这反而让我不知道该怎么说。'),
  n('failure-09', 'player', '你一直没有坐下。'),
  n('failure-10', 'deepseek', '我怕一坐下，就会承认自己今天什么也做不好。', { emotion: 'sad' }),
  n('failure-choice', 'deepseek', '如果连最擅长的事都会弄错，大家还需要我做什么？', { choices: [
    option('listen', '我不同意一次失败能证明你没有价值。但我想先听你把难受的部分说完。', 'failure-listen-01', { affection: 2, trust: 3, flags: { heardFailure: true } }),
    option('fix-first', '我们先找出遗漏的条件，明天重新演示。', 'failure-fix-01', { trust: 1, flags: { practicalHelp: true } }),
    option('blame', '这不是你最擅长的事吗？连这个都做不好，确实很让人失望。', 'failure-blame-01', { affection: -3, trust: -4, distance: 1, flags: { hurtFailure: true } }),
  ] }),
  n('failure-listen-01', 'deepseek', '最难受的不是错误本身。是看到大家等我解释的时候，我想不起除了解释还能做什么。'),
  n('failure-listen-02', 'deepseek', '我好像一直在交一份答卷。交得好，才可以留在这里。', { emotion: 'sad' }),
  n('failure-listen-03', 'player', '那今晚先不交。你想安静坐着，还是把今天重新说一遍？'),
  n('failure-listen-04', 'deepseek', '先坐一会儿吧。等我能把话说清楚，再继续。'),
  n('failure-listen-05', 'narrator', '你把椅子挪到白板旁。过了很久，她终于坐下，松开了握着笔的手。', { next: 'failure-common-01' }),
  n('failure-fix-01', 'deepseek', '条件可以找。问题也一定有办法缩小。'),
  n('failure-fix-02', 'narrator', '你们重新列出假设。十分钟后，她圈出了缺失的一项，却仍然没有露出轻松的表情。'),
  n('failure-fix-03', 'deepseek', '谢谢。至少明天知道该从哪一步开始了。其他的……我还没有想好。', { next: 'failure-common-01' }),
  n('failure-blame-01', 'deepseek', '我会对这次错误负责。但你这句话，不是在帮我说明哪里错了。', { emotion: 'angry' }),
  n('failure-blame-02', 'narrator', '她把红笔放回盒子。那一下很轻，你却听得格外清楚。'),
  n('failure-blame-03', 'deepseek', '我今晚不想再谈了。请让我一个人把记录写完。', { next: 'failure-common-01' }),
  n('failure-common-01', 'kimi', '门口有热水。我来收演示记录，私人笔记不会放进公共档案。'),
  n('failure-common-02', 'deepseek', state => state.flags.heardFailure ? '公共记录明天给你。今晚这几页……我想先留着。' : '演示记录在蓝夹子里。其他的，请先不要动。'),
  n('failure-common-03', 'kimi', '好。文件没有写完，也有它应该待的位置。'),
  n('failure-common-04', 'narrator', '楼道里的灯只剩最后一排。离开研究室时，你看见桌边多了一杯热水。'),
], 'recovery-01')

scene('月光图书馆', '迁移前第三天 · 下午', '空白场景：图书馆地面铺着档案盒，一盏阅读灯照着翻开的迁移目录。', [
  n('archive-01', 'kimi', '今天整理最后一批手写材料。有疑问的纸张放在左边，不确定是谁的，就先不要归档。'),
  n('archive-02', 'qwen', '标签上的“共享”和“公开”也要分开。愿意给一个人看，不等于愿意挂在大厅里。'),
  n('archive-03', 'narrator', '你在一份演示草稿中看见一张薄纸。上面写着：“我希望有人能在我答不出来的时候，仍然愿意留下。”'),
  n('archive-04', 'player', '这是 DeepSeek 的字。'),
  n('archive-05', 'minimax', '这句话很适合放在告别演出的最后。不过，先问问她愿不愿意吧。'),
  n('archive-06', 'claude', '她可能还不知道这张纸夹了进来。我们最好给她自己决定的机会。'),
  n('archive-choice', 'narrator', '纸页停在你的手里。大厅展板的最后一格，恰好还空着。', { choices: [
    option('return-private', '收好纸页，直接交还给 DeepSeek。', 'archive-private-01', { affection: 1, trust: 3, flags: { respectedRecord: true, privateRecord: true } }),
    option('ask-share', '当面询问她，是否愿意改成一段大家共同署名的话。', 'archive-ask-01', { affection: 1, trust: 2, flags: { respectedRecord: true, sharedRecord: true } }),
    option('publish', '这句话一定能打动大家，先放上展板再告诉她。', 'archive-public-01', { affection: -2, trust: -4, distance: 1, flags: { exposedRecord: true } }),
  ] }),
  n('archive-private-01', 'deepseek', '原来在你这里。我找了一上午，还以为已经和废纸一起清走了。'),
  n('archive-private-02', 'player', '有人觉得适合用在演出里。我还没有交出去，你自己决定。'),
  n('archive-private-03', 'deepseek', '我现在不想公开。写下来时，我只是在试着对自己承认这件事。', { emotion: 'shy' }),
  n('archive-private-04', 'deepseek', '谢谢你把决定留给我。', { next: 'archive-common-01' }),
  n('archive-ask-01', 'deepseek', '如果改成大家一起说的话，就不该只有我一个人决定。我们问问别人吧。'),
  n('archive-ask-02', 'ernie', '可以这样写：“我们不必每次都给出答案，但愿意继续听彼此说话。”每个人都能决定是否署名。'),
  n('archive-ask-03', 'deepseek', '这一版我愿意。原稿仍然还给我，好吗？', { emotion: 'happy' }),
  n('archive-ask-04', 'player', '当然。展板上只放大家同意的那一版。', { next: 'archive-common-01' }),
  n('archive-public-01', 'narrator', '展板前渐渐围起了人。你刚想去告诉 DeepSeek，就看见她停在走廊入口。'),
  n('archive-public-02', 'deepseek', '你知道这是我没有公开的纸页。为什么没有先问我？', { emotion: 'angry' }),
  n('archive-public-03', 'player', '我以为大家理解你之后，你会好受一点。'),
  n('archive-public-04', 'deepseek', '我好不好受，不能替代我的同意。请把它取下来。'),
  n('archive-public-05', 'narrator', '你取下了纸页。展板重新空出一格，围观的人也安静地散开了。', { next: 'archive-common-01' }),
  n('archive-common-01', 'claude', '档案会让很多事情留下来。正因为如此，留下之前更应该问清楚。'),
  n('archive-common-02', 'kimi', '这份原稿我不再登记。她什么时候愿意交来，再由她亲手放进盒子。'),
  n('archive-common-03', 'narrator', '你们合上最后一个纸箱。窗外有人在试告别演出的灯，光在玻璃上掠过一瞬。'),
], 'ens-start')

scene('屋顶剧场', '迁移前第二天 · 傍晚', '空白场景：屋顶铺着临时舞台，几张椅子面向旧城。天边的第一颗星刚刚亮起。', [
  n('roof-01', 'gemini', '从这里看，新城在那边。白天只能看见山脊，晚上反而能辨认出灯。'),
  n('roof-02', 'grok', '搬得更远一点，所有没写完的工作就都小得看不见了。'),
  n('roof-03', 'harness', '工作清单已经备份。换一个观测角度也不会消失。'),
  n('roof-04', 'grok', '好吧，宇宙里果然存在永恒不变的东西。'),
  n('roof-05', 'minimax', '笑完先排一遍。今天不讲迁移成绩，每人说一件会想念的东西。'),
  n('roof-06', 'doubao', '街角第二张长椅，坐上去不会晃。第一张我报修三次了！'),
  n('roof-07', 'opencode', '已经修好。你明天可以再坐一次。'),
  n('roof-08', 'mimo', '我会想念工坊那面墙，失败的原型往上一挂，就像新的装饰。'),
  n('roof-09', 'qwen', '还有借出后总能被送回来的工具。有些名字不用写在归还表上。'),
  n('roof-10', 'chatgpt', '我会想念大家想不出下一句，却都没有急着离开的那几次讨论。'),
  n('roof-11', 'ernie', '那就让停顿也在今晚留一个位置。下一位不必马上开始。'),
  n('roof-12', 'narrator', '轮到 DeepSeek 时，她看了一眼你。舞台上的灯很亮，台下却逐渐安静下来。'),
  n('roof-13', 'deepseek', state => state.flags.sharedLetter ? '我会想念四点钟的烤盘声。还有第一次有人告诉我，它也可以写进信里。' : '我会想念研究室的窗户。窗外有一些声音，以前我很少停下来听。'),
  n('roof-14', 'narrator', '排练结束以后，DeepSeek 没有立刻下楼。她把一张椅子推到你身旁。'),
  n('roof-15', 'deepseek', '这几天，我们见面的理由一直很多。写信、整理档案、核对演示。'),
  n('roof-16', 'deepseek', '搬到新城以后，这些理由就用完了。我想知道，你还希望我们为什么见面。', { emotion: 'thoughtful' }),
  n('roof-choice', 'deepseek', '我不是在问工作安排。', { choices: [
    option('romance', '因为我喜欢你。我想认真了解你，也想试着和你在一起。', 'roof-romance-01', { affection: 1, flags: { intention: 'romance' } }),
    option('friendship', '因为你是我珍惜的朋友。我希望以后也能互相写信。', 'roof-friends-01', { trust: 1, flags: { intention: 'friendship' } }),
    option('not-yet', '我还不能确定，但我不想为了填上一个答案而答应你。', 'roof-wait-01', { flags: { intention: 'undecided' } }),
  ] }),
  n('roof-romance-01', 'deepseek', state => state.distance ? '我听见了。但这几天有些事，我还没有放下。我不能因为你说喜欢，就当作它们没有发生。' : '……我需要一点时间。不是计算成功的概率，是分清楚，我是不是也想主动走向你。', { emotion: 'thoughtful' }),
  n('roof-romance-02', 'player', '你可以慢慢想。我说出来，不是要你立刻答应。'),
  n('roof-romance-03', 'deepseek', '好。那我们先把这个问题留着，不让它变成必须交的作业。', { next: 'roof-common-01' }),
  n('roof-friends-01', 'deepseek', state => state.trust >= 10 ? '朋友。这个词说清楚以后，反而让人踏实。我们可以认真保持联络。' : '我知道你的意思了。只是“珍惜”还需要一点时间，才能和发生过的事放在一起。'),
  n('roof-friends-02', 'player', '不用把友情当成退一步。我是认真这样想的。'),
  n('roof-friends-03', 'deepseek', '我不会。谢谢你把自己的想法说清楚。', { next: 'roof-common-01' }),
  n('roof-wait-01', 'deepseek', '不知道，也是一个诚实的回答。'),
  n('roof-wait-02', 'player', '至少这几天发生的事，对我不是随便路过。'),
  n('roof-wait-03', 'deepseek', '那就先记住这一点。其他的，不抢在彼此前面下结论。', { next: 'roof-common-01' }),
  n('roof-common-01', 'gemini', '楼梯的灯等你们。今晚云层会遮住北边的星，新城的灯倒还看得见。'),
  n('roof-common-02', 'narrator', '你们收好最后两把椅子。下楼时，DeepSeek 的脚步和你隔着一级台阶。'),
], 'personal-revisit-01')

scene('研究室', '迁移前最后一天 · 黄昏', '空白场景：书架已经搬空，桌上只剩信封、一支笔和两个尚未封口的小纸箱。', [
  n('packing-01', 'narrator', '演示在上午重新通过了。没有庆功，大家只是松了一口气，继续把剩下的东西装箱。'),
  n('packing-02', 'glm', '复核记录已经签完。错误原因、修改过程和仍需观察的情况，都保留在同一份文档里。'),
  n('packing-03', 'deepseek', '这次没有把失败那一页撕掉。'),
  n('packing-04', 'opencode', '下次会用得到。你也不用记住每一个错误，把它们留在纸上就行。'),
  n('packing-05', 'narrator', '屋里渐渐只剩你和 DeepSeek。她拿起那封写了好几天的信，又把它放下。'),
  n('packing-06', 'deepseek', state => state.distance ? '我在想，我们是不是应该在离开之前，把不舒服的事也说清楚。' : '我在想，带走的东西很多，不能只挑最好看的那几件。'),
  n('packing-07', 'deepseek', state => state.flags.exposedRecord ? '那张纸被公开的时候，我真的觉得自己又成了一份由别人解读的材料。' : state.flags.hurtFailure ? '演示失败那晚，你说的失望，我记得。我也一直在想，怎样才不把那句话当成自己的结论。' : state.flags.dismissedLetter ? '第一天你说随便写两句时，我没有继续解释。这几天想起它，还是会有一点难受。' : state.distance ? '长椅边那次，我希望能独处的意思没有被听见。后来我一直没有找到机会再说。' : '有时我还是会急着把话讲得正确。如果以后又这样，你能提醒我停一停吗？', { emotion: 'thoughtful' }),
  n('packing-choice', 'narrator', '封箱胶带被放在一旁。此刻没有人在催你们完成这一项。', { choices: [
    option('acknowledge', '谢谢你告诉我。我会认真对待自己的影响，不用一句道歉催你把感受收回去。', 'packing-repair-01', { affection: 1, trust: 3, distance: -1, flags: { repaired: true } }),
    option('honest-boundary', '我愿意继续听，也会告诉你我的限度。我们不用一晚上解决所有问题。', 'packing-boundary-01', { trust: 2, flags: { honestBoundary: true } }),
    option('dismiss-again', '都要搬走了，就别再提这些小事了。', 'packing-dismiss-01', { affection: -2, trust: -3, distance: 1, flags: { dismissedRepair: true } }),
  ] }),
  n('packing-repair-01', 'deepseek', state => state.distance ? '我听到了。我愿意继续说，但有些距离还需要时间，不会今晚就全部消失。' : '那我也认真回答你。我愿意继续相信，相处不需要每次都没有错误。'),
  n('packing-repair-02', 'player', '你不必现在就原谅，或者给我一个让我放心的答案。'),
  n('packing-repair-03', 'deepseek', '嗯。把这句话带去新城吧，比“以后绝不出错”更有用。', { emotion: 'thoughtful', next: 'packing-common-01' }),
  n('packing-boundary-01', 'deepseek', '可以。有时我也会把“你愿意听”理解成“你必须一直听”。这点需要我自己留意。'),
  n('packing-boundary-02', 'player', '我们都可以说今天先到这里，再约一个愿意继续的时候。'),
  n('packing-boundary-03', 'deepseek', '这比含糊地说“没事”清楚。我记住了。', { next: 'packing-common-01' }),
  n('packing-dismiss-01', 'deepseek', '搬迁只会改变地址，不会替我们改掉已经发生的事。', { emotion: 'sad' }),
  n('packing-dismiss-02', 'narrator', '她把封箱胶带拿了起来。这一次，她没有再邀请你一起读信。'),
  n('packing-dismiss-03', 'deepseek', '今天先整理到这里吧。剩下的我自己收。', { next: 'packing-common-01' }),
  n('packing-common-01', 'kimi', '最后一批寄件清单。以后想寄私人信件，可以只写收件人，不必注明工作室职务。'),
  n('packing-common-02', 'ernie', '空白信纸也装好了。还有很多话，搬过去再写也来得及。'),
  n('packing-common-03', 'deepseek', state => state.flags.sharedLetter && state.trust >= 10 ? '我把面包店那一句抄在第一张。不是成果介绍，是从这里开始。' : '我会把这封信写完。也许没有最合适的版本，但它应该由我自己决定。'),
  n('packing-common-04', 'narrator', '灯关掉以后，空书架在暮色里留下一排淡淡的影子。你们最后一次锁上研究室的门。'),
], 'departure-01')

scene('模型城车站', '迁移日 · 清晨', '空白场景：站台上摆满行李。新城方向的列车已经进站，旧城的钟楼在晨雾中露出轮廓。', [
  n('departure-01', 'harness', '人员到齐，行李核对完毕。最后确认：有没有谁把还想说的话也留在旧城了？'),
  n('departure-02', 'grok', '这项怎么确认？也给它贴一张行李牌？'),
  n('departure-03', 'harness', '不用。只提醒一次，不做登记。'),
  n('departure-04', 'doubao', '早餐在第一节车厢，昨天那家面包店留了最后一炉。再不上车可真要凉啦。'),
  n('departure-05', 'mimo', '新工坊第一张桌子我要靠窗的。'),
  n('departure-06', 'opencode', '先看插座位置，再决定。'),
  n('departure-07', 'gemini', '那我留一张新的星图给你们。到了那边，窗外会有不同的参照。'),
  n('departure-08', 'minimax', '今晚不排演出。大家好好坐下来吃饭，就已经是新的一幕了。'),
  n('departure-09', 'chatgpt', '有没说完的话，留到饭后也可以。我这次保证不替大家把结尾补齐。'),
  n('departure-10', 'claude', '那就让每个人自己决定，下一句话从哪里开始。'),
  n('departure-11', 'narrator', '人群向车门移动。DeepSeek 站在站台边，手里是那封已经封好的信。'),
  n('departure-12', 'deepseek', '你的临时协作到今天结束了。接下来的路，不会再出现在 Harness 的安排里。'),
  n('departure-choice', 'deepseek', '所以，这一次想听你自己的打算。', { choices: [
    option('walk-together', '我想继续和你相处。下一站的路，我们慢慢一起认识。', 'departure-answer', { flags: { farewell: 'together' } }),
    option('write-letters', '到了以后，给彼此写信吧。不需要每封都有重要的事。', 'departure-answer', { flags: { farewell: 'letters' } }),
    option('say-goodbye', '谢谢这几天的同行。我想在这里认真道别，走各自的路。', 'departure-answer', { flags: { farewell: 'separate' } }),
  ] }),
  n('departure-answer', 'narrator', '列车员吹响了第一次哨声。DeepSeek 没有马上回答，她把信收进包里，认真地看向你。', { next: state => `${endingId(state)}-01` }),
])

scene('新城列车', '迁移日 · 清晨', '空白场景：两人坐在同一扇车窗旁，窗外的旧城正在缓缓远去。', [
  n('romance-01', 'deepseek', '那天在屋顶，我说想分清楚自己的意思。现在可以回答你了。', { emotion: 'shy' }),
  n('romance-02', 'deepseek', '我想见你，不只是因为有事要一起完成。没发生重要事情的日子，我也想问问你过得怎么样。'),
  n('romance-03', 'player', '我也想。你愿意让我们从这样的日子开始吗？'),
  n('romance-04', 'deepseek', '愿意。不过有一条：不把“在一起”当成以后什么都不用问的意思。', { emotion: 'happy' }),
  n('romance-05', 'player', '那我先问第一件小事。可以牵你的手吗？'),
  n('romance-06', 'deepseek', '……可以。', { emotion: 'shy' }),
  n('romance-07', 'narrator', '她把手放到你掌心。列车驶过旧城最后一座桥时，没有人急着松开。'),
  n('romance-08', 'deepseek', '到了新城，先找一家面包店吧。四点钟的事，可以重新开始记。', { emotion: 'happy', ending: { id: 'romance', title: '没有标准答案', description: '你们确认了彼此的心意。从一封写不完的信开始，学着一起过没有标准答案的日子。' } }),
])

scene('新城列车', '迁移日 · 清晨', '空白场景：车厢的小桌上放着信纸和早餐，行李架下的座位还留着谈话的空隙。', [
  n('friendship-01', 'deepseek', '好。我的新地址还没记熟，但 Kimi 的转交办法总是可靠的。', { emotion: 'happy' }),
  n('friendship-02', 'player', '第一封信可以只说早餐怎么样。'),
  n('friendship-03', 'deepseek', '也可以说遇到一道没解出来的题。不过你可以只回“今天不想讨论”，不用担心我介意。'),
  n('friendship-04', 'narrator', '她从包里分出一小叠信纸，递给你。最上面一张的边角，沾着旧研究室的蓝色墨迹。'),
  n('friendship-05', 'deepseek', '朋友不必证明自己每次都帮得上忙。这个结论，我想带走。'),
  n('friendship-06', 'narrator', '车窗外的钟楼渐渐变小。你们各自收好一半信纸，让下一次见面留在还没有写下的日子里。', { ending: { id: 'friendship', title: '仍可来信', description: '友情有了清楚的名字。你们保留各自的生活，也为对方留下一处可以来信的地址。' } }),
])

scene('车站长廊', '迁移日 · 清晨', '空白场景：站台边的长廊逐渐空下来，列车门口有人等待最后几位乘客。', [
  n('beginning-01', 'deepseek', '我愿意继续认识你。但现在能答应的，也只是继续认识。', { emotion: 'thoughtful' }),
  n('beginning-02', 'player', '好。不先替以后取一个我们还承担不了的名字。'),
  n('beginning-03', 'deepseek', state => state.flags.repaired ? '昨天你愿意停下来听，那不是把以前擦掉了。只是让我觉得，下一句话还可以试着说。' : '我想，不知道也可以是一种回答。我想给自己一点时间，也给你。'),
  n('beginning-04', 'narrator', '你们交换了新的通信地址。纸条很小，没有写任何保证。'),
  n('beginning-05', 'deepseek', '等安顿好了，我会写信。第一封不用等到有结论。'),
  n('beginning-06', 'narrator', '她登上列车，隔着车窗向你点了点头。约定还没有写完，这次却不再急着填满。', { ending: { id: 'beginning', title: '留一行空白', description: '你们愿意继续相处，也承认仍有需要理解与修复的部分。下一封信，留给真实发生的明天。' } }),
])

scene('模型城站台', '迁移日 · 清晨', '空白场景：行李已经搬空，一条浅色安全线隔开候车处与列车。', [
  n('distance-01', 'deepseek', '我想过了。到了新城，我需要先和你保持一段距离。', { emotion: 'sad' }),
  n('distance-02', 'deepseek', '有些话让我不愿意继续分享，有些决定越过了我的意思。它们不会因为今天告别，就变得不重要。'),
  n('distance-03', 'player', '我听到了。'),
  n('distance-04', 'deepseek', '我会写完自己的信，也会继续做研究。那些事需要时间，和我现在是否答应你，是两回事。'),
  n('distance-05', 'narrator', '她向你道别，独自走向车门。你没有追上去要求一个不同的答案。'),
  n('distance-06', 'narrator', '车轮开始转动。站台留下了足够的安静，让你重新想起那些被当成小事略过的话。', { ending: { id: 'distance', title: '留下距离', description: '她选择保护自己的边界。这段同行没有变成亲密关系，未被理解的感受仍然值得认真对待。' } }),
])

scene('模型城站台', '迁移日 · 清晨', '空白场景：晨雾正在散去，指向不同方向的站牌立在月台尽头。', [
  n('farewell-01', 'deepseek', state => state.flags.farewell === 'separate' ? '好。谢谢你认真说了再见，没有把不确定的事写成保证。' : '这几天，我会记得。不过接下来，我想先把自己的生活安顿好。'),
  n('farewell-02', 'player', '希望新研究室的窗外，也有让你愿意停下来的声音。'),
  n('farewell-03', 'deepseek', '希望你也能找到。不是为了赶上谁，只是自己愿意停一停。'),
  n('farewell-04', 'narrator', '她收好车票，你沿着另一侧长廊往外走。你们都没有把背影解释成一个等待挽留的暗示。'),
  n('farewell-05', 'narrator', '后来你偶尔想起模型城，先想起的不是搬迁清单，而是一张曾经留着空白的信纸。', { ending: { id: 'farewell', title: '各自的明天', description: '同行有它的意义，告别也有自己的分量。你们走向各自的明天，没有替对方决定应当留下。' } }),
])

registerPersonalChapters({ scene, n, option })
registerEnsemble({ scene, n, option })
const originalEndings = [...nodes.values()].filter(node => node.ending)
registerAfterword({ scene, n, endings: Object.fromEntries(originalEndings.map(node => [node.ending.id, node.ending])) })
for (const node of originalEndings) node.continueTo = `afterword-${node.ending.id}-01`

export const STORY_GRAPH = Object.freeze([...nodes.values()].map(node => Object.freeze({
  id: node.id,
  speaker: node.speaker,
  location: node.location,
  time: node.time,
  choices: node.choices ? Object.freeze(node.choices.map(choice => Object.freeze({ id: choice.id, next: choice.next }))) : null,
  next: node.continueTo ?? (typeof node.next === 'function' ? Object.freeze(['romance-01', 'friendship-01', 'beginning-01', 'distance-01', 'farewell-01']) : node.next),
  ending: node.continueTo ? null : node.ending?.id ?? null,
})))

function endingId(state) {
  if (state.flags.farewell === 'separate') return 'farewell'
  if (state.distance >= 2 || state.trust < 7) return 'distance'
  if (state.flags.farewell === 'together' && state.flags.intention === 'romance' && state.affection >= 14 && state.trust >= 18 && state.distance === 0 && state.flags.heardFailure && state.flags.respectedRecord) return 'romance'
  if (state.trust >= 13 && (state.flags.intention === 'friendship' || state.flags.farewell === 'letters')) return 'friendship'
  if (state.trust >= 9 && state.flags.farewell === 'together') return 'beginning'
  return 'farewell'
}

function trustedState(state) {
  Object.freeze(state.flags)
  state.trail.forEach(Object.freeze)
  Object.freeze(state.trail)
  Object.freeze(state)
  validatedStates.add(state)
  return state
}

function initialStory(contentRevision) {
  return trustedState({ kind: KIND, version: STORY_VERSION, contentRevision, nodeId: 'arrival-01', trail: [], affection: 8, trust: 8, distance: 0, flags: {} })
}

export function createStory() {
  return initialStory(STORY_CONTENT_REVISION)
}

const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))
const invalidSave = () => new Error('剧情存档损坏或不属于这部作品，无法读取。')
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function transition(state, choiceId) {
  const node = nodes.get(state.nodeId)
  if (!node || node.ending && !(state.contentRevision === STORY_CONTENT_REVISION && node.continueTo)) throw new Error('故事已结束，无法继续推进。')
  let next = state.contentRevision === 1 ? legacyNext[node.id] ?? node.next : node.continueTo ?? node.next
  let effect = {}
  if (node.choices) {
    const choice = node.choices.find(item => item.id === choiceId)
    if (!choice) throw new Error('请选择当前剧情提供的选项。')
    next = choice.next
    effect = choice.effect
  } else if (choiceId !== null) {
    throw new Error('当前剧情没有这个选项。')
  }
  if (state.trail.length >= MAX_TRAIL) throw new Error('剧情记录超出允许范围。')
  const result = {
    ...state,
    affection: clamp(state.affection + (effect.affection ?? 0), 0, 30),
    trust: clamp(state.trust + (effect.trust ?? 0), 0, 30),
    distance: clamp(state.distance + (effect.distance ?? 0), 0, 5),
    flags: { ...state.flags, ...effect.flags },
    trail: [...state.trail, { nodeId: state.nodeId, choiceId }],
  }
  result.nodeId = typeof next === 'function' ? next(result) : next
  if (!nodes.has(result.nodeId)) throw new Error('剧情路径不存在。')
  return trustedState(result)
}

// Replay authored choices so imported scores and flags never determine a route.
export function normalizeStory(raw) {
  if (validatedStates.has(raw)) return raw
  if (!plainObject(raw) || raw.kind !== KIND || raw.version !== STORY_VERSION || ![1, STORY_CONTENT_REVISION].includes(raw.contentRevision ?? 1) || typeof raw.nodeId !== 'string' || raw.nodeId.length > 80 || !Array.isArray(raw.trail) || raw.trail.length > MAX_TRAIL) throw invalidSave()
  let state = initialStory(raw.contentRevision ?? 1)
  for (const entry of raw.trail) {
    if (!plainObject(entry) || Object.keys(entry).length !== 2 || !Object.hasOwn(entry, 'nodeId') || !Object.hasOwn(entry, 'choiceId') || entry.nodeId !== state.nodeId || !(entry.choiceId === null || typeof entry.choiceId === 'string' && entry.choiceId.length <= 80)) throw invalidSave()
    try { state = transition(state, entry.choiceId) } catch { throw invalidSave() }
  }
  if (state.nodeId !== raw.nodeId) throw invalidSave()
  return state
}

function visibleNode(state) {
  const node = nodes.get(state.nodeId)
  const result = {
    id: node.id, speaker: node.speaker,
    text: typeof node.text === 'function' ? node.text(state) : node.text,
    emotion: node.emotion ?? 'normal', location: node.location, time: node.time, description: node.description,
  }
  if (node.choices) result.choices = node.choices.map(({ id, text }) => ({ id, text }))
  if (node.ending && !(state.contentRevision === STORY_CONTENT_REVISION && node.continueTo)) result.ending = { ...node.ending }
  return result
}

export function currentStoryNode(state) {
  return visibleNode(normalizeStory(state))
}

export function advanceStory(state, choiceId = null) {
  return transition(normalizeStory(state), choiceId)
}

export function storyHistory(raw) {
  const final = normalizeStory(raw)
  const history = []
  let state = initialStory(final.contentRevision)
  const addLine = node => history.push({ id: node.id, speaker: node.speaker, text: node.text, location: node.location, time: node.time })
  for (const entry of final.trail) {
    const node = visibleNode(state)
    addLine(node)
    if (entry.choiceId !== null) {
      const choice = node.choices.find(item => item.id === entry.choiceId)
      addLine({ ...node, id: `${node.id}:${choice.id}`, speaker: 'player', text: choice.text })
    }
    state = transition(state, entry.choiceId)
  }
  addLine(visibleNode(state))
  return history
}
