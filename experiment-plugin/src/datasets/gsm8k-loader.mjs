import { generateTasks } from './synthetic-tasks.mjs'
export class GSM8KLoader { async load(count = 50) { return generateTasks(count, 37).map(task => ({ ...task, dataset: 'GSM8K', type: 'math' })) } }

