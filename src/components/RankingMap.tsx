"use client"

import { useState, useRef, useCallback, useEffect, memo } from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
} from "@vnedyalk0v/react19-simple-maps"
import { motion, AnimatePresence } from "framer-motion"
import { NUMERIC_TO_ISO3 } from "@/lib/geo"
import { MapControls } from "./MapControls"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const geoData: any = require("world-atlas/countries-110m.json")

interface RankingMapProps {
  passports: { code: string; name: string; score: number; rank: number }[]
  countries: Record<string, { name: string; iso3: string }>
}

export function scoreToColor(score: number, maxScore: number): string {
  if (score === 0) return "#e5e5e5"
  const ratio = score / maxScore
  if (ratio > 0.8) return "#059669"   // emerald-600
  if (ratio > 0.6) return "#34d399"   // emerald-400
  if (ratio > 0.4) return "#fbbf24"   // amber-400
  if (ratio > 0.2) return "#f97316"   // orange-500
  return "#ef4444"                     // red-500
}

const RankingMapInner = memo(function RankingMapInner({
  passports,
  countries,
}: RankingMapProps) {
  const [tooltip, setTooltip] = useState<{
    name: string
    rank: number
    score: number
    color: string
    x: number
    y: number
  } | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const wasDrag = useRef(false)
  const activePointers = useRef(new Set<number>())
  const containerRef = useRef<HTMLDivElement>(null)

  const MIN_ZOOM = 1
  const MAX_ZOOM = 8

  const clampPan = useCallback((x: number, y: number, z: number) => {
    const basePanX = 250
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
    const dismiss = () => setTooltip(null)
    window.addEventListener("scroll", dismiss, { passive: true })
    document.addEventListener("touchstart", dismiss, { passive: true })
    return () => {
      window.removeEventListener("scroll", dismiss)
      document.removeEventListener("touchstart", dismiss)
    }
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
    let lastPinchDist = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist = Math.hypot(dx, dy)
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        if (lastPinchDist > 0) {
          const raw = dist / lastPinchDist
          const factor = 1 + (raw - 1) * 0.4
          setZoom((prevZ) => {
            const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZ * factor))
            setPan((prevPan) => clampPan(prevPan.x, prevPan.y, newZ))
            return newZ
          })
        }
        lastPinchDist = dist
      }
    }
    const onTouchEnd = () => { lastPinchDist = 0 }
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [clampPan])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    activePointers.current.add(e.pointerId)
    ;(e.target as Element).setPointerCapture(e.pointerId)
    if (activePointers.current.size === 1) {
      setDragging(true)
      wasDrag.current = false
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    } else {
      setDragging(false)
      wasDrag.current = true
      setTooltip(null)
    }
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || activePointers.current.size !== 1) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (!wasDrag.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      wasDrag.current = true
      setTooltip(null)
    }
    const rawX = dragStart.current.panX + dx / zoom
    const rawY = dragStart.current.panY + dy / zoom
    setPan(clampPan(rawX, rawY, zoom))
  }, [dragging, zoom, clampPan])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size === 0) {
      setDragging(false)
      if (!wasDrag.current) {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const path = el?.closest("[data-iso3]")
        const iso3 = path?.getAttribute("data-iso3")
        if (iso3) {
          const data = passportMap.get(iso3)
          const fillColor = data ? scoreToColor(data.score, maxScore) : "#e5e5e5"
          const name = countries[iso3]?.name || data?.name || iso3
          setTooltip({
            name,
            rank: data?.rank || 0,
            score: data?.score || 0,
            color: fillColor,
            x: e.clientX,
            y: e.clientY,
          })
        } else {
          setTooltip(null)
        }
      }
    }
  }, [countries, passports])

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

  const passportMap = new Map<string, { rank: number; score: number; name: string }>()
  for (const p of passports) {
    passportMap.set(p.code, { rank: p.rank, score: p.score, name: p.name })
  }

  const maxScore = passports.length > 0 ? passports[0].score : 1

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden"
      style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
      onPointerLeave={() => { setTooltip(null); setDragging(false); activePointers.current.clear() }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={(e) => { activePointers.current.delete(e.pointerId); if (activePointers.current.size === 0) setDragging(false) }}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155 }}
        width={1000}
        height={500}
        className="w-full h-full"
        style={{ backgroundColor: "transparent" }}
      >
        <g transform={`translate(${500 + pan.x * zoom}, ${280 + pan.y * zoom}) scale(${zoom}) translate(-500, -250)`}>
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const geoId = String(geo.id ?? "")
              const iso3 = NUMERIC_TO_ISO3[geoId] || ""
              const data = passportMap.get(iso3)
              const fillColor = data ? scoreToColor(data.score, maxScore) : "#e5e5e5"
              const geoName = (geo.properties as Record<string, string>)?.name || ""

              return (
                <Geography
                  key={geoId || geoName}
                  geography={geo}
                  data-iso3={iso3}
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
                  onPointerEnter={(evt) => {
                    if (evt.pointerType !== "mouse") return
                    const name = countries[iso3]?.name || data?.name || geoName || "Unknown"
                    setTooltip({
                      name,
                      rank: data?.rank || 0,
                      score: data?.score || 0,
                      color: fillColor,
                      x: evt.clientX,
                      y: evt.clientY,
                    })
                  }}
                  onPointerLeave={(evt) => { if (evt.pointerType === "mouse") setTooltip(null) }}
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
              <span className="text-sm font-semibold text-neutral-900">
                {tooltip.name}
              </span>
            </div>
            {tooltip.rank > 0 ? (
              <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-600">
                <span>Rank <strong>#{tooltip.rank}</strong></span>
                <span>Score: <strong>{tooltip.score}</strong></span>
              </div>
            ) : (
              <div className="mt-0.5 text-xs text-neutral-500">No data</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
    </div>
  )
})

export { RankingMapInner as RankingMap }
