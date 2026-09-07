const theme = (name, subtitle, motif, accent, ink, paper, line) => Object.freeze({ name, subtitle, motif, accent, ink, paper, line })

export const DIALOGUE_THEMES = Object.freeze({
  harness: theme('DeepSeek Harness', '总管家', 'compass', '#467b91', '#eef6fb', '#203a48', '#8bb1be'),
  chatgpt: theme('ChatGPT', '全能学姐', 'notebook', '#d47b67', '#514544', '#fffaf7', '#e1b5a7'),
  claude: theme('Claude', '月光图书管理员', 'book', '#91819f', '#e9e3ef', '#383340', '#b3a4bf'),
  deepseek: theme('DeepSeek', '小深', 'graph', '#73bacf', '#ebf7fb', '#213847', '#78a5b7'),
  doubao: theme('豆包', '街角行动派', 'speech', '#78a744', '#34452c', '#fbfff5', '#a7c57c'),
  ernie: theme('文心一言', '古典编辑', 'scroll', '#aa534d', '#51463e', '#fffaf5', '#c99582'),
  gemini: theme('Gemini', '星图观测员', 'observatory', '#abaddf', '#edf1ff', '#2e344f', '#8e9cba'),
  glm: theme('GLM', '端正策士', 'seal', '#c4a36e', '#fff3e7', '#563437', '#cba77b'),
  grok: theme('Grok', '叛逆喜剧家', 'electric', '#69c7e7', '#f3f7f9', '#292c34', '#7ba3b4'),
  kimi: theme('Kimi', '长夜档案员', 'archive', '#a3a2d3', '#eeedf9', '#333445', '#8187aa'),
  mimo: theme('MiMo', '轻装实验员', 'laboratory', '#52a89e', '#345154', '#f4fffd', '#8dc8be'),
  minimax: theme('MiniMax', '舞台导演', 'theatre', '#df9fac', '#fff0f0', '#593140', '#bf8291'),
  opencode: theme('OpenCode Zen', '小禅', 'terminal', '#a7b39a', '#e9efe5', '#313932', '#7a8c77'),
  qwen: theme('Qwen', '百科工匠', 'lattice', '#80b89a', '#edf7f0', '#29483e', '#7da68f'),
})
