export function classifyTask(task) { return task?.type || (/code|代码/i.test(task?.text) ? 'code' : 'general') }

