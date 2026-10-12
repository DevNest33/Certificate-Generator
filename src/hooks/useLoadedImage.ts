import { useEffect, useState } from 'react'

interface ImageState {
  src: string | null
  image: HTMLImageElement | null
  error: string | null
}

/** Loads and decodes an image. Pass null to skip loading. */
export function useLoadedImage(src: string | null): ImageState {
  const [state, setState] = useState<ImageState>({ src: null, image: null, error: null })

  useEffect(() => {
    if (!src) return
    let cancelled = false
    const image = new Image()
    image.src = src
    image.decode().then(
      () => !cancelled && setState({ src, image, error: null }),
      () => !cancelled && setState({ src, image: null, error: `Could not load ${src}` }),
    )
    return () => {
      cancelled = true
    }
  }, [src])

  return state.src === src ? state : { src, image: null, error: null }
}
