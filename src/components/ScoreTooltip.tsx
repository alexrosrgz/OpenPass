"use client"

import { useState } from "react"

export function ScoreTooltip({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)

  return (
    <span
      className="relative cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-lg bg-neutral-900 px-3 py-2 text-center text-xs font-normal normal-case tracking-normal text-white shadow-lg">
          The number of destinations accessible with visa-free entry, visa on arrival, or eTA.
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-neutral-900" />
        </span>
      )}
    </span>
  )
}
