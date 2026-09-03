import { generateTasks } from './synthetic-tasks.mjs'
export class HumanEvalLoader { async load(count = 50) { return generateTasks(count, 23).map(task => ({ ...task, dataset: 'HumanEval', type: 'code' })) } }

