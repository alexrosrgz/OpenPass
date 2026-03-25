const SAMPLE_FRACTIONS = [0.5, 0.35, 0.65, 0.2, 0.8, 0.08, 0.92]

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
