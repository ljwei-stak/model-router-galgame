import test from 'node:test'
import assert from 'node:assert/strict'
import { QCGRouter } from '../src/algorithms/qcg-router.mjs'
import { AMORouter } from '../src/algorithms/amo-router.mjs'
import { DAGAssign } from '../src/algorithms/dag-assign.mjs'
import { generateDags } from '../src/datasets/synthetic-tasks.mjs'
import config from '../config.json' with { type: 'json' }

test('QCG and AMO return quality-aware decisions', () => { const task = { type: 'code', complexity: 'balanced', qualityFloor: .78, text: 'debug '.repeat(30) }; const qcg = new QCGRouter(config.models, config.qualityFloors); const amo = new AMORouter(config.models, config.qualityFloors); assert.ok(qcg.route(task).model); assert.ok(amo.route(task).model); amo.learn(.0001, .9, .0001, .78); assert.ok(Math.abs(Object.values(amo.weights.balanced).reduce((a, b) => a + b, 0) - 1) < 1e-9) })
test('DAG-Assign topologically orders and assigns every node', () => { const dag = new DAGAssign(config.models, config.qualityFloors); const result = dag.assign(generateDags(1)[0]); assert.equal(result.assignment.size, result.sortedNodes.length); assert.ok(result.avgQuality > 0) })

test('QCG prunes dominated candidates while preserving the quality floor', () => {
  const router = new QCGRouter([
    { id: 'cheap', liveBenchScore: .84, pricing: { input: .1, output: .2 }, avgLatency: .8, specialties: ['code'], risk: .2 },
    { id: 'dominated', liveBenchScore: .84, pricing: { input: .2, output: .4 }, avgLatency: .9, specialties: ['code'], risk: .3 },
    { id: 'strong', liveBenchScore: .94, pricing: { input: 1, output: 2 }, avgLatency: .5, specialties: ['code'], risk: .1 },
  ])
  const decision = router.route({ type: 'code', complexity: 'balanced', qualityFloor: .78, text: 'debug '.repeat(20) })
  assert.ok(decision.model)
  assert.ok(decision.quality >= .78)
  assert.ok(decision.paretoPruned >= 1)
})

test('AMO increases cost pressure when observed cost is above target', () => {
  const router = new AMORouter(config.models, config.qualityFloors, .05)
  router.route({ type: 'code', complexity: 'balanced', qualityFloor: .78, text: 'debug '.repeat(20) })
  const before = router.weights.balanced.cost
  router.learn(.01, .9, .001, .78)
  assert.ok(router.weights.balanced.cost > before)
})

test('DAG-Assign keeps dependency order and never violates a feasible quality floor for budget fallback', () => {
  const dag = new DAGAssign(config.models, config.qualityFloors, .05)
  const result = dag.assign(generateDags(1)[0])
  const positions = new Map(result.sortedNodes.map((node, index) => [node.id, index]))
  for (const edge of generateDags(1)[0].edges) assert.ok(positions.get(edge.from) < positions.get(edge.to))
  for (const [id, assignment] of result.assignment) {
    assert.ok(assignment.model)
    if (!result.constraintRelaxed) assert.equal(assignment.satisfiesConstraint, true, id)
  }
})
