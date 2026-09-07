import React from 'react'
import { createRoot } from 'react-dom/client'
import { GalGameView } from '../.dsh-plugin/client/GalGameView.jsx'

async function request(path, payload, { signal } = {}) {
  const response = await fetch(path, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal,
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || '本地预览请求失败')
  return result
}

const gameApi = {
  catalog: () => request('/api/catalog'),
  configure: configuration => request('/api/configure', configuration),
  turn: (payload, options) => request('/api/turn', payload, options),
}

createRoot(document.getElementById('root')).render(
  <GalGameView gameApi={gameApi} storageKey="model-router-galgame:preview:v1" preview />,
)
