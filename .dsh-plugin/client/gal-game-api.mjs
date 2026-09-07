export const GAL_GAME_CHANNEL = '/model-router-gal-game'

export function createGalGameApi(connectionRpc) {
  async function call(endpoint, payload = {}, { signal } = {}) {
    if (typeof connectionRpc?.call !== 'function') throw new Error('游戏模型服务尚未连接。')
    const response = await connectionRpc.call(GAL_GAME_CHANNEL, endpoint, payload, signal)
    if (!response?.ok) throw new Error(response?.error?.message || '游戏请求未完成，请重试。')
    return response.value
  }
  return {
    catalog: () => call('catalog'),
    turn: (payload, options) => call('turn', payload, options),
  }
}
