import React from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { shouldFallbackToPlainText } from './markdown-safe.mjs'

/** Host MarkdownText may throw on incomplete streamed code blocks; keep GAL usable. */
export class SafeMarkdownText extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    const text = String(this.props.text ?? '')
    // The host renderer currently cannot handle fenced blocks with some
    // streamed/mermaid payloads. Keep those responses readable as plain text.
    if (shouldFallbackToPlainText(text, this.state.failed)) {
      return <span className="gv-plain-text">{text}</span>
    }
    return <MarkdownText {...this.props} />
  }
}
