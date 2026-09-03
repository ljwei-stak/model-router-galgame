import fs from 'node:fs/promises'
export async function loadConfig(file = './config.json') { return JSON.parse(await fs.readFile(file, 'utf8')) }

