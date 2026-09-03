export class QCGRouter {
  constructor(models, qualityFloors = { simple: 0.75, balanced: 0.78, complex: 0.82 }) { this.models = models; this.qualityFloors = qualityFloors; this.name = 'QCG-Router' }
  predictQuality(model, task) { return Math.min(0.995, Number(model.liveBenchScore ?? model.quality ?? 0.8) + this.specialtyMatch(model, task.type) * 0.04 - (task.complexity === 'complex' ? 0.015 : 0)) }
  estimateCost(model, task) { const input = Math.max(80, Math.ceil(String(task.text ?? '').length / 3.7)); const output = task.complexity === 'complex' ? 1200 : task.complexity === 'balanced' ? 800 : 420; return (input * Number(model.pricing?.input ?? model.costIn ?? 0) + output * Number(model.pricing?.output ?? model.costOut ?? 0)) / 1e6 }
  specialtyMatch(model, type) { return (model.specialties || []).includes(type) ? 1 : (type === 'general' ? 0.6 : 0.35) }
  getWeights(complexity) { return ({ simple: { quality: .30, cost: .50, latency: .14, specialty: .04, risk: .02 }, balanced: { quality: .45, cost: .30, latency: .10, specialty: .10, risk: .05 }, complex: { quality: .55, cost: .16, latency: .06, specialty: .16, risk: .07 } })[complexity] || this.getWeights('balanced') }
  route(task) {
    const floor = Number(task.qualityFloor ?? this.qualityFloors[task.complexity] ?? .75); const weights = this.getWeights(task.complexity); const costs = this.models.map(m => this.estimateCost(m, task)); const maxCost = Math.max(...costs, 1e-9)
    const scored = this.models.map((model, i) => { const quality = this.predictQuality(model, task); const cost = costs[i]; const utility = weights.quality * quality + weights.cost * (1 - cost / maxCost) + weights.latency * (1 - Number(model.avgLatency ?? .7)) + weights.specialty * this.specialtyMatch(model, task.type) - weights.risk * Number(model.risk ?? .1); return { model, quality, cost, latency: model.avgLatency ?? .7, utility, satisfiesConstraint: quality >= floor } })
    const feasible = scored.filter(item => item.satisfiesConstraint).sort((a, b) => b.utility - a.utility); const chosen = (feasible[0] || scored.sort((a, b) => b.quality - a.quality)[0])
    return { model: chosen.model, quality: chosen.quality, cost: chosen.cost, latency: chosen.latency, utility: chosen.utility, reason: feasible.length ? 'utility-optimal' : 'quality-fallback', candidates: scored }
  }
}

