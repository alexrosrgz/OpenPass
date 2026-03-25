"use client"

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  memo,
} from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
} from "@vnedyalk0v/react19-simple-maps"
import { motion, AnimatePresence } from "framer-motion"
import { NUMERIC_TO_ISO3 } from "@/lib/geo"
import {
  findCountryNearTapPoint,
  findVisibleCountryAnchor,
  getIso3AtPoint,
  TOUCH_TAP_TOLERANCE,
} from "@/lib/mapTooltipAnchor"
import type { Topology } from "topojson-specification"
import { MapControls } from "./MapControls"
import geoDataJson from "world-atlas/countries-110m.json"

const MIN_ZOOM = 1
const MAX_ZOOM = 8
const HOVER_OUTLINE_COLOR = "#000000"
const HOVER_OUTLINE_OPACITY = 1
const HOVER_OUTLINE_WIDTH = 1
const geoData = geoDataJson as unknown as Topology

interface TooltipState {
  iso3: string
  name: string
  rank: number
  score: number
  color: string
  anchor:
    | { type: "pointer"; clientX: number; clientY: number }
    | { type: "country"; iso3: string }
}

interface TouchGestureState {
  startX: number
  startY: number
  startIso3: string | null
  tapEligible: boolean
  multiTouch: boolean
}

function getIso3FromEventTarget(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest("[data-iso3]")?.getAttribute("data-iso3") ?? null
    : null
}

