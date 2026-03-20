import type {
  VisaRequirement,
  PassportSummary,
  Country,
  RequirementType,
} from "./types"
import { REQUIREMENT_ORDER } from "./constants"
import { readFileSync } from "fs"
import { join } from "path"

const dataDir = join(process.cwd(), "data")
const visaData = JSON.parse(
  readFileSync(join(dataDir, "visa-requirements.json"), "utf-8")
)
const countriesData = JSON.parse(
  readFileSync(join(dataDir, "countries.json"), "utf-8")
)

const visaRequirements = visaData as Record<string, VisaRequirement[]>
const countries = countriesData as Record<string, Country>

// Score-contributing requirement types
const SCORE_TYPES: Set<RequirementType> = new Set([
  "visa-free",
  "visa-on-arrival",
  "eta",
])

function computeBreakdown(
  reqs: VisaRequirement[]
): Record<RequirementType, number> {
  const breakdown = Object.fromEntries(
    REQUIREMENT_ORDER.map((t) => [t, 0])
  ) as Record<RequirementType, number>
  for (const r of reqs) {
    breakdown[r.requirement]++
  }
  return breakdown
}

let cachedSummaries: PassportSummary[] | null = null

export function getAllPassports(): PassportSummary[] {
  if (cachedSummaries) return cachedSummaries

  const summaries: PassportSummary[] = []

  for (const [code, reqs] of Object.entries(visaRequirements)) {
    const country = countries[code]
    if (!country) continue

    const breakdown = computeBreakdown(reqs)
    const score = REQUIREMENT_ORDER.filter((t) => SCORE_TYPES.has(t)).reduce(
      (sum, t) => sum + breakdown[t],
      0
    )

    summaries.push({
      code,
      name: country.name,
      score,
      rank: 0, // computed below
      breakdown,
    })
  }

  // Sort by score descending, then by name
  summaries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  // Assign ranks (same score = same rank)
  let currentRank = 1
  for (let i = 0; i < summaries.length; i++) {
    if (i > 0 && summaries[i].score < summaries[i - 1].score) {
      currentRank = i + 1
    }
    summaries[i].rank = currentRank
  }

  cachedSummaries = summaries
  return summaries
}

export function getPassportSummary(code: string): PassportSummary | null {
  const all = getAllPassports()
  return all.find((p) => p.code === code) || null
}

export function getPassportRequirements(code: string): VisaRequirement[] {
  return visaRequirements[code] || []
}

export function getDestinationRequirements(
  destCode: string
): { passport: string; requirement: RequirementType; days?: number }[] {
  const results: { passport: string; requirement: RequirementType; days?: number }[] = []

  for (const [passportCode, reqs] of Object.entries(visaRequirements)) {
    const req = reqs.find((r) => r.destination === destCode)
    if (req) {
      results.push({
        passport: passportCode,
        requirement: req.requirement,
        days: req.days,
      })
    }
  }

  return results
}

export function comparePassports(
  codeA: string,
  codeB: string
): {
  destination: string
  requirementA: VisaRequirement | null
  requirementB: VisaRequirement | null
}[] {
  const reqsA = getPassportRequirements(codeA)
  const reqsB = getPassportRequirements(codeB)

  const mapA = new Map(reqsA.map((r) => [r.destination, r]))
  const mapB = new Map(reqsB.map((r) => [r.destination, r]))

  const allDests = new Set([...mapA.keys(), ...mapB.keys()])
  const results: {
    destination: string
    requirementA: VisaRequirement | null
    requirementB: VisaRequirement | null
  }[] = []

  for (const dest of allDests) {
    results.push({
      destination: dest,
      requirementA: mapA.get(dest) || null,
      requirementB: mapB.get(dest) || null,
    })
  }

  return results.sort((a, b) => a.destination.localeCompare(b.destination))
}

export function getCountry(code: string): Country | null {
  return countries[code] || null
}

export function getAllCountries(): Country[] {
  return Object.values(countries).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

export function searchCountries(query: string): Country[] {
  const q = query.toLowerCase().trim()
  if (!q) return getAllCountries()

  return getAllCountries().filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.iso3.toLowerCase().includes(q) ||
      c.iso2.toLowerCase().includes(q)
  )
}
