/** GAL 视窗样式：全部作用域限定在 [data-gal-view] 之下，避免污染宿主。
 * 视觉基调：深色夜晚 + 半透明毛玻璃 + 紫蓝/靛青/暗红点缀 + 细边框 + 克制的发光。
 */

export const CSS = `
[data-gal-view] {
  --gv-bg: #0a0d1c;
  --gv-panel: rgba(16, 20, 38, .86);
  --gv-panel-2: rgba(24, 29, 52, .94);
  --gv-line: rgba(255, 255, 255, .09);
  --gv-line-strong: rgba(255, 255, 255, .17);
  --gv-text: #e6e9f4;
  --gv-text-dim: #98a1c2;
  --gv-accent: #8f7bff;
  --gv-accent-2: #4f8cff;
  --gv-accent-red: #e05a6b;
  --gv-glow: 0 0 0 1px rgba(143, 123, 255, .30), 0 0 16px rgba(143, 123, 255, .16);
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 60vh;
  overflow: hidden;
  background:
    radial-gradient(1200px 500px at 18% -10%, rgba(79, 140, 255, .07), transparent 60%),
    radial-gradient(900px 420px at 85% 110%, rgba(143, 123, 255, .08), transparent 60%),
    var(--gv-bg);
  color: var(--gv-text);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
  user-select: none;
}
[data-gal-view] *, [data-gal-view] *::before, [data-gal-view] *::after { box-sizing: border-box; }
[data-gal-view] input, [data-gal-view] textarea, [data-gal-view] select { user-select: text; }

/* ---------- 填满会话区 ---------- */
/* 挂载时组件隐藏会话外壳的输入席并给根节点打上该标记：绝对定位占满整个会话主体。 */
[data-gal-view][data-gal-fills] {
  position: absolute;
  inset: 0;
  height: auto;
  min-height: 0;
  /* Keep the root out of a stacking context so its topbar can clear the
     host's edge resize handles without covering the handles everywhere. */
  z-index: auto;
}

/* ---------- 顶部栏 ---------- */
.gv-topbar {
  position: relative;
  z-index: 20;
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--gv-line);
  background: linear-gradient(180deg, rgba(20, 24, 44, .7), rgba(14, 17, 34, .35));
}
.gv-topbar .gv-btn { position: relative; z-index: 21; }
.gv-brand { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; letter-spacing: .12em; color: var(--gv-text); }
.gv-brand-mark {
  width: 10px; height: 10px; transform: rotate(45deg);
  background: linear-gradient(135deg, var(--gv-accent), var(--gv-accent-2));
  box-shadow: 0 0 10px rgba(143, 123, 255, .55);
}
.gv-mode-switch { display: flex; border: 1px solid var(--gv-line-strong); }
.gv-mode-btn {
  border: 0; background: transparent; color: var(--gv-text-dim);
  padding: 4px 16px; font-size: 12px; cursor: pointer;
  transition: color .15s ease, background .15s ease;
}
.gv-mode-btn + .gv-mode-btn { border-left: 1px solid var(--gv-line-strong); }
.gv-mode-btn:hover { color: var(--gv-text); background: rgba(255, 255, 255, .04); }
.gv-mode-btn.is-on { color: #fff; background: linear-gradient(180deg, rgba(143, 123, 255, .22), rgba(79, 140, 255, .14)); box-shadow: inset 0 -2px 0 var(--gv-accent); }
.gv-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.gv-topbar-hint { font-size: 11px; color: var(--gv-text-dim); letter-spacing: .05em; }

/* ---------- 自动隐藏路由任务栏 ---------- */
.gv-control-bar { position: relative; z-index: 12; flex: none; margin: 0 10px; border-bottom: 1px solid var(--gv-line); background: rgba(8, 11, 26, .88); transition: background .2s ease, box-shadow .2s ease; }
.gv-control-bar.is-open { box-shadow: 0 9px 22px rgba(0, 0, 0, .16); }
.gv-taskbar-handle { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 24px; border: 0; border-bottom: 1px solid transparent; background: transparent; color: var(--gv-text-dim); font: inherit; font-size: 10px; letter-spacing: .12em; cursor: pointer; }
.gv-taskbar-handle:hover, .gv-taskbar-handle:focus-visible { color: var(--gv-text); background: rgba(143, 123, 255, .08); outline: none; }
.gv-control-content { max-height: 560px; overflow: hidden; opacity: 1; transition: max-height .24s ease, opacity .18s ease; }
.gv-control-bar.is-collapsed .gv-control-content { max-height: 0; opacity: 0; pointer-events: none; }
.gv-control-bar.is-collapsed .gv-taskbar-handle { border-bottom-color: var(--gv-line); }

/* ---------- 智能分配摘要 ---------- */
.gv-router-panel {
  flex: none;
  margin: 8px 14px 0;
  padding: 8px 10px;
  border: 1px solid var(--gv-line);
  background: rgba(15, 19, 38, .78);
  color: var(--gv-text-dim);
  font-size: 11px;
}
.gv-router-head { display: flex; align-items: center; gap: 12px; }
.gv-router-title { color: var(--gv-text); font-weight: 600; letter-spacing: .08em; }
.gv-router-modes { display: flex; border: 1px solid var(--gv-line); }
.gv-router-mode { border: 0; background: transparent; color: var(--gv-text-dim); padding: 2px 8px; font-size: 10px; cursor: pointer; }
.gv-router-mode + .gv-router-mode { border-left: 1px solid var(--gv-line); }
.gv-router-mode.is-on { color: #fff; background: rgba(143, 123, 255, .22); }
.gv-router-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px 12px; margin-top: 7px; }
.gv-router-grid b { color: var(--gv-text); font-weight: 500; }
.gv-router-weights, .gv-router-candidates { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 6px; }
.gv-router-weights span { color: #b9c6ee; }
.gv-router-candidates span { color: #d4caff; }
.gv-router-reason { margin-top: 6px; color: var(--gv-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gv-router-single-note { margin-top: 8px; padding: 7px 9px; border-left: 2px solid var(--gv-accent-2); color: #c7d7ff; background: rgba(79, 140, 255, .08); }
.gv-session-details { margin-top: 8px; border-top: 1px solid var(--gv-line); }
.gv-session-summary, .gv-board-summary { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 8px 0 3px; cursor: pointer; color: #b9c6ee; list-style: none; }
.gv-session-summary::before, .gv-board-summary::before { content: '▸'; flex: none; width: 10px; color: var(--gv-accent-2); font-size: 13px; line-height: 1; }
.gv-session-details[open] > .gv-session-summary::before, .gv-collab-board[open] > .gv-board-summary::before { content: '▾'; }
.gv-session-summary-title, .gv-board-title { color: var(--gv-text-dim); letter-spacing: .08em; }
.gv-session-summary strong { color: var(--gv-text); font-weight: 600; }
.gv-session-summary-detail, .gv-board-progress { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--gv-text-dim); }
.gv-session-body, .gv-collab-body { padding-top: 2px; }
.gv-model-picker { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 5px 0 2px; }
.gv-picker-label { color: var(--gv-text-dim); font-size: 11px; letter-spacing: .08em; }
.gv-picker-tabs { display: flex; border: 1px solid var(--gv-line-strong); }
.gv-picker-tabs button { border: 0; border-right: 1px solid var(--gv-line-strong); background: transparent; color: var(--gv-text-dim); padding: 4px 9px; font-size: 11px; cursor: pointer; }
.gv-picker-tabs button:last-child { border-right: 0; }
.gv-picker-tabs button.is-on { color: #fff; background: rgba(143, 123, 255, .24); }
.gv-picker-select { display: flex; align-items: center; gap: 6px; color: var(--gv-text-dim); font-size: 11px; }
.gv-picker-select select { min-width: 190px; max-width: 360px; background: rgba(10, 13, 28, .75); border: 1px solid var(--gv-line-strong); color: var(--gv-text); padding: 4px 7px; border-radius: 3px; }
.gv-picker-note { flex: 1 1 280px; color: var(--gv-text-dim); font-size: 11px; }
.gv-picker-error { flex-basis: 100%; color: #ff9fae; font-size: 11px; }
.gv-maid-avatar { flex: none; overflow: hidden; border: 1px solid rgba(155, 140, 255, .55); background: rgba(12, 16, 36, .8); box-shadow: 0 0 0 1px rgba(255,255,255,.04); }
.gv-maid-avatar-small { width: 34px; height: 34px; border-radius: 50%; }
.gv-maid-avatar-tiny { width: 22px; height: 22px; border-radius: 50%; }
.gv-maid-avatar.is-active { border-color: var(--gv-accent-2); box-shadow: 0 0 14px rgba(79, 140, 255, .45); }
.gv-maid-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 18%; display: block; }
.gv-collab-board { flex: none; margin: 0 16px 8px; padding: 0 11px 8px; border: 1px solid var(--gv-line); background: rgba(17, 22, 46, .68); }
.gv-board-summary { padding: 9px 0 8px; color: var(--gv-text); font-size: 11px; letter-spacing: .08em; }
.gv-board-title { color: var(--gv-text); }
.gv-board-progress { font-size: 10px; letter-spacing: 0; }
.gv-board-synth { color: #b9c6ee; font-size: 10px; letter-spacing: 0; }
.gv-task-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.gv-task-row { display: flex; align-items: center; gap: 7px; min-width: 0; padding: 6px; border: 1px solid var(--gv-line); background: rgba(8, 11, 26, .45); }
.gv-task-row.is-active { border-color: rgba(79, 140, 255, .7); background: rgba(79, 140, 255, .12); }
.gv-task-row.is-complete { opacity: .76; }
.gv-task-main { min-width: 0; flex: 1; }
.gv-task-title { display: flex; justify-content: space-between; gap: 5px; color: var(--gv-text); font-size: 11px; }
.gv-task-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-task-title b { flex: none; color: var(--gv-accent-2); font-size: 10px; font-weight: 500; }
.gv-task-meta, .gv-board-foot { margin-top: 3px; color: var(--gv-text-dim); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-board-foot { padding-top: 7px; border-top: 1px solid var(--gv-line); }
.gv-analysis-summary { flex: none; margin: 0 16px 7px; color: var(--gv-text-dim); font-size: 11px; }
.gv-analysis-summary summary { cursor: pointer; color: #b9c6ee; }
.gv-analysis-summary-title { display: inline-flex; align-items: center; gap: 6px; }
.gv-analysis-body { margin-top: 6px; padding: 8px 10px; border: 1px solid var(--gv-line); background: rgba(10, 13, 28, .52); }
.gv-analysis-body p { margin: 0; line-height: 1.55; }
.gv-analysis-metrics, .gv-analysis-candidates { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 6px; }
.gv-analysis-metrics b { color: var(--gv-text); font-weight: 500; }
.gv-analysis-cost { margin-top: 7px; color: #b9c6ee; }
.gv-analysis-cost b { color: var(--gv-text); font-weight: 600; }
.gv-analysis-breakdown { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 5px; color: var(--gv-text-dim); font-size: 10px; }
.gv-analysis-candidates span { color: #d4caff; }
.gv-archive-rail { position: absolute; top: 0; left: 0; bottom: 0; z-index: 85; width: min(360px, 88%); display: flex; flex-direction: column; background: rgba(10, 14, 30, .97); border-right: 1px solid var(--gv-line-strong); box-shadow: 16px 0 36px rgba(0,0,0,.42); animation: gv-slide-left .2s ease-out; }
.gv-archive-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--gv-line-strong); color: var(--gv-text); font-size: 13px; font-weight: 700; letter-spacing: .15em; }
.gv-icon-btn { border: 0; background: transparent; color: var(--gv-text-dim); font-size: 20px; line-height: 1; cursor: pointer; }
.gv-archive-hint { padding: 10px 14px; color: var(--gv-text-dim); font-size: 11px; line-height: 1.6; }
.gv-archive-list { flex: 1; overflow: auto; padding: 4px 10px 14px; }
.gv-archive-item { display: flex; flex-direction: column; align-items: flex-start; width: 100%; margin: 3px 0; padding: 9px 10px; border: 1px solid transparent; background: transparent; color: var(--gv-text); text-align: left; cursor: pointer; }
.gv-archive-item:hover { background: rgba(143, 123, 255, .1); }
.gv-archive-item.is-current { border-color: rgba(143, 123, 255, .55); background: rgba(143, 123, 255, .15); }
.gv-archive-item-title { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.gv-archive-item-meta { margin-top: 4px; color: var(--gv-text-dim); font-size: 10px; }
.gv-archive-empty { padding: 20px 8px; color: var(--gv-text-dim); text-align: center; font-size: 12px; }
.gv-markdown-transcript { padding: 10px 14px; overflow: auto; }
.gv-log-line { padding: 9px 0; border-bottom: 1px solid var(--gv-line); color: var(--gv-text); font-size: 13px; line-height: 1.7; }
.gv-log-line header { margin-bottom: 3px; color: var(--gv-accent-2); font-size: 11px; font-weight: 700; }
.gv-log-line p { margin: 0 0 .55em; }
.gv-log-line pre { max-width: 100%; overflow: auto; }
@media (max-width: 760px) { .gv-task-list { grid-template-columns: 1fr; } .gv-router-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

/* ---------- 按钮 ---------- */
.gv-btn {
  border: 1px solid var(--gv-line-strong);
  background: rgba(255, 255, 255, .03);
  color: var(--gv-text);
  font-size: 12px;
  padding: 3px 12px;
  border-radius: 3px;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease, color .15s ease;
}
.gv-btn:hover:not(:disabled) {
  border-color: rgba(143, 123, 255, .65);
  background: rgba(143, 123, 255, .10);
  box-shadow: 0 0 12px rgba(143, 123, 255, .22);
  color: #fff;
}
.gv-btn:disabled { opacity: .38; cursor: not-allowed; }
.gv-btn-accent {
  border-color: rgba(143, 123, 255, .55);
  background: linear-gradient(180deg, rgba(143, 123, 255, .20), rgba(79, 140, 255, .12));
}
.gv-btn-accent:hover:not(:disabled) { background: linear-gradient(180deg, rgba(143, 123, 255, .30), rgba(79, 140, 255, .18)); }
.gv-toggle.is-on {
  border-color: rgba(143, 123, 255, .7);
  background: rgba(143, 123, 255, .14);
  color: #fff;
  box-shadow: 0 0 10px rgba(143, 123, 255, .2);
}

/* ---------- 舞台 ---------- */
.gv-stage-area { flex: 1 1 auto; min-height: 0; display: flex; }
.gv-stage-wrap {
  flex: 1 1 auto; min-width: 0; min-height: 0;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; position: relative;
  background: radial-gradient(900px 460px at 50% 30%, rgba(30, 36, 70, .5), transparent 70%), #070912;
}
.gv-stage {
  position: relative;
  flex: none;
  /* 居中缩放：wrap 按未缩放的布局盒居中，原点取中心才能让缩放后的舞台视觉居中（0 0 会在小窗口把舞台挤到左上并被裁掉）。 */
  transform-origin: 50% 50%;
  background: #0c1026;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .06), 0 22px 60px rgba(0, 0, 0, .55);
}
.gv-grid {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(143, 123, 255, .10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(143, 123, 255, .10) 1px, transparent 1px);
}
/* 边缘吸附指引线（手势期间显示）。 */
.gv-guide {
  position: absolute; z-index: 9998; pointer-events: none;
  background: var(--gv-accent-2);
  box-shadow: 0 0 6px rgba(79, 140, 255, .85);
}
.gv-guide-x { top: 0; bottom: 0; width: 1px; }
.gv-guide-y { left: 0; right: 0; height: 1px; }

/* ---------- 元素 ---------- */
.gv-el { position: absolute; border-style: solid; pointer-events: none; overflow: visible; }
.gv-stage.is-editor .gv-el.is-pickable { pointer-events: auto; cursor: move; }
/* 透明功能按钮：游戏模式可点击（元素级交互，无悬停高亮）。 */
[data-gal-mode='game'] .gv-el-action-button { pointer-events: auto; cursor: pointer; }
.gv-el-action-button.is-on { border-color: var(--gv-accent); background: rgba(143, 123, 255, .14); color: #fff; }
.gv-stage.is-editor .gv-el.is-pickable:hover { outline: 1px solid rgba(143, 123, 255, .55); outline-offset: 1px; }
.gv-el.is-locked { cursor: not-allowed; }

/* 背景占位 */
.gv-elbg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: inherit; overflow: hidden; }
.gv-elbg-label {
  font-size: inherit; letter-spacing: .5em; text-indent: .5em; opacity: .4; color: inherit;
  text-shadow: 0 1px 12px rgba(0, 0, 0, .5);
}
.gv-elbg-corners {
  position: absolute; inset: 10px; border: 1px solid rgba(255, 255, 255, .07);
}
.gv-elbg-corners::before, .gv-elbg-corners::after {
  content: ''; position: absolute; width: 18px; height: 18px;
}
.gv-elbg-corners::before { top: -1px; left: -1px; border-top: 2px solid rgba(255, 255, 255, .22); border-left: 2px solid rgba(255, 255, 255, .22); }
.gv-elbg-corners::after { bottom: -1px; right: -1px; border-bottom: 2px solid rgba(255, 255, 255, .22); border-right: 2px solid rgba(255, 255, 255, .22); }

/* 角色占位立绘 */
.gv-char { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; }
.gv-el-character .gv-char { animation: gv-float 4.6s ease-in-out infinite; }
.gv-char-svg { width: 100%; height: calc(100% - 30px); filter: drop-shadow(0 10px 22px rgba(0, 0, 0, .5)); }
/* 真实立绘：底部对齐、等比缩放（保持透明 PNG 的轮廓与站位一致）。 */
.gv-char-img { width: 100%; height: calc(100% - 30px); object-fit: contain; object-position: bottom center; filter: drop-shadow(0 10px 22px rgba(0, 0, 0, .5)); }
.gv-char.is-speaking .gv-char-svg {
  filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 10px 22px rgba(0, 0, 0, .5));
  color: var(--gv-speak-color, #9b8cff);
}
.gv-char-plate {
  margin-top: 6px; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 3px 12px;
  background: rgba(12, 15, 30, .78);
  border: 1px solid var(--gv-line-strong);
  border-radius: 2px;
}
.gv-char-label { font-size: 10px; letter-spacing: .28em; color: var(--gv-text-dim); }
.gv-char-name { font-size: 12px; font-weight: 600; }

/* 编辑器里的对话框静态样式 */
.gv-elbox { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 14px 18px 12px 30px; overflow: hidden; }
.gv-elbox-name {
  position: absolute; top: -18px; left: 8px;
  padding: 1px 14px; font-size: 13px; font-weight: 600; letter-spacing: .1em;
  background: rgba(14, 17, 34, .92); border-left: 3px solid currentColor;
}
.gv-elbox-text { font-size: inherit; line-height: 1.7; color: inherit; margin-top: auto; }

/* 文本/形状/按钮/装饰 */
.gv-eltext { position: absolute; inset: 0; display: flex; align-items: center; justify-content: inherit; padding: 6px; overflow: hidden; word-break: break-word; }
.gv-elbtn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: inherit; overflow: hidden; letter-spacing: .12em; }
.gv-elshape { position: absolute; inset: 0; display: flex; align-items: center; justify-content: inherit; overflow: hidden; letter-spacing: .18em; }
.gv-eldeco {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: inherit; overflow: hidden;
  background-image: repeating-linear-gradient(45deg, transparent 0 7px, rgba(255, 255, 255, .05) 7px 8px);
  border-style: dashed !important;
}
.gv-eldeco-label { font-size: inherit; letter-spacing: .22em; color: inherit; opacity: .85; }

/* ---------- 游戏对话框 ----------
 * 不启用 backdrop-filter：毛玻璃会把背后立绘 PNG 的透明区域复合成实心模糊块，
 * 破坏「透明度 → 看到清晰立绘」的预期。透明只走标准 alpha 混合（元素 opacity + 半透明背景）。 */
.gv-dialogue {
  position: absolute; pointer-events: auto; cursor: pointer;
  border-style: solid;
  transition: box-shadow .2s ease, border-color .2s ease;
}
/* 游戏模式对话区不渲染任何悬停/聚焦高亮（点击跳过打字无需视觉反馈边框）。 */
.gv-dialogue:focus, .gv-dtext:focus { outline: none; }
/* 独立「说话人」元素：文本框类型（默认纯文本外观，可自行加背景/边框），
 * 游戏模式动态显示当前台词行的说话人（你/DeepSeek/隐藏）。 */
.gv-sname {
  position: absolute; border-style: solid;
  display: flex; align-items: center; justify-content: inherit; overflow: hidden;
  padding: 2px 6px; white-space: nowrap;
  letter-spacing: .14em; font-weight: 700;
}
.gv-el > .gv-sname { inset: 0; }
.gv-dialogue-body {
  position: absolute; inset: 10px 18px 8px 18px;
  overflow-y: auto; scrollbar-width: thin;
  font-size: max(20px, 1em); line-height: 1.8; letter-spacing: 0;
  white-space: pre-wrap; word-break: break-word; color: inherit;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .72);
}
.gv-dialogue-caret {
  display: inline-block; width: 2px; height: 1.05em; margin-left: 3px;
  background: var(--gv-accent-2); vertical-align: text-bottom;
  animation: gv-blink 1s steps(2, start) infinite;
}
/* 独立「台词」元素：实时对话文本渲染进它，位置/尺寸/字号/颜色随元素属性。
 * 完全透明（无背景/无悬停描边/无滚动条视觉），避免边缘黑框。 */
.gv-dtext {
  position: absolute; pointer-events: auto; cursor: pointer;
  overflow-x: hidden; overflow-y: auto; scrollbar-width: thin;
  padding: 2px 10px;
  line-height: 1.8; letter-spacing: 0;
  white-space: pre-wrap; word-break: break-word;
  border-style: solid;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .72);
}
.gv-dtext::-webkit-scrollbar { width: 5px; }
/* 页尾省略号：紧贴文本（负边距抵消 letter-spacing 间隙）。 */
.gv-dtext-ellipsis {
  letter-spacing: 0;
  margin-left: -0.02em;
  opacity: .85;
}
/* Galgame 翻页提示（还有下一页时显示在文本框右下角）。 */
.gv-dtext-more {
  position: absolute; right: 8px; bottom: 2px;
  font-size: .7em; color: var(--gv-accent);
  animation: gv-pulse 1.4s ease-in-out infinite;
}
/* AI 状态行（思考中…/编写代码中…）：与对话文本同字号、次级色、轻微呼吸。 */
.gv-dtext-status {
  color: #dbe4ff;
  letter-spacing: .04em;
  animation: gv-pulse 1.6s ease-in-out infinite;
}

/* ---------- 输入 ----------
 * 游戏模式底部输入区包含附件轨（116px，固定高度）；控制功能已迁入场景内「透明按钮」元素。
 * 编辑模式用「工具栏 40px + 占位条 76px」对齐这里的 116px，
 * 保证两种模式的舞台槽位尺寸严格一致 → WYSIWYG。 */
.gv-input { position: relative; flex: none; height: 116px; display: flex; gap: 10px; align-items: stretch; padding: 36px 16px 10px; }
.gv-input-box {
  flex: 1 1 auto; resize: none;
  background: rgba(10, 13, 28, .72);
  border: 1px solid var(--gv-line-strong);
  border-radius: 4px;
  color: var(--gv-text);
  font-family: inherit; font-size: 14px; line-height: 1.6;
  padding: 8px 12px;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.gv-input-box:focus { border-color: rgba(143, 123, 255, .6); box-shadow: 0 0 0 1px rgba(143, 123, 255, .25), 0 0 16px rgba(143, 123, 255, .12); }
.gv-input-box::placeholder { color: var(--gv-text-dim); }

/* ---------- 图片/文档附件 ---------- */
.gv-attachments { position: absolute; top: 6px; left: 16px; right: 16px; min-height: 25px; display: flex; align-items: center; gap: 7px; overflow-x: auto; scrollbar-width: thin; }
.gv-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.gv-attach-btn { flex: none; padding: 3px 10px; }
.gv-attachment-chip { display: inline-flex; align-items: center; gap: 5px; flex: none; max-width: 210px; padding: 2px 5px 2px 3px; border: 1px solid var(--gv-line-strong); border-radius: 3px; background: rgba(143, 123, 255, .1); color: var(--gv-text); font-size: 11px; }
.gv-attachment-chip img { width: 20px; height: 20px; border-radius: 2px; object-fit: cover; }
.gv-document-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 2px; background: rgba(79, 140, 255, .24); color: #c7d7ff; font-size: 8px; font-weight: 700; letter-spacing: 0; }
.gv-attachment-chip span { max-width: 145px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-attachment-chip button { border: 0; padding: 0 2px; background: transparent; color: var(--gv-text-dim); font-size: 15px; line-height: 1; cursor: pointer; }
.gv-attachment-chip button:hover { color: #ff9fae; }
.gv-attachment-notice { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #ffbf87; font-size: 11px; }

/* MarkdownText normally applies the Harness chat typography and theme color.
 * In the GAL stage those values must inherit from the editable scene element;
 * otherwise a 32px light-colored dialogue is reset to the host's 14px dark text. */
.gv-dtext > div, .gv-dialogue-body > div {
  margin: 0; min-width: 0; white-space: normal;
  font: inherit !important;
  color: inherit !important;
  line-height: inherit;
  text-shadow: inherit;
}
.gv-plain-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.gv-dtext p, .gv-dialogue-body p { margin: 0 0 .55em; }
.gv-dtext p:last-child, .gv-dialogue-body p:last-child { margin-bottom: 0; }
.gv-dtext :where(h1, h2, h3, h4, h5, h6),
.gv-dialogue-body :where(h1, h2, h3, h4, h5, h6) {
  color: #f5f2ff; letter-spacing: 0; line-height: 1.35;
  text-shadow: 0 1px 3px rgba(27, 16, 62, .88);
}
.gv-dtext a, .gv-dialogue-body a { color: #a9c9ff; text-decoration-color: rgba(169, 201, 255, .72); }
.gv-dtext strong, .gv-dialogue-body strong { color: #fff; }
.gv-dtext blockquote, .gv-dialogue-body blockquote {
  margin: .55em 0; padding: .2em .7em;
  border-left: 3px solid #a48fff;
  background: rgba(117, 93, 219, .14);
  color: #e9e3ff;
}
.gv-dtext :not(pre) > code, .gv-dialogue-body :not(pre) > code {
  border: 1px solid rgba(143, 123, 255, .34);
  background: rgba(52, 42, 105, .52);
  color: #e8e2ff;
}
.gv-dtext pre, .gv-dialogue-body pre {
  box-sizing: border-box; width: 100%; max-width: 100%; overflow: auto;
  border: 1px solid rgba(143, 123, 255, .32);
  border-radius: 4px;
  background: rgba(6, 9, 24, .82);
  overscroll-behavior-x: contain;
}
.gv-dtext [class*="tableScroll"], .gv-dialogue-body [class*="tableScroll"],
.gv-dtext div:has(> table), .gv-dialogue-body div:has(> table) {
  box-sizing: border-box; max-width: 100%; overflow-x: auto;
  overscroll-behavior-x: contain;
}
.gv-dtext table, .gv-dialogue-body table { color: inherit; background: rgba(10, 13, 32, .48); }
.gv-dtext th, .gv-dialogue-body th { color: #f4f0ff; background: rgba(108, 82, 194, .26); }
.gv-dtext :where(th, td), .gv-dialogue-body :where(th, td) { border-color: rgba(165, 150, 224, .34); }
.gv-dtext .katex-display, .gv-dialogue-body .katex-display {
  box-sizing: border-box; max-width: 100%; overflow-x: auto; overflow-y: hidden;
  padding: .12em 0; overscroll-behavior-x: contain;
}
.gv-send { align-self: stretch; min-width: 84px; }

/* ---------- 历史面板 ---------- */
.gv-history {
  position: absolute; top: 0; right: 0; bottom: 0; z-index: 80;
  width: min(400px, 92%);
  display: flex; flex-direction: column;
  background: rgba(13, 16, 32, .94);
  border-left: 1px solid rgba(143, 123, 255, .3);
  box-shadow: -18px 0 44px rgba(0, 0, 0, .5);
  backdrop-filter: blur(10px);
  animation: gv-slide-in .24s cubic-bezier(.16, 1, .3, 1);
}
.gv-history-head {
  flex: none; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--gv-line-strong);
  font-size: 13px; font-weight: 600; letter-spacing: .2em;
}
.gv-history-list { flex: 1; overflow-y: auto; padding: 6px 14px 14px; }
.gv-history-row { padding: 9px 0; border-bottom: 1px solid var(--gv-line); }
.gv-history-name { font-size: 12px; font-weight: 700; letter-spacing: .1em; }
.gv-history-text { margin: 3px 0 0; font-size: 13px; line-height: 1.7; color: var(--gv-text); white-space: pre-wrap; word-break: break-word; }
.gv-history-empty { padding: 24px 0; text-align: center; color: var(--gv-text-dim); font-size: 13px; }

/* ---------- 设置浮层 ---------- */
.gv-settings {
  position: absolute; right: 16px; bottom: 92px; z-index: 80;
  width: 300px;
  background: var(--gv-panel-2);
  border: 1px solid var(--gv-line-strong);
  box-shadow: 0 18px 44px rgba(0, 0, 0, .5), var(--gv-glow);
  backdrop-filter: blur(10px);
  padding: 12px 14px;
  animation: gv-rise .18s cubic-bezier(.16, 1, .3, 1);
}
.gv-settings-head {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 8px; margin-bottom: 6px;
  border-bottom: 1px solid var(--gv-line-strong);
  font-size: 13px; font-weight: 600; letter-spacing: .2em;
}
.gv-settings-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 5px 0; font-size: 12px; color: var(--gv-text-dim); }
.gv-settings-row input[type="text"], .gv-settings-row select {
  width: 170px;
  background: rgba(10, 13, 28, .7);
  border: 1px solid var(--gv-line-strong);
  color: var(--gv-text);
  font-size: 12px; padding: 3px 8px; border-radius: 3px; outline: none;
}
.gv-settings-row input:focus, .gv-settings-row select:focus { border-color: rgba(143, 123, 255, .6); }
.gv-settings-hint { margin: 8px 0 0; font-size: 11px; color: var(--gv-text-dim); line-height: 1.6; }

/* ---------- 编辑模式 ----------
 * 舞台槽位与游戏模式同尺寸：工具栏 40px 对齐游戏控制条，底部占位条 76px 对齐输入区；
 * 侧栏悬浮在舞台之上（不挤压舞台），隐藏侧栏时舞台尺寸不变。 */
.gv-editor { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.gv-editor-toolbar {
  flex: none; height: 40px; display: flex; flex-wrap: nowrap; align-items: center; gap: 8px;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
  padding: 0 12px;
  border-bottom: 1px solid var(--gv-line);
  background: linear-gradient(180deg, rgba(20, 24, 44, .7), rgba(14, 17, 34, .4));
}
.gv-editor-toolbar::-webkit-scrollbar { height: 0; }
.gv-editor-spacer { flex: none; height: 76px; }
.gv-toolbar-group { display: flex; gap: 4px; align-items: center; }
.gv-toolbar-group + .gv-toolbar-group { border-left: 1px solid var(--gv-line-strong); padding-left: 8px; }
.gv-toolbar-right { margin-left: auto; border-left: 0 !important; }
/* 添加菜单挂在编辑根节点（锚点由 JS 按按钮位置计算），避免被工具栏 overflow 裁剪。 */
.gv-add-menu {
  position: absolute; left: 0; top: 0; z-index: 90;
  min-width: 132px;
  background: var(--gv-panel-2);
  border: 1px solid var(--gv-line-strong);
  box-shadow: 0 14px 36px rgba(0, 0, 0, .5);
  padding: 4px;
  animation: gv-rise .16s cubic-bezier(.16, 1, .3, 1);
}
.gv-add-menu button {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: transparent; border: 0; color: var(--gv-text);
  font-size: 12px; padding: 5px 8px; cursor: pointer; text-align: left;
}
.gv-add-menu button:hover { background: rgba(143, 123, 255, .14); color: #fff; }

.gv-editor-body { flex: 1 1 auto; min-height: 0; position: relative; }
/* 侧栏悬浮于舞台之上：不挤压舞台，保证编辑所见即游戏所得。 */
.gv-editor-side {
  position: absolute; top: 0; bottom: 0; z-index: 20;
  display: flex; flex-direction: column; overflow: hidden;
  background: rgba(13, 16, 32, .84);
  backdrop-filter: blur(8px) saturate(1.1);
  box-shadow: 0 0 28px rgba(0, 0, 0, .38);
  transition: width .18s cubic-bezier(.16, 1, .3, 1), visibility 0s linear .18s;
}
.gv-editor-tree { left: 0; width: 216px; border-right: 1px solid var(--gv-line-strong); }
.gv-editor-props { right: 0; width: 264px; border-left: 1px solid var(--gv-line-strong); overflow-y: auto; }
/* 边栏隐藏：宽度收拢到 0（保留挂载，状态与动画不丢）。 */
.gv-editor-side.is-collapsed { width: 0 !important; border-left: 0; border-right: 0; visibility: hidden; }
.gv-editor-canvas { position: absolute; inset: 0; display: flex; }
.gv-editor-canvas .gv-stage-wrap { background: radial-gradient(900px 460px at 50% 30%, rgba(30, 36, 70, .5), transparent 70%), #070912; }

/* 元素树 */
.gv-tree { display: flex; flex-direction: column; min-height: 0; }
.gv-tree-root {
  flex: none; display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--gv-line-strong);
  font-size: 12px; font-weight: 700; letter-spacing: .16em;
}
.gv-tree-count { margin-left: auto; font-size: 10px; font-weight: 400; color: var(--gv-text-dim); letter-spacing: 0; }
.gv-tree-list { flex: 1 1 auto; overflow-y: auto; padding: 4px; }
.gv-tree-row {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 8px; margin: 1px 0;
  font-size: 12px; color: var(--gv-text);
  cursor: pointer; border: 1px solid transparent;
  transition: background .12s ease, border-color .12s ease;
}
.gv-tree-row:hover { background: rgba(255, 255, 255, .05); }
.gv-tree-row.is-selected { background: rgba(143, 123, 255, .14); border-color: rgba(143, 123, 255, .45); }
.gv-tree-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-tree-toggle {
  flex: none; border: 1px solid var(--gv-line-strong); background: transparent;
  color: var(--gv-text-dim); font-size: 10px; width: 18px; height: 18px;
  border-radius: 2px; cursor: pointer; line-height: 1; padding: 0;
}
.gv-tree-toggle:hover { color: #fff; border-color: rgba(143, 123, 255, .6); }
.gv-tree-toggle.is-on { color: #fff; background: rgba(143, 123, 255, .22); border-color: rgba(143, 123, 255, .6); }
.gv-tree-toggle.is-off { opacity: .35; }
.gv-tree-scene { flex: none; border-top: 1px solid var(--gv-line-strong); padding: 8px 12px 12px; }

/* 类型记号（纯 CSS 图形） */
.gv-glyph { flex: none; width: 10px; height: 10px; display: inline-block; }
.gv-glyph-scene { border: 1px solid var(--gv-text-dim); box-shadow: inset 0 0 0 2px var(--gv-panel-2), inset 0 0 0 3px var(--gv-text-dim); }
.gv-glyph-background { background: linear-gradient(135deg, var(--gv-accent-2), var(--gv-accent)); opacity: .9; }
.gv-glyph-character { border: 1px solid var(--gv-accent); border-radius: 50% 50% 40% 40%; height: 11px; }
.gv-glyph-dialogue { border: 1px solid var(--gv-accent-2); border-radius: 2px; }
.gv-glyph-dialogue-text { border: 1px solid var(--gv-accent-2); border-radius: 2px; box-shadow: inset 0 -4px 0 rgba(79, 140, 255, .55); }
.gv-glyph-speaker-name { border: 1px solid var(--gv-accent); border-left-width: 3px; border-radius: 2px; }
.gv-glyph-text { background: linear-gradient(90deg, var(--gv-text-dim) 0 70%, transparent 70%); }
.gv-glyph-button { border: 1px solid var(--gv-accent-2); border-radius: 5px; }
.gv-glyph-image { border: 1px solid var(--gv-accent-2); background: linear-gradient(160deg, transparent 52%, var(--gv-accent) 52% 70%, transparent 70%); }
.gv-glyph-rect { border: 1px solid var(--gv-text-dim); }
.gv-glyph-circle { border: 1px solid var(--gv-accent-red); border-radius: 50%; }
.gv-glyph-decoration { border: 1px dashed var(--gv-text-dim); transform: rotate(45deg) scale(.85); }

/* 属性面板 */
.gv-props { padding: 10px 12px 16px; }
.gv-props-head {
  display: flex; align-items: baseline; gap: 8px;
  padding: 2px 0 8px; margin-bottom: 6px;
  border-bottom: 1px solid var(--gv-line-strong);
}
.gv-props-type {
  flex: none; font-size: 10px; letter-spacing: .2em; color: var(--gv-accent);
  border: 1px solid rgba(143, 123, 255, .5); padding: 0 6px; border-radius: 2px;
}
.gv-props-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gv-props-sec {
  margin: 10px 0 4px; padding-bottom: 2px;
  font-size: 10px; letter-spacing: .28em; color: var(--gv-text-dim);
  border-bottom: 1px solid var(--gv-line);
}
.gv-prop-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 0; }
.gv-prop-label { flex: none; font-size: 11px; color: var(--gv-text-dim); min-width: 58px; }
.gv-prop-input {
  width: 108px;
  background: rgba(10, 13, 28, .7);
  border: 1px solid var(--gv-line-strong);
  color: var(--gv-text);
  font-size: 12px; padding: 2px 7px; border-radius: 3px; outline: none;
  font-variant-numeric: tabular-nums;
}
.gv-prop-input:focus { border-color: rgba(143, 123, 255, .6); box-shadow: 0 0 8px rgba(143, 123, 255, .15); }
.gv-prop-row input[type="checkbox"] { accent-color: var(--gv-accent); }
.gv-prop-actions { display: flex; gap: 6px; padding: 4px 0; flex-wrap: wrap; }
.gv-prop-actions .gv-btn { font-size: 11px; padding: 2px 8px; }
.gv-prop-color { display: flex; align-items: center; gap: 6px; width: 108px; }
.gv-prop-color input[type="color"] {
  flex: none; width: 30px; height: 22px; padding: 0; border: 1px solid var(--gv-line-strong);
  background: transparent; border-radius: 3px; cursor: pointer;
}
.gv-prop-color-value { flex: 1; font-size: 10px; color: var(--gv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
.gv-props-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; color: var(--gv-text-dim); text-align: center; }
.gv-props-empty p { margin: 0; font-size: 12px; }
.gv-props-empty-hint { font-size: 11px !important; line-height: 1.7; opacity: .8; }
.gv-props-empty-mark {
  width: 40px; height: 40px; border: 1px dashed rgba(143, 123, 255, .5);
  transform: rotate(45deg);
}

/* 选中框与手柄 */
.gv-sel {
  position: absolute; z-index: 9999; pointer-events: none;
  border: 1px solid var(--gv-accent);
  box-shadow: 0 0 0 1px rgba(143, 123, 255, .25), 0 0 18px rgba(143, 123, 255, .28);
}
.gv-sel-label {
  position: absolute; top: -20px; left: -1px;
  font-size: 10px; letter-spacing: .1em; color: #fff;
  background: rgba(120, 105, 240, .92);
  padding: 1px 8px; white-space: nowrap;
}
.gv-sel-handle {
  position: absolute; width: 10px; height: 10px;
  background: #0a0d1c; border: 1.5px solid var(--gv-accent);
  pointer-events: auto;
}
.gv-sel-handle:hover { background: var(--gv-accent); box-shadow: 0 0 8px rgba(143, 123, 255, .6); }
.gv-sel-rotate {
  position: absolute; top: -40px; left: calc(50% - 5px);
  width: 10px; height: 10px; border-radius: 50%;
  background: #0a0d1c; border: 1.5px solid var(--gv-accent-2);
  pointer-events: auto; cursor: grab;
}
.gv-sel-rotate::before {
  content: ''; position: absolute; left: 50%; top: 10px;
  width: 1px; height: 28px; background: rgba(79, 140, 255, .5);
  transform: translateX(-50%);
}
.gv-sel-rotate:hover { background: var(--gv-accent-2); }

/* ---------- 动画 ---------- */
@keyframes gv-blink { 50% { opacity: 0; } }
@keyframes gv-pulse { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
@keyframes gv-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes gv-slide-in { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes gv-slide-left { from { transform: translateX(-24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes gv-rise { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* ---------- 设置选项卡（渲染在设置面板内，GAL 根节点之外 → 无作用域） ---------- */
.gvsv-tab {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px;
  font-family: inherit;
}
.gvsv-head { display: flex; flex-direction: column; gap: 4px; }
.gvsv-title { font-size: 15px; font-weight: 700; letter-spacing: .08em; }
.gvsv-desc { font-size: 12px; opacity: .7; line-height: 1.7; }
.gvsv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 4px;
}
.gvsv-label { font-size: 13px; font-weight: 600; }
.gvsv-hint { flex: 1; font-size: 11px; opacity: .6; line-height: 1.6; }
.gvsv-row input[type="checkbox"] { accent-color: #8f7bff; width: 16px; height: 16px; }
.gvsv-pricing { margin: 14px 0; padding: 10px 12px; border: 1px solid rgba(255, 255, 255, .12); background: rgba(255, 255, 255, .025); }
.gvsv-pricing summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 14px; cursor: pointer; }
.gvsv-pricing summary span { font-size: 10px; opacity: .58; }
.gvsv-pricing-body { margin-top: 10px; }
.gvsv-pricing-body > p { margin: 0 0 9px; }
.gvsv-pricing-global { display: grid; grid-template-columns: minmax(180px, 2fr) repeat(2, minmax(130px, 1fr)); gap: 8px; }
.gvsv-pricing-global label { display: grid; gap: 4px; font-size: 10px; opacity: .8; }
.gvsv-pricing input { min-width: 0; box-sizing: border-box; width: 100%; min-height: 28px; padding: 3px 6px; border: 1px solid rgba(255, 255, 255, .15); border-radius: 3px; background: rgba(0, 0, 0, .18); color: inherit; font: inherit; font-size: 11px; }
.gvsv-price-table { margin-top: 10px; overflow-x: auto; }
.gvsv-price-head, .gvsv-price-row { display: grid; grid-template-columns: minmax(150px, 1.6fr) repeat(4, minmax(70px, .7fr)) minmax(58px, .55fr) 48px; gap: 5px; align-items: center; min-width: 650px; }
.gvsv-price-head { padding: 5px 6px; font-size: 10px; opacity: .55; }
.gvsv-price-row { padding: 4px 6px; background: rgba(255, 255, 255, .025); border-top: 1px solid rgba(255, 255, 255, .06); }
.gvsv-price-row > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.gvsv-price-row button { min-height: 26px; padding: 2px 5px; border: 1px solid rgba(255, 255, 255, .16); border-radius: 3px; background: transparent; color: inherit; font: inherit; font-size: 10px; cursor: pointer; }
.gvsv-pricing-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.gvsv-pricing-actions button { min-height: 30px; padding: 4px 10px; border: 1px solid rgba(143, 123, 255, .5); border-radius: 3px; background: rgba(143, 123, 255, .1); color: inherit; font: inherit; font-size: 11px; cursor: pointer; }
.gvsv-pricing-actions button:disabled { opacity: .45; cursor: wait; }
.gvsv-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.gvsv-update { padding: 13px 14px; border: 1px solid rgba(255, 255, 255, .14); border-radius: 4px; }
.gvsv-update-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.gvsv-update-head h3 { margin: 0; font-size: 14px; letter-spacing: 0; }
.gvsv-update-head p { margin: 5px 0 0; max-width: 720px; font-size: 11px; line-height: 1.65; opacity: .65; }
.gvsv-update button { min-height: 32px; padding: 4px 12px; border: 1px solid rgba(143, 123, 255, .5); border-radius: 4px; background: rgba(143, 123, 255, .1); color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
.gvsv-update button:hover:not(:disabled) { border-color: rgba(79, 140, 255, .75); background: rgba(79, 140, 255, .14); }
.gvsv-update button:disabled { cursor: wait; opacity: .48; }
.gvsv-update button.gvsv-link, .gvsv-update button.gvsv-secondary { border-color: rgba(255, 255, 255, .18); background: transparent; }
.gvsv-update button.gvsv-update-all { border-color: rgba(79, 140, 255, .82); background: rgba(79, 140, 255, .28); font-weight: 600; }
.gvsv-version-list { display: grid; gap: 8px; margin-top: 13px; }
.gvsv-version-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 0; padding: 10px 11px; background: rgba(255, 255, 255, .035); }
.gvsv-version-row > div { display: grid; min-width: 0; gap: 3px; }
.gvsv-version-row strong { font-size: 12px; }
.gvsv-version-row span { font-size: 11px; font-variant-numeric: tabular-nums; opacity: .8; }
.gvsv-version-row small { overflow-wrap: anywhere; font-size: 10px; line-height: 1.5; opacity: .58; }
.gvsv-version-row button { flex: none; min-width: 112px; }
.gvsv-progress { height: 5px; margin-top: 12px; overflow: hidden; background: rgba(255, 255, 255, .09); }
.gvsv-progress span { display: block; height: 100%; background: linear-gradient(90deg, #4f8cff, #8f7bff); transition: width .18s ease; }
.gvsv-notice { margin: 10px 0 0; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.gvsv-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.gvsv-footnote { margin: 9px 0 0; font-size: 10px; line-height: 1.6; opacity: .58; }
@media (max-width: 680px) {
  .gvsv-update-head, .gvsv-version-row { align-items: stretch; flex-direction: column; }
  .gvsv-update-head .gvsv-link, .gvsv-version-row button { width: 100%; }
  .gvsv-pricing-global { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  [data-gal-view] .gv-el-character .gv-char { animation: none; }
  [data-gal-view] .gv-dialogue-caret { animation: none; }
}
`
