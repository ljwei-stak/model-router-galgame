import { QCGRouter } from './qcg-router.mjs'

const BEAM_WIDTH = 256
const routeId = candidate => String(candidate?.model?.id ?? '')

export class DAGAssign {
  constructor(models, qualityFloors, budget = Infinity) {
    this.models = models
    this.qualityFloors = qualityFloors
    this.budget = Number.isFinite(Number(budget)) ? Number(budget) : Infinity
    this.router = new QCGRouter(models, qualityFloors)
    this.name = 'DAG-Assign'
  }

  topologicalSort(dag) {
    const nodes = new Map(dag.nodes.map(node => [node.id, node]))
    const degree = new Map(dag.nodes.map(node => [node.id, 0]))
    const adjacency = new Map(dag.nodes.map(node => [node.id, []]))
    for (const edge of dag.edges) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error(`DAG edge references unknown node: ${edge.from}->${edge.to}`)
      adjacency.get(edge.from).push(edge.to)
      degree.set(edge.to, degree.get(edge.to) + 1)
    }
    const queue = dag.nodes.filter(node => degree.get(node.id) === 0).map(node => node.id).sort()
    const sorted = []
    while (queue.length > 0) {
      const id = queue.shift()
      sorted.push(nodes.get(id))
      for (const next of adjacency.get(id).slice().sort()) {
        degree.set(next, degree.get(next) - 1)
        if (degree.get(next) === 0) {
          queue.push(next)
          queue.sort()
        }
      }
    }
    if (sorted.length !== dag.nodes.length) throw new Error('DAG contains cycle')
    return sorted
  }

  computeCriticality(dag, sorted) {
    const descendants = new Map(sorted.map(node => [node.id, new Set()]))
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      const id = sorted[index].id
      for (const edge of dag.edges.filter(item => item.from === id)) {
        descendants.get(id).add(edge.to)
        for (const child of descendants.get(edge.to)) descendants.get(id).add(child)
      }
    }
    return new Map(sorted.map(node => [node.id, descendants.get(node.id).size + (node.type === 'synthesis' ? 100 : 0)]))
  }

  candidatesFor(node) {
    const feasible = this.router.paretoCandidates(node.task)
    if (feasible.length > 0) return { candidates: feasible, relaxed: false }
    const fallback = this.router.evaluate(node.task)
      .sort((left, right) => right.quality - left.quality || left.cost - right.cost || routeId(left).localeCompare(routeId(right)))
      .slice(0, 3)
    return { candidates: fallback, relaxed: true }
  }

  solve(dag, sorted, pools, criticality, budget) {
    const incoming = new Map(sorted.map(node => [node.id, []]))
    for (const edge of dag.edges) incoming.get(edge.to).push(edge.from)
    const suffixMinimum = Array(sorted.length + 1).fill(0)
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      suffixMinimum[index] = suffixMinimum[index + 1] + Math.min(...pools[index].candidates.map(candidate => candidate.cost))
    }
    if (suffixMinimum[0] > budget + 1e-12) return null
    let states = [{ decisions: [], routes: new Map(), totalCost: 0, utility: 0, switches: 0, relaxedCount: 0 }]
    for (let index = 0; index < sorted.length; index += 1) {
      const node = sorted[index]
      const expanded = []
      for (const state of states) {
        for (const candidate of pools[index].candidates) {
          const totalCost = state.totalCost + candidate.cost
          if (totalCost + suffixMinimum[index + 1] > budget + 1e-12) continue
          const dependencySwitches = incoming.get(node.id).reduce((count, dependency) => count + (state.routes.get(dependency) !== routeId(candidate) ? 1 : 0), 0)
          const synthesisBonus = node.type === 'synthesis' ? candidate.quality * 0.18 : 0
          const criticalityBonus = candidate.quality * Math.min(0.10, Number(criticality.get(node.id) ?? 0) * 0.005)
          const routes = new Map(state.routes)
          routes.set(node.id, routeId(candidate))
          expanded.push({
            decisions: [...state.decisions, { node, candidate, dependencySwitches }],
            routes,
            totalCost,
            utility: state.utility + candidate.utility + synthesisBonus + criticalityBonus - dependencySwitches * 0.015,
            switches: state.switches + dependencySwitches,
            relaxedCount: state.relaxedCount + (candidate.satisfiesConstraint ? 0 : 1),
          })
        }
      }
      if (expanded.length === 0) return null
      expanded.sort((left, right) => left.relaxedCount - right.relaxedCount || right.utility - left.utility || left.totalCost - right.totalCost || left.switches - right.switches || left.decisions.map(item => routeId(item.candidate)).join('|').localeCompare(right.decisions.map(item => routeId(item.candidate)).join('|')))
      states = expanded.slice(0, BEAM_WIDTH)
    }
    return { ...states[0], minimumFeasibleCost: suffixMinimum[0] }
  }

  assign(dag) {
    const sorted = this.topologicalSort(dag)
    const criticality = this.computeCriticality(dag, sorted)
    const pools = sorted.map(node => this.candidatesFor(node))
    if (pools.some(pool => pool.candidates.length === 0)) return { assignment: new Map(), totalCost: 0, avgQuality: 0, sortedNodes: sorted, criticality, withinBudget: false, budgetFeasible: false, constraintRelaxed: true, handoffCount: 0 }
    const constrained = this.solve(dag, sorted, pools, criticality, this.budget)
    const unconstrained = constrained ?? this.solve(dag, sorted, pools, criticality, Infinity)
    const assignment = new Map()
    for (const decision of unconstrained?.decisions ?? []) {
      const { node, candidate, dependencySwitches } = decision
      assignment.set(node.id, {
        model: candidate.model,
        quality: candidate.quality,
        cost: candidate.cost,
        latency: candidate.latency,
        utility: candidate.utility,
        criticality: criticality.get(node.id),
        dependencySwitches,
        satisfiesConstraint: candidate.satisfiesConstraint,
      })
    }
    const totalCost = unconstrained?.totalCost ?? 0
    const avgQuality = assignment.size ? [...assignment.values()].reduce((sum, item) => sum + item.quality, 0) / assignment.size : 0
    return {
      assignment,
      totalCost,
      avgQuality,
      sortedNodes: sorted,
      criticality,
      withinBudget: totalCost <= this.budget + 1e-12,
      budgetFeasible: constrained !== null,
      constraintRelaxed: (unconstrained?.relaxedCount ?? 0) > 0,
      handoffCount: unconstrained?.switches ?? 0,
      minimumFeasibleCost: unconstrained?.minimumFeasibleCost ?? 0,
      solver: 'pareto-pruned dependency-aware beam assignment',
    }
  }
}
