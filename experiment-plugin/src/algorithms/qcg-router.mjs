const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const modelId = model => String(model?.id ?? '')

export class QCGRouter {
  constructor(models, qualityFloors = { simple: 0.75, balanced: 0.78, complex: 0.82 }) {
    this.models = Array.isArray(models) ? models : []
    this.qualityFloors = qualityFloors
    this.name = 'QCG-Router'
  }

  predictQuality(model, task) {
    return Math.min(0.995, Number(model.liveBenchScore ?? model.quality ?? 0.8)
      + this.specialtyMatch(model, task.type) * 0.04
      - (task.complexity === 'complex' ? 0.015 : 0))
  }

  estimateCost(model, task) {
    const input = Math.max(80, Math.ceil(String(task.text ?? '').length / 3.7))
    const output = task.complexity === 'complex' ? 1200 : task.complexity === 'balanced' ? 800 : 420
    return (input * Number(model.pricing?.input ?? model.costIn ?? 0)
      + output * Number(model.pricing?.output ?? model.costOut ?? 0)) / 1e6
  }

  specialtyMatch(model, type) {
    return (model.specialties || []).includes(type) ? 1 : (type === 'general' ? 0.6 : 0.35)
  }

  getWeights(complexity) {
    return ({
      simple: { quality: 0.30, cost: 0.50, latency: 0.14, specialty: 0.04, risk: 0.02 },
      balanced: { quality: 0.45, cost: 0.30, latency: 0.10, specialty: 0.10, risk: 0.05 },
      complex: { quality: 0.55, cost: 0.16, latency: 0.06, specialty: 0.16, risk: 0.07 },
    })[complexity] || this.getWeights('balanced')
  }

  evaluate(task) {
    const floor = Number(task.qualityFloor ?? this.qualityFloors[task.complexity] ?? 0.75)
    const weights = this.getWeights(task.complexity)
    const costs = this.models.map(model => this.estimateCost(model, task))
    const maxCost = Math.max(...costs, 1e-9)
    return this.models.map((model, index) => {
      const quality = this.predictQuality(model, task)
      const cost = costs[index]
      const latency = Number(model.avgLatency ?? 0.7)
      const specialty = this.specialtyMatch(model, task.type)
      const risk = Number(model.risk ?? 0.1)
      const utility = weights.quality * quality
        + weights.cost * clamp(1 - cost / maxCost)
        + weights.latency * (1 - clamp(latency))
        + weights.specialty * specialty
        - weights.risk * risk
      return { model, quality, cost, latency, specialty, risk, utility, satisfiesConstraint: quality >= floor, qualityFloor: floor }
    })
  }

  paretoCandidates(task, { requireQuality = true } = {}) {
    const evaluated = this.evaluate(task)
    const source = requireQuality ? evaluated.filter(item => item.satisfiesConstraint) : evaluated
    return source.filter(candidate => !source.some(other => other !== candidate && this.dominates(other, candidate)))
      .sort((left, right) => right.utility - left.utility || left.cost - right.cost || modelId(left.model).localeCompare(modelId(right.model)))
  }

  dominates(left, right) {
    const noWorse = left.quality >= right.quality
      && left.cost <= right.cost
      && left.latency <= right.latency
      && left.specialty >= right.specialty
      && left.risk <= right.risk
    const strictlyBetter = left.quality > right.quality
      || left.cost < right.cost
      || left.latency < right.latency
      || left.specialty > right.specialty
      || left.risk < right.risk
    return noWorse && strictlyBetter
  }

  route(task) {
    const scored = this.evaluate(task)
    if (scored.length === 0) return { model: null, quality: 0, cost: 0, latency: 0, utility: 0, reason: 'no-models', candidates: [], constraintRelaxed: true, paretoPruned: 0 }
    const feasible = scored.filter(item => item.satisfiesConstraint)
    const frontier = this.paretoCandidates(task, { requireQuality: feasible.length > 0 })
    const chosen = frontier[0]
      ?? scored.slice().sort((left, right) => right.quality - left.quality || left.cost - right.cost || modelId(left.model).localeCompare(modelId(right.model)))[0]
    return {
      model: chosen.model,
      quality: chosen.quality,
      cost: chosen.cost,
      latency: chosen.latency,
      utility: chosen.utility,
      reason: feasible.length ? 'pareto-utility-optimal' : 'quality-fallback',
      candidates: scored,
      frontier,
      constraintRelaxed: !chosen.satisfiesConstraint,
      paretoPruned: Math.max(0, scored.length - frontier.length),
    }
  }
}
