export const costFor = (model, inputTokens = 300, outputTokens = 500) => (inputTokens * Number(model.pricing?.input || 0) + outputTokens * Number(model.pricing?.output || 0)) / 1e6

