'use client'

import { useState } from 'react'

export function CopyKeyButton({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: '12px 18px',
        background: 'var(--ink)',
        color: 'var(--paper)',
        border: 'none',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        flexShrink: 0,
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
