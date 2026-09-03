export const qualityFor = (decision, task, random = 0.5) => Math.max(0, Math.min(1, Number(decision.quality || 0) + (random - .5) * .025))

