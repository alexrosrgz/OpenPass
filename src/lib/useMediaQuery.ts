"use client"

import { useSyncExternalStore } from "react"

function subscribe(query: string, onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const mediaQuery = window.matchMedia(query)
  const handleChange = () => onStoreChange()

  mediaQuery.addEventListener("change", handleChange)

  return () => {
    mediaQuery.removeEventListener("change", handleChange)
  }
}

function getSnapshot(query: string) {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => getSnapshot(query),
    () => false
  )
}
