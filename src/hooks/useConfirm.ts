import { useCallback, useState } from 'react'
import type { ConfirmOptions } from '../components/ui'

/** Promise-based confirmation. Render `<ConfirmDialog options={options} onResolve={resolve} />` once. */
export function useConfirm() {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  )

  const resolve = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok)
      setPending(null)
    },
    [pending],
  )

  return { confirm, options: pending?.options ?? null, resolve }
}
