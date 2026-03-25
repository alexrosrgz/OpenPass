export interface PanPosition {
  x: number
  y: number
}

export interface MapViewportState {
  zoom: number
  pan: PanPosition
}

interface TransformOrigin {
  translateX: number
  translateY: number
  contentX: number
  contentY: number
}

interface ZoomViewportAroundPointOptions {
  viewportX: number | null
  viewportY: number | null
  factor: number
  viewport: MapViewportState
  minZoom: number
  maxZoom: number
  transformOrigin: TransformOrigin
  clampPan: (x: number, y: number, z: number) => PanPosition
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeWheelDelta(deltaY: number, deltaMode: number) {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 160 : 1
  return clampNumber(deltaY * unit, -120, 120)
}

export function getWheelZoomFactor(deltaY: number, deltaMode: number) {
  return Math.exp(-normalizeWheelDelta(deltaY, deltaMode) * 0.0015)
}

export function getPinchZoomFactor(rawScale: number) {
  const dampedFactor = 1 + (rawScale - 1) * 0.35
  if (Math.abs(dampedFactor - 1) < 0.01) {
    return 1
  }

  return clampNumber(dampedFactor, 0.94, 1.06)
}

export function zoomViewportAroundPoint({
  viewportX,
  viewportY,
  factor,
  viewport,
  minZoom,
  maxZoom,
  transformOrigin,
  clampPan,
}: ZoomViewportAroundPointOptions): MapViewportState {
  const nextZoom = clampNumber(viewport.zoom * factor, minZoom, maxZoom)
  if (nextZoom === viewport.zoom) {
    return viewport
  }

  if (viewportX === null || viewportY === null) {
    return {
      zoom: nextZoom,
      pan: clampPan(viewport.pan.x, viewport.pan.y, nextZoom),
    }
  }

  const mapX = transformOrigin.translateX + viewport.pan.x * viewport.zoom
  const mapY = transformOrigin.translateY + viewport.pan.y * viewport.zoom
  const contentX =
    (viewportX - mapX) / viewport.zoom + transformOrigin.contentX
  const contentY =
    (viewportY - mapY) / viewport.zoom + transformOrigin.contentY
  const rawPanX =
    (viewportX -
      transformOrigin.translateX -
      nextZoom * (contentX - transformOrigin.contentX)) /
    nextZoom
  const rawPanY =
    (viewportY -
      transformOrigin.translateY -
      nextZoom * (contentY - transformOrigin.contentY)) /
    nextZoom

  return {
    zoom: nextZoom,
    pan: clampPan(rawPanX, rawPanY, nextZoom),
  }
}

export function getSvgViewportPoint(
  svg: SVGSVGElement | null,
  clientX: number,
  clientY: number
) {
  if (!svg) {
    return null
  }

  const screenMatrix = svg.getScreenCTM()
  if (!screenMatrix) {
    return null
  }

  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY

  const viewportPoint = point.matrixTransform(screenMatrix.inverse())

  return {
    x: viewportPoint.x,
    y: viewportPoint.y,
  }
}
