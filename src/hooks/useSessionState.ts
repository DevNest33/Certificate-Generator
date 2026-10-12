import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/** React state mirrored to sessionStorage, so it survives reloads but not closing the tab. */
export function useSessionState<T>(
  key: string,
  initial: T | (() => T),
  revive?: (stored: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        return revive ? revive(parsed) : (parsed as T)
      }
    } catch {
      // Unreadable or outdated data falls back to the default.
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be full or disabled; the app keeps working from memory.
    }
  }, [key, value])

  return [value, setValue]
}
