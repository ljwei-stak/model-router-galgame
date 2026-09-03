import fs from 'node:fs/promises'
import path from 'node:path'
import { loadConfig } from './utils/config.mjs'
import { Experiment1SingleTask } from './experiments/experiment-1-single-task.mjs'
import { Experiment2WeightSensitivity } from './experiments/experiment-2-weight-sensitivity.mjs'
import { Experiment3Collaboration } from './experiments/experiment-3-collaboration.mjs'
import { Experiment4OnlineLearning } from './experiments/experiment-4-online-learning.mjs'
import { Experiment5BudgetConstraint } from './experiments/experiment-5-budget-constraint.mjs'
import { Experiment6Ablation } from './experiments/experiment-6-ablation.mjs'
import { ReportBuilder } from './visualization/report-builder.mjs'
import { ChartGenerator } from './visualization/chart-generator.mjs'

export class ExperimentManager {
  constructor(config, rootDir = process.cwd()) { this.config = config; this.rootDir = rootDir; this.experiments = []; this.results = new Map() }
  registerExperiment(experiment) { this.experiments.push(experiment) }
  async runAll() {
    const chart = new ChartGenerator(path.join(this.rootDir, 'outputs', 'charts'))
    for (const experiment of this.experiments) {
      const started = Date.now()
      try {
        const result = await experiment.run()
        result.charts ||= []
        if (experiment.id === 'exp1-single-task' && result.stats?.byAlgorithm) {
          result.charts.push(await chart.bar({ title: 'Experiment 1: Average latency', data: Object.fromEntries(Object.entries(result.stats.byAlgorithm).map(([k, v]) => [k, v.avgLatency])), filename: 'exp1-latency-by-algorithm.png' }))
        }
        if (experiment.id === 'exp2-weight-sensitivity' && Array.isArray(result.results)) {
          result.charts.push(await chart.line({ title: 'Experiment 2: Quality response to weight', series: [{ values: result.results.map(row => row.avgQuality) }], filename: 'exp2-quality-weight-curve.png' }))
        }
        if (experiment.id === 'exp3-collaboration' && Array.isArray(result.results)) {
          result.charts.push(await chart.scatter({ title: 'Experiment 3: DAG cost-quality points', data: result.results.map(row => ({ x: row.collaborationCost, y: row.collaborationQuality })), filename: 'exp3-collaboration-scatter.png' }))
        }
        if (experiment.id === 'exp4-online-learning' && Array.isArray(result.results)) {
          result.charts.push(await chart.line({ title: 'Experiment 4: Utility over iterations', series: [{ values: result.results.map(row => row.utility) }], filename: 'exp4-utility-curve.png', max: 1 }))
        }
        if (experiment.id === 'exp5-budget-constraint' && Array.isArray(result.results)) {
          result.charts.push(await chart.line({ title: 'Experiment 5: Budget satisfaction', series: [{ values: result.results.map(row => row.satisfaction) }], filename: 'exp5-budget-satisfaction.png', max: 1 }))
          result.charts.push(await chart.bar({ title: 'Experiment 5: Mean cost by budget', data: Object.fromEntries(result.results.map(row => [`$${row.budget}`, row.cost])), filename: 'exp5-cost-by-budget.png' }))
        }
        if (experiment.id === 'exp6-ablation' && Array.isArray(result.results)) {
          result.charts.push(await chart.bar({ title: 'Experiment 6: Ablation cost impact', data: Object.fromEntries(result.results.map(row => [row.mode, row.avgCost])), filename: 'exp6-ablation-cost.png' }))
        }
        this.results.set(experiment.id, { ...result, duration: Date.now() - started, timestamp: new Date().toISOString() })
      } catch (error) {
        this.results.set(experiment.id, { name: experiment.name, error: String(error?.stack || error), duration: Date.now() - started })
      }
    }
    return this.results
  }
  async generateReport() { return new ReportBuilder(this.results, this.config, path.join(this.rootDir, 'outputs', 'reports')).build() }
  async saveResults(file = path.join(this.rootDir, 'outputs', 'data', 'raw-results.json')) { await fs.mkdir(path.dirname(file), { recursive: true }); const serializable = Object.fromEntries(this.results); await fs.writeFile(file, JSON.stringify(serializable, (key, value) => value instanceof Map ? Object.fromEntries(value) : value, 2)); return file }
}

export async function main() { const root = process.cwd(); const config = await loadConfig(path.join(root, 'config.json')); const manager = new ExperimentManager(config, root); const charts = path.join(root, 'outputs', 'charts'); manager.registerExperiment(new Experiment1SingleTask(config, charts)); manager.registerExperiment(new Experiment2WeightSensitivity(config, charts)); manager.registerExperiment(new Experiment3Collaboration(config, charts)); manager.registerExperiment(new Experiment4OnlineLearning(config, charts)); manager.registerExperiment(new Experiment5BudgetConstraint(config, charts)); manager.registerExperiment(new Experiment6Ablation(config, charts)); await manager.runAll(); const report = await manager.generateReport(); await manager.saveResults(); await fs.mkdir(path.join(root, 'outputs'), { recursive: true }); await fs.writeFile(path.join(root, 'outputs', 'data', 'experiment-log.txt'), `completed ${new Date().toISOString()}\n`); console.log(`Report: ${report.filepath}`); console.log('Charts: outputs/charts'); return manager.results }

// The plugin is a runnable CLI; keeping the entrypoint unconditional also
// works on Windows where drive-letter file URLs differ from argv paths.
if (process.argv[1] && path.basename(process.argv[1]) === 'index.mjs') main().catch(error => { console.error(error); process.exitCode = 1 })
