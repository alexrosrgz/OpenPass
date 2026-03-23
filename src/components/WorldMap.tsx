"use client"

import { useState, useRef, useCallback, useEffect, memo } from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
} from "@vnedyalk0v/react19-simple-maps"
import { motion, AnimatePresence } from "framer-motion"
import type { VisaRequirement } from "@/lib/types"
import { REQUIREMENT_CONFIG } from "@/lib/constants"
import { NUMERIC_TO_ISO3 } from "@/lib/geo"
import { MapControls } from "./MapControls"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geoData: any = require("world-atlas/countries-110m.json")

interface WorldMapProps {
  requirements: VisaRequirement[]
  passportCode: string
  countries: Record<string, { name: string; iso3: string }>
  showHint?: boolean
  showControls?: boolean
}

const WorldMapInner = memo(function WorldMapInner({
  requirements,
  passportCode,
  countries,
  showHint = true,
  showControls = true,
}: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{
    name: string
    requirement: string
    color: string
    x: number
    y: number
  } | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const MIN_ZOOM = 1
  const MAX_ZOOM = 8
  const containerRef = useRef<HTMLDivElement>(null)

  const clampPan = useCallback((x: number, y: number, z: number) => {
    const basePanX = 120
    const maxPanX = basePanX + (500 * (z - 1)) / z
    const maxPanY = (250 * (z - 1)) / z
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    }
  }, [])

  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg")
    if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid slice")
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((prevZ) => {
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZ * factor))
        setPan((prevPan) => clampPan(prevPan.x, prevPan.y, newZ))
        return newZ
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [clampPan])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const rawX = dragStart.current.panX + dx / zoom
    const rawY = dragStart.current.panY + dy / zoom
    setPan(clampPan(rawX, rawY, zoom))
  }, [dragging, zoom, clampPan])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * 1.3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const newZ = Math.max(MIN_ZOOM, z / 1.3)
      setPan((p) => clampPan(p.x, p.y, newZ))
      return newZ
    })
  }, [clampPan])

  // Build lookup: ISO3 → requirement
  const reqMap = new Map<string, VisaRequirement>()
  for (const r of requirements) {
    reqMap.set(r.destination, r)
  }

  const getColor = (iso3: string): string => {
    if (iso3 === passportCode) return "#3b82f6" // passport's own country — blue
    const req = reqMap.get(iso3)
    if (!req) return "#e5e5e5"
    return REQUIREMENT_CONFIG[req.requirement].mapColor
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden"
      style={{ cursor: dragging ? "grabbing" : "grab", height: "100%", touchAction: "none" }}
      onPointerLeave={() => { setTooltip(null); setDragging(false) }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: 170,
        }}
        width={1000}
        height={500}
        className="w-full h-full"
        style={{ backgroundColor: "transparent" }}
      >
        <g transform={`translate(${500 + pan.x * zoom}, ${258 + pan.y * zoom}) scale(${zoom}) translate(-500, -250)`}>
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoId = String(geo.id ?? "")
              const iso3 = NUMERIC_TO_ISO3[geoId] || ""
              const req = reqMap.get(iso3)
              const fillColor = getColor(iso3)
              const geoName =
                (geo.properties as Record<string, string>)?.name || ""

              return (
                <Geography
                  key={geoId || geoName}
                  geography={geo}
                  fill={fillColor}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      outline: "none",
                      fill: fillColor,
                      filter: "brightness(0.85)",
                      cursor: "pointer",
                    },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(evt) => {
                    const name =
                      countries[iso3]?.name || geoName || "Unknown"
                    const reqLabel = req
                      ? REQUIREMENT_CONFIG[req.requirement].label +
                        (req.days ? ` (${req.days} days)` : "")
                      : iso3 === passportCode
                      ? "Your passport"
                      : "No data"
                    setTooltip({
                      name,
                      requirement: reqLabel,
                      color: fillColor,
                      x: evt.clientX,
                      y: evt.clientY,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })
          }
        </Geographies>
        </g>
      </ComposableMap>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed z-50 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 12,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tooltip.color }}
              />
              <span className="text-sm font-medium text-neutral-900">
                {tooltip.name}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-600">
              {tooltip.requirement}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showControls && <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} showHint={showHint} />}
    </div>
  )
})

export { WorldMapInner as WorldMap }
