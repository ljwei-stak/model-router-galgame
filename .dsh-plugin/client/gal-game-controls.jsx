import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function Tool({ label, icon: Icon, className = '', ...props }) {
  return <button type="button" className={`gg-tool ${className}`} title={label} aria-label={label} {...props}><Icon size={18} aria-hidden="true" /></button>
}

export function Panel({ title, children, onClose, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    const previous = document.activeElement
    element.showModal()
    return () => { element.close(); if (previous?.isConnected) previous.focus?.() }
  }, [])
  return <dialog ref={ref} className={`gg-panel ${wide ? 'gg-panel-wide' : ''}`} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header><h2>{title}</h2><Tool label="关闭" icon={X} onClick={onClose} /></header>
    <div className="gg-panel-body">{children}</div>
  </dialog>
}
