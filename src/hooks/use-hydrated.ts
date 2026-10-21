'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * Hydration-safe "is mounted" flag.
 * Returns false during SSR and the hydration render, true afterwards —
 * without calling setState inside an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
