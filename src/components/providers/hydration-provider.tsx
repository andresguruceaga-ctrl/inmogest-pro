'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'

// This component handles Zustand persist hydration
// It prevents rendering children until the store is hydrated from localStorage
export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  
  useEffect(() => {
    // Wait for Zustand persist to rehydrate
    const unsubHydrate = useAppStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })
    
    // If already hydrated (on subsequent renders), set immediately
    if (useAppStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }
    
    return unsubHydrate
  }, [])
  
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
