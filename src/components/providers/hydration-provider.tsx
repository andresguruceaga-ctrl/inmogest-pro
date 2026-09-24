'use client'

import { useSyncExternalStore } from 'react'
import { useAppStore } from '@/lib/store'

// This component handles Zustand persist hydration
// It prevents rendering children until the store is hydrated from localStorage
export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useSyncExternalStore(
    (onStoreChange) =>
      useAppStore.persist?.onFinishHydration(onStoreChange) ?? (() => undefined),
    () => useAppStore.persist?.hasHydrated() ?? false,
    () => false
  )
  
  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
