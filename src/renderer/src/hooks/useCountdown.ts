import { useEffect, useState } from 'react'

/**
 * Current time that ticks on an interval, paused while the document is hidden.
 * Shared by every countdown on screen so they re-render together.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const start = (): void => {
      if (timer) return
      setNow(Date.now())
      timer = setInterval(() => setNow(Date.now()), intervalMs)
    }
    const stop = (): void => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const onVisibility = (): void => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)
    onVisibility()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [intervalMs])

  return now
}
