import { QCGRouter } from './qcg-router.mjs'

export class AMORouter extends QCGRouter {
  constructor(models, qualityFloors, learningRate = 0.01) { super(models, qualityFloors); this.name = 'AMO-Router'; this.learningRate = learningRate; this.weights = this.initializeWeights(); this.history = [] }
  initializeWeights() { const row = { quality: .2, cost: .2, latency: .2, specialty: .2, risk: .2 }; return { simple: { ...row }, balanced: { ...row }, complex: { ...row } } }
  getWeights(complexity) { return this.weights[complexity] || this.weights.balanced }
  route(task) { const decision = super.route(task); this.history.push({ task, decision }); return decision }
  learn(actualCost, actualQuality, targetCost, qualityFloor) {
    const complexity = this.history.at(-1)?.task?.complexity || 'balanced'; const w = this.weights[complexity]; const costError = Number(actualCost) - Number(targetCost); const qualityError = Number(qualityFloor) - Number(actualQuality)
    w.cost = Math.max(0.01, w.cost - this.learningRate * costError * 2); w.quality = Math.max(0.01, w.quality + this.learningRate * qualityError * 3); w.latency = Math.max(0.01, w.latency * .999); w.specialty = Math.max(0.01, w.specialty + (qualityError > 0 ? this.learningRate : -this.learningRate * .2)); w.risk = Math.max(0.01, w.risk + (costError > 0 ? this.learningRate * .2 : -this.learningRate * .1)); this.projectWeights(complexity); return { ...w }
  }
  projectWeights(complexity) { const w = this.weights[complexity]; const sum = Object.values(w).reduce((a, b) => a + b, 0); for (const key of Object.keys(w)) w[key] /= sum }
}

