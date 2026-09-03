import fs from 'node:fs/promises'
export async function saveJson(file, value) { await fs.mkdir(new URL('.', `file://${file.replace(/\\/g, '/')}`).pathname, { recursive: true }).catch(() => {}); await fs.writeFile(file, JSON.stringify(value, null, 2)) }

