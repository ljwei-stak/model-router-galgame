import React, { useState } from 'react'
import { GalDialogue } from './GalDialogue.jsx'
import { DIALOGUE_THEMES } from './gal-dialogue-themes.mjs'
import { CHARACTER_IMAGES } from './characters.mjs'
import { Panel } from './gal-game-controls.jsx'

const lines = {
  harness: '大家都到齐了。路线我来安排，想走哪一条，由你自己决定。',
  chatgpt: '这封信不必一开始就写得完美。我们可以先留下你最想说的那句话。',
  claude: '我会认真听。不过，在替你做决定之前，我想先知道你的意愿。',
  deepseek: '这一次，我想先把答案放在一边。你愿意再陪我坐一会儿吗？',
  doubao: '水还温着呢。你慢慢说，今天又没有人催我们交报告。',
  ernie: '旧城有一句话，叫作见字如面。把名字写上，也是一次郑重的相见。',
  gemini: '你看，窗里的倒影和纸上的地图不一样。我们去另一边看看吧。',
  glm: '我把没做完的事情留在了清单上。休息也应该有自己的位置。',
  grok: '完美告别？听起来可疑。我宁愿你说一句真的舍不得。',
  kimi: '别急着翻到最后一页。这张没有署名的便笺，也有人认真保存过。',
  mimo: '不如先把第一盏灯接上。它亮起来的时候，我们就知道下一步了。',
  minimax: '这一幕不用排练。等你真的想开口，我再把灯光转向你。',
  opencode: '我检查过门锁和电源了。你们放心去吧，最后一遍我来确认。',
  qwen: '不同语言里的再见，未必都是离别。有时也是约好下一次相见。',
}

export function GalDialogueGallery({ onClose, scene, assetsMap }) {
  const [character, setCharacter] = useState('deepseek')
  return <Panel title="对话框图鉴" wide onClose={onClose}>
    <div className="gg-gallery-roster" role="group" aria-label="模型娘">
      {Object.entries(DIALOGUE_THEMES).map(([key, theme]) => <button type="button" key={key} data-frame-character={key} aria-pressed={character === key} onClick={() => setCharacter(key)}><img src={CHARACTER_IMAGES[key]} alt="" />{theme.name}</button>)}
    </div>
    <div className="gg-gallery-preview"><img className="gg-gallery-portrait" src={CHARACTER_IMAGES[character]} alt={DIALOGUE_THEMES[character].name} /><GalDialogue character={character} text={lines[character]} scene={scene} assetsMap={assetsMap} /></div>
  </Panel>
}
