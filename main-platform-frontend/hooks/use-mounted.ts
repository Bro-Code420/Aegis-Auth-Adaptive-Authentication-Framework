import { useEffect, useState } from "react"

/**
 * Standard hook to handle client-side mounting in Next.js
 * Prevents hydration mismatches by ensuring component only 
 * execute browser-only logic after the first render.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
