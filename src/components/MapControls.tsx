"use client"

import { Plus, Minus } from "lucide-react"
import { useMediaQuery } from "@/lib/useMediaQuery"

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  showHint?: boolean
}

export function MapControls({ onZoomIn, onZoomOut, showHint = true }: MapControlsProps) {
  const isTouch = useMediaQuery("(hover: none)")

  return (
    <>
      {/* Zoom buttons + hint */}
      <div className="absolute top-3 right-3 z-10 flex items-start gap-1.5">
        {showHint && (
          <div className="mt-0.5 rounded-md bg-white/80 px-2 py-1 text-[10px] text-neutral-400 backdrop-blur-sm">
            {isTouch ? "Drag to move · Pinch to zoom" : "Drag to move · Scroll to zoom"}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            onClick={onZoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white/90 text-neutral-600 backdrop-blur-sm transition-colors hover:bg-neutral-100"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white/90 text-neutral-600 backdrop-blur-sm transition-colors hover:bg-neutral-100"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
