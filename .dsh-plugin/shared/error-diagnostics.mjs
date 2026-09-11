/** Render a bounded, metadata-only error cause chain for host diagnostics. */
export function formatErrorChain(error, maxDepth = 6) {
  const parts = []
  const seen = new Set()
  let current = error
  while (current !== undefined && current !== null && parts.length < maxDepth && !seen.has(current)) {
    seen.add(current)
    const name = typeof current?.name === 'string' && current.name !== '' ? current.name : 'Error'
    const code = typeof current?.code === 'string' && current.code !== '' ? ` code=${current.code}` : ''
    const message = typeof current?.message === 'string' && current.message !== ''
      ? current.message
      : (typeof current === 'string' ? current : String(current))
    parts.push(`${name}${code}: ${message}`)
    current = current?.cause
  }
  return parts.join(' <- caused by ')
}
