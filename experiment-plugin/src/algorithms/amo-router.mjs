import { QCGRouter } from './qcg-router.mjs'

export class AMORouter extends QCGRouter {
  constructor(models, qualityFloors, learningRate = 0.01) {
    super(models, qualityFloors)
    this.name = 'AMO-Router'
    this.learningRate = learningRate
    this.weights = this.initializeWeights()
    this.history = []
    this.feedback = { costError: 0, qualityViolation: 0, qualityMargin: 0 }
  }

  initializeWeights() {
    const defaults = {
      simple: super.getWeights('simple'),
      balanced: super.getWeights('balanced'),
      complex: super.getWeights('complex'),
    }
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { ...value }]))
  }

  getWeights(complexity) {
    return this.weights?.[complexity] || this.weights?.balanced || super.getWeights(complexity)
  }

  route(task) {
    const decision = super.route(task)
    this.history.push({ task, decision })
    return decision
  }

  learn(actualCost, actualQuality, targetCost, qualityFloor) {
    const complexity = this.history.at(-1)?.task?.complexity || 'balanced'
    const weights = this.weights[complexity]
    const target = Math.max(Number(targetCost), 1e-9)
    const relativeCostError = Math.max(-1, Math.min(3, (Number(actualCost) - target) / target))
    const qualityViolation = Math.max(0, Number(qualityFloor) - Number(actualQuality))
    const qualityMargin = Math.max(0, Number(actualQuality) - Number(qualityFloor))
    const smoothing = 0.10
    this.feedback.costError = (1 - smoothing) * this.feedback.costError + smoothing * relativeCostError
    this.feedback.qualityViolation = (1 - smoothing) * this.feedback.qualityViolation + smoothing * qualityViolation
    this.feedback.qualityMargin = (1 - smoothing) * this.feedback.qualityMargin + smoothing * qualityMargin

    // A positive cost error increases cost pressure. A quality violation
    // increases quality and specialty pressure. Surplus quality can be traded
    // gradually for cost without dropping any objective from the simplex.
    weights.cost = Math.max(0.01, weights.cost + this.learningRate * (this.feedback.costError + this.feedback.qualityMargin * 0.25))
    weights.quality = Math.max(0.01, weights.quality + this.learningRate * (3 * this.feedback.qualityViolation - 0.15 * this.feedback.qualityMargin))
    weights.specialty = Math.max(0.01, weights.specialty + this.learningRate * (1.5 * this.feedback.qualityViolation - 0.05 * this.feedback.qualityMargin))
    weights.latency = Math.max(0.01, weights.latency * (1 - this.learningRate * 0.01))
    weights.risk = Math.max(0.01, weights.risk + this.learningRate * Math.max(0, this.feedback.qualityViolation - 0.01))
    this.projectWeights(complexity)
    return { ...weights }
  }

  projectWeights(complexity) {
    const weights = this.weights[complexity]
    const sum = Object.values(weights).reduce((total, value) => total + value, 0)
    for (const key of Object.keys(weights)) weights[key] /= sum
  }
}
