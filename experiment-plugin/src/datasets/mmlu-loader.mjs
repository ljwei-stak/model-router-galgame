import { generateTasks } from './synthetic-tasks.mjs'
export class MMLULoader { async load(count = 100) { return generateTasks(count, 11).map(task => ({ ...task, dataset: 'MMLU' })) } }

