import { useCallback, useState } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

let nextToastId = 1

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextToastId++
      setToasts((list) => [...list.slice(-3), { id, tone, message }])
      setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4500)
    },
    [dismiss],
  )

  return { toasts, notify, dismiss }
}
