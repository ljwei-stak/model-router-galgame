import test from 'node:test'
import assert from 'node:assert/strict'
import { QCGRouter } from '../src/algorithms/qcg-router.mjs'
import { AMORouter } from '../src/algorithms/amo-router.mjs'
import { DAGAssign } from '../src/algorithms/dag-assign.mjs'
import { generateDags } from '../src/datasets/synthetic-tasks.mjs'
import config from '../config.json' with { type: 'json' }

test('QCG and AMO return quality-aware decisions', () => { const task = { type: 'code', complexity: 'balanced', qualityFloor: .78, text: 'debug '.repeat(30) }; const qcg = new QCGRouter(config.models, config.qualityFloors); const amo = new AMORouter(config.models, config.qualityFloors); assert.ok(qcg.route(task).model); assert.ok(amo.route(task).model); amo.learn(.0001, .9, .0001, .78); assert.ok(Math.abs(Object.values(amo.weights.balanced).reduce((a, b) => a + b, 0) - 1) < 1e-9) })
test('DAG-Assign topologically orders and assigns every node', () => { const dag = new DAGAssign(config.models, config.qualityFloors); const result = dag.assign(generateDags(1)[0]); assert.equal(result.assignment.size, result.sortedNodes.length); assert.ok(result.avgQuality > 0) })

