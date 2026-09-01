/** True when GAL should bypass the host Markdown renderer for this payload. */
export function shouldFallbackToPlainText(text, failed = false) {
  return failed || /```|~~~/.test(String(text ?? ''))
}
