import { useState, useEffect } from 'react'

export function useCountdown(dateUtc: string): string {
  const [text, setText] = useState(() => calc(dateUtc))

  useEffect(() => {
    const id = setInterval(() => setText(calc(dateUtc)), 1000)
    return () => clearInterval(id)
  }, [dateUtc])

  return text
}

function calc(dateUtc: string): string {
  const diff = new Date(dateUtc).getTime() - Date.now()
  if (diff <= 0) {
    const elapsed = -diff
    if (elapsed < 7200000) return '🔴 LIVE'
    return '✓ FT'
  }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}
