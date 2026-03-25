const SAMPLE_FRACTIONS = [0.5, 0.35, 0.65, 0.2, 0.8, 0.08, 0.92]
export const TOUCH_TAP_TOLERANCE = 12

const TAP_SAMPLE_OFFSETS = [
  { dx: 0, dy: 0 },
  { dx: -4, dy: 0 },
  { dx: 4, dy: 0 },
  { dx: 0, dy: -4 },
  { dx: 0, dy: 4 },
  { dx: -4, dy: -4 },
  { dx: 4, dy: -4 },
  { dx: -4, dy: 4 },
  { dx: 4, dy: 4 },
  { dx: -8, dy: 0 },
  { dx: 8, dy: 0 },
  { dx: 0, dy: -8 },
  { dx: 0, dy: 8 },
  { dx: -8, dy: -4 },
  { dx: 8, dy: -4 },
  { dx: -8, dy: 4 },
  { dx: 8, dy: 4 },
  { dx: -4, dy: -8 },
  { dx: 4, dy: -8 },
  { dx: -4, dy: 8 },
  { dx: 4, dy: 8 },
  { dx: -12, dy: 0 },
  { dx: 12, dy: 0 },
  { dx: 0, dy: -12 },
  { dx: 0, dy: 12 },
]

const SAMPLE_POINTS = SAMPLE_FRACTIONS.flatMap((yFraction) =>
  SAMPLE_FRACTIONS
    .map((xFraction) => ({
      xFraction,
      yFraction,
      distanceFromCenter:
        Math.abs(xFraction - 0.5) + Math.abs(yFraction - 0.5),
    }))
    .sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
)

export interface CountryAnchorPoint {
  clientX: number
  clientY: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getIso3AtPoint(clientX: number, clientY: number): string | null {
  return (
    document
      .elementFromPoint(clientX, clientY)
      ?.closest("[data-iso3]")
      ?.getAttribute("data-iso3") || null
  )
}

export function findCountryNearTapPoint(
  clientX: number,
  clientY: number,
  radius = TOUCH_TAP_TOLERANCE
): string | null {
  for (const offset of TAP_SAMPLE_OFFSETS) {
    if (Math.hypot(offset.dx, offset.dy) > radius) {
      continue
    }

    const iso3 = getIso3AtPoint(clientX + offset.dx, clientY + offset.dy)
    if (iso3) {
      return iso3
    }
  }

  return null
}

export function findVisibleCountryAnchor(
  container: HTMLElement,
  iso3: string
): CountryAnchorPoint | null {
  const countryPath = container.querySelector<SVGElement>(
    `[data-iso3="${iso3}"]`
  )

  if (!countryPath) {
    return null
  }

  const containerRect = container.getBoundingClientRect()
  const countryRect = countryPath.getBoundingClientRect()

  const left = Math.max(containerRect.left, countryRect.left)
  const right = Math.min(containerRect.right, countryRect.right)
  const top = Math.max(containerRect.top, countryRect.top)
  const bottom = Math.min(containerRect.bottom, countryRect.bottom)

  if (right <= left || bottom <= top) {
    return null
  }

  const width = right - left
  const height = bottom - top
  const insetX = Math.min(1, width / 4)
  const insetY = Math.min(1, height / 4)
  const minX = left + insetX
  const maxX = right - insetX
  const minY = top + insetY
  const maxY = bottom - insetY

  for (const point of SAMPLE_POINTS) {
    const clientX =
      minX === maxX
        ? minX
        : clamp(left + width * point.xFraction, minX, maxX)
    const clientY =
      minY === maxY
        ? minY
        : clamp(top + height * point.yFraction, minY, maxY)

    const hitElement = document.elementFromPoint(clientX, clientY)
    const hitIso3 = hitElement?.closest("[data-iso3]")?.getAttribute("data-iso3")

    if (hitIso3 === iso3) {
      return { clientX, clientY }
    }
  }

  return null
}