interface RankingMapProps {
  passports: { code: string; name: string; score: number; rank: number }[]
  countries: Record<string, { name: string; iso3: string }>
  externallyHoveredIso3?: string | null
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
  externallyHoveredIso3 = null,
}: RankingMapProps) {
  const [nativeTooltip, setNativeTooltip] = useState<TooltipState | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [containerVersion, setContainerVersion] = useState(0)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const wasDrag = useRef(false)
  const activePointers = useRef(new Set<number>())
  const touchGesture = useRef<TouchGestureState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const tooltipRef = useRef<HTMLDivElement>(null)

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left + 12, y: clientY - rect.top - 12 }
  }, [])

  const passportMap = useMemo(() => {
    const nextPassports = new Map<
      string,
      { rank: number; score: number; name: string }
    >()
    for (const passport of passports) {
      nextPassports.set(passport.code, {
        rank: passport.rank,
        score: passport.score,
        name: passport.name,
      })
    }
    return nextPassports
  }, [passports])

  const maxScore = passports.length > 0 ? passports[0].score : 1

  const createTooltipContent = useCallback(
    (iso3: string): Omit<TooltipState, "anchor"> => {
      const passport = passportMap.get(iso3)

      return {
        iso3,
        name: countries[iso3]?.name || passport?.name || iso3,
        rank: passport?.rank || 0,
        score: passport?.score || 0,
        color: passport ? scoreToColor(passport.score, maxScore) : "#e5e5e5",
      }
    },
    [countries, maxScore, passportMap]
  )

  const showNativeTooltip = useCallback(
    (iso3: string, clientX: number, clientY: number) => {
      setNativeTooltip({
        ...createTooltipContent(iso3),
        anchor: {
          type: "pointer",
          clientX,
          clientY,
        },
      })
    },
    [createTooltipContent]
  )

  const tooltip = useMemo(
    () =>
      externallyHoveredIso3 !== null
        ? {
            ...createTooltipContent(externallyHoveredIso3),
            anchor: {
              type: "country" as const,
              iso3: externallyHoveredIso3,
            },
          }
        : nativeTooltip,
    [createTooltipContent, externallyHoveredIso3, nativeTooltip]
  )

  const outlinedIso3 = externallyHoveredIso3 ?? nativeTooltip?.iso3 ?? null

  useLayoutEffect(() => {
    const tip = tooltipRef.current
    const box = containerRef.current
    if (!tip || !box || !tooltip) return

    const anchor =
      tooltip.anchor.type === "country"
        ? findVisibleCountryAnchor(box, tooltip.anchor.iso3)
        : {
            clientX: tooltip.anchor.clientX,
            clientY: tooltip.anchor.clientY,
          }

    if (!anchor) {
      tip.style.visibility = "hidden"
      return
    }

    const tRect = tip.getBoundingClientRect()
    const bRect = box.getBoundingClientRect()
    const pad = 8
    let { x, y } = toLocal(anchor.clientX, anchor.clientY)
    if (x + tRect.width > bRect.width - pad) x = bRect.width - tRect.width - pad
    if (y + tRect.height > bRect.height - pad) y = bRect.height - tRect.height - pad
    if (x < pad) x = pad
    if (y < pad) y = pad
    tip.style.left = `${x}px`
    tip.style.top = `${y}px`
    tip.style.visibility = "visible"
  }, [containerVersion, pan, toLocal, tooltip, zoom])

  const clampPan = useCallback((x: number, y: number, z: number) => {
    const basePanX = 250
    const maxPanX = basePanX + (500 * (z - 1)) / z
    const maxPanY = (250 * (z - 1)) / z
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    }
  }, [])

  const resetTouchGesture = useCallback(() => {
    touchGesture.current = null
  }, [])

  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg")
    if (svg) svg.setAttribute("preserveAspectRatio", "xMidYMid slice")
  }, [])

  useEffect(() => {
    const dismiss = () => setNativeTooltip(null)
    window.addEventListener("scroll", dismiss, { passive: true })
    document.addEventListener("touchstart", dismiss, { passive: true })
    return () => {
      window.removeEventListener("scroll", dismiss)
      document.removeEventListener("touchstart", dismiss)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      setContainerVersion((version) => version + 1)
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!externallyHoveredIso3) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setNativeTooltip(null)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [externallyHoveredIso3])

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
        setNativeTooltip(null)
        if (touchGesture.current) {
          touchGesture.current.tapEligible = false
          touchGesture.current.multiTouch = true
        }
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist = Math.hypot(dx, dy)
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        setNativeTooltip(null)
        if (touchGesture.current) {
          touchGesture.current.tapEligible = false
          touchGesture.current.multiTouch = true
        }
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

    if (e.pointerType === "touch") {
      setNativeTooltip(null)
    }

    if (activePointers.current.size === 1) {
      setDragging(true)
      wasDrag.current = false
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }

      if (e.pointerType === "touch") {
        touchGesture.current = {
          startX: e.clientX,
          startY: e.clientY,
          startIso3: getIso3FromEventTarget(e.target),
          tapEligible: true,
          multiTouch: false,
        }
      }

      return
    }

    setDragging(false)
    wasDrag.current = true
    setNativeTooltip(null)

    if (e.pointerType === "touch" && touchGesture.current) {
      touchGesture.current.tapEligible = false
      touchGesture.current.multiTouch = true
    }
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || activePointers.current.size !== 1) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const exceededDragThreshold =
      e.pointerType === "touch"
        ? Math.hypot(dx, dy) > TOUCH_TAP_TOLERANCE
        : Math.abs(dx) > 5 || Math.abs(dy) > 5

    if (!wasDrag.current && exceededDragThreshold) {
      wasDrag.current = true
      if (e.pointerType === "touch" && touchGesture.current) {
        touchGesture.current.tapEligible = false
      }
      setNativeTooltip(null)
    }

    if (e.pointerType === "touch" && !wasDrag.current) {
      return
    }

    const rawX = dragStart.current.panX + dx / zoom
    const rawY = dragStart.current.panY + dy / zoom
    setPan(clampPan(rawX, rawY, zoom))
  }, [dragging, zoom, clampPan])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size !== 0) {
      return
    }

    setDragging(false)

    if (e.pointerType === "touch") {
      const gesture = touchGesture.current
      resetTouchGesture()

      if (externallyHoveredIso3 || !gesture || !gesture.tapEligible || gesture.multiTouch) {
        return
      }

      const iso3 =
        gesture.startIso3 ??
        getIso3AtPoint(e.clientX, e.clientY) ??
        findCountryNearTapPoint(e.clientX, e.clientY, TOUCH_TAP_TOLERANCE)

      if (iso3) {
        showNativeTooltip(iso3, e.clientX, e.clientY)
      } else {
        setNativeTooltip(null)
      }

      return
    }

    if (!wasDrag.current && !externallyHoveredIso3) {
      const iso3 = getIso3AtPoint(e.clientX, e.clientY)
      if (iso3) {
        showNativeTooltip(iso3, e.clientX, e.clientY)
      } else {
        setNativeTooltip(null)
      }
    }
  }, [externallyHoveredIso3, resetTouchGesture, showNativeTooltip])

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    setNativeTooltip(null)

    if (e.pointerType === "touch" && touchGesture.current) {
      touchGesture.current.tapEligible = false
    }

    if (activePointers.current.size === 0) {
      setDragging(false)
      resetTouchGesture()
    }
  }, [resetTouchGesture])

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") {
      setNativeTooltip(null)
    }
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

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden"
      style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
          {({ geographies }) => {
            const hoveredGeography =
              outlinedIso3 === null
                ? null
                : geographies.find((geo) => {
                    const geoId = String(geo.id ?? "")
                    return NUMERIC_TO_ISO3[geoId] === outlinedIso3
                  })

            return (
              <>
            {geographies.map((geo) => {
              const geoId = String(geo.id ?? "")
              const iso3 = NUMERIC_TO_ISO3[geoId] || ""
              const passport = passportMap.get(iso3)
              const fillColor = passport
                ? scoreToColor(passport.score, maxScore)
                : "#e5e5e5"
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
                    if (evt.pointerType !== "mouse" || externallyHoveredIso3) return
                    showNativeTooltip(iso3, evt.clientX, evt.clientY)
                  }}
                  onPointerLeave={(evt) => {
                    if (evt.pointerType === "mouse") setNativeTooltip(null)
                  }}
                />
              )
            })}
            {hoveredGeography && (
              <Geography
                key={`hover-outline-${outlinedIso3}`}
                geography={hoveredGeography}
                fill="none"
                pointerEvents="none"
                stroke={HOVER_OUTLINE_COLOR}
                strokeOpacity={HOVER_OUTLINE_OPACITY}
                strokeWidth={HOVER_OUTLINE_WIDTH}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            )}
              </>
            )
          }}
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
            ref={tooltipRef}
            className="pointer-events-none absolute z-50 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            style={{ visibility: "hidden" }}
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
