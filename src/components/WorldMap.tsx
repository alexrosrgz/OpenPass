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
import type { VisaRequirement } from "@/lib/types"
import { REQUIREMENT_CONFIG } from "@/lib/constants"
import { NUMERIC_TO_ISO3 } from "@/lib/geo"
import {
  getSvgViewportPoint,
  getPinchZoomFactor,
  getWheelZoomFactor,
  zoomViewportAroundPoint,
} from "@/lib/mapViewport"
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
const WHEEL_GESTURE_IDLE_MS = 160
const geoData = geoDataJson as unknown as Topology
const MAP_TRANSFORM_ORIGIN = {
  translateX: 500,
  translateY: 258,
  contentX: 500,
  contentY: 250,
} as const

interface TooltipState {
  iso3: string
  name: string
  requirement: string
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

function getRequirementLabel(
  requirement: VisaRequirement | undefined,
  iso3: string,
  passportCode: string
) {
  if (requirement) {
    return (
      REQUIREMENT_CONFIG[requirement.requirement].label +
      (requirement.days ? ` (${requirement.days} days)` : "")
    )
  }

  return iso3 === passportCode ? "Your passport" : "No data"
}

interface WorldMapProps {
  requirements: VisaRequirement[]
  passportCode: string
  countries: Record<string, { name: string; iso3: string }>
  showHint?: boolean
  showControls?: boolean
  externallyHoveredIso3?: string | null
}

const WorldMapInner = memo(function WorldMapInner({
  requirements,
  passportCode,
  countries,
  showHint = true,
  showControls = true,
  externallyHoveredIso3 = null,
}: WorldMapProps) {
  const [nativeTooltip, setNativeTooltip] = useState<TooltipState | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [containerVersion, setContainerVersion] = useState(0)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const wasDrag = useRef(false)
  const activePointers = useRef(new Set<number>())
  const touchGesture = useRef<TouchGestureState | null>(null)
  const wheelZoomGesture = useRef<{
    viewportX: number
    viewportY: number
    timeoutId: number | null
  } | null>(null)
  const viewportRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } })

  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left + 12, y: clientY - rect.top - 12 }
  }, [])

  const requirementByDestination = useMemo(() => {
    const nextRequirements = new Map<string, VisaRequirement>()
    for (const requirement of requirements) {
      nextRequirements.set(requirement.destination, requirement)
    }
    return nextRequirements
  }, [requirements])

  const getColor = useCallback(
    (iso3: string): string => {
      if (iso3 === passportCode) return "#3b82f6"

      const requirement = requirementByDestination.get(iso3)
      if (!requirement) return "#e5e5e5"

      return REQUIREMENT_CONFIG[requirement.requirement].mapColor
    },
    [passportCode, requirementByDestination]
  )

  const createTooltipContent = useCallback(
    (iso3: string): Omit<TooltipState, "anchor"> => {
      const requirement = requirementByDestination.get(iso3)

      return {
        iso3,
        name: countries[iso3]?.name || iso3,
        requirement: getRequirementLabel(requirement, iso3, passportCode),
        color: getColor(iso3),
      }
    },
    [countries, getColor, passportCode, requirementByDestination]
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
    viewportRef.current = { zoom, pan }
  }, [pan, zoom])

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
    const basePanX = 120
    const maxPanX = basePanX + (500 * (z - 1)) / z
    const maxPanY = (250 * (z - 1)) / z
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    }
  }, [])

  const setViewport = useCallback((nextZoom: number, nextPan: { x: number; y: number }) => {
    viewportRef.current = { zoom: nextZoom, pan: nextPan }
    setZoom(nextZoom)
    setPan(nextPan)
  }, [])

  const getViewportPoint = useCallback((clientX: number, clientY: number) => {
    const svg = containerRef.current?.querySelector("svg") as SVGSVGElement | null
    return getSvgViewportPoint(svg, clientX, clientY)
  }, [])

  const zoomAroundClientPoint = useCallback((
    viewportX: number | null,
    viewportY: number | null,
    factor: number
  ) => {
    const nextViewport = zoomViewportAroundPoint({
      viewportX,
      viewportY,
      factor,
      viewport: viewportRef.current,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      transformOrigin: MAP_TRANSFORM_ORIGIN,
      clampPan,
    })

    if (
      nextViewport.zoom === viewportRef.current.zoom &&
      nextViewport.pan.x === viewportRef.current.pan.x &&
      nextViewport.pan.y === viewportRef.current.pan.y
    ) {
      return
    }

    setViewport(nextViewport.zoom, nextViewport.pan)
  }, [clampPan, setViewport])

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

      const currentGesture = wheelZoomGesture.current
      if (currentGesture?.timeoutId != null) {
        window.clearTimeout(currentGesture.timeoutId)
      }

      if (!currentGesture) {
        const viewportPoint = getViewportPoint(e.clientX, e.clientY)
        if (!viewportPoint) {
          return
        }

        wheelZoomGesture.current = {
          viewportX: viewportPoint.x,
          viewportY: viewportPoint.y,
          timeoutId: null,
        }
      }

      const factor = getWheelZoomFactor(e.deltaY, e.deltaMode)
      const anchor = wheelZoomGesture.current
      if (anchor) {
        zoomAroundClientPoint(anchor.viewportX, anchor.viewportY, factor)
        anchor.timeoutId = window.setTimeout(() => {
          wheelZoomGesture.current = null
        }, WHEEL_GESTURE_IDLE_MS)
      }
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
          const factor = getPinchZoomFactor(raw)
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
          const viewportPoint = getViewportPoint(centerX, centerY)
          zoomAroundClientPoint(viewportPoint?.x ?? null, viewportPoint?.y ?? null, factor)
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
      const gesture = wheelZoomGesture.current
      if (gesture?.timeoutId != null) {
        window.clearTimeout(gesture.timeoutId)
      }
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [getViewportPoint, zoomAroundClientPoint])

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
    const nextPan = clampPan(rawX, rawY, zoom)
    viewportRef.current = { zoom, pan: nextPan }
    setPan(nextPan)
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
    const nextZoom = Math.min(MAX_ZOOM, viewportRef.current.zoom * 1.3)
    const nextPan = clampPan(
      viewportRef.current.pan.x,
      viewportRef.current.pan.y,
      nextZoom
    )
    setViewport(nextZoom, nextPan)
  }, [clampPan, setViewport])

  const handleZoomOut = useCallback(() => {
    const nextZoom = Math.max(MIN_ZOOM, viewportRef.current.zoom / 1.3)
    const nextPan = clampPan(
      viewportRef.current.pan.x,
      viewportRef.current.pan.y,
      nextZoom
    )
    setViewport(nextZoom, nextPan)
  }, [clampPan, setViewport])

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden"
      style={{ cursor: dragging ? "grabbing" : "grab", height: "100%", touchAction: "none" }}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
              const fillColor = getColor(iso3)
              const geoName =
                (geo.properties as Record<string, string>)?.name || ""

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
