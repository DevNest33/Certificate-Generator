import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

type StorageKind = 'session' | 'local'

function storageFor(kind: StorageKind): Storage | null {
  try {
    return kind === 'session' ? sessionStorage : localStorage
  } catch {
    // Disabled in some privacy modes; the app keeps working from memory.
    return null
  }
}

/** React state mirrored to a Web Storage area. */
export function useStoredState<T>(
  kind: StorageKind,
  key: string,
  initial: T | (() => T),
  revive?: (stored: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = storageFor(kind)?.getItem(key)
      if (raw != null) {
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
      storageFor(kind)?.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be full or disabled; the app keeps working from memory.
    }
  }, [kind, key, value])

  return [value, setValue]
}

/** Survives reloads but not closing the tab. For view state that should not outlive a sitting. */
export function useSessionState<T>(
  key: string,
  initial: T | (() => T),
  revive?: (stored: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  return useStoredState('session', key, initial, revive)
}

/** Survives closing the tab. For presets, batch data and export history. */
export function useLocalState<T>(
  key: string,
  initial: T | (() => T),
  revive?: (stored: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  return useStoredState('local', key, initial, revive)
}
