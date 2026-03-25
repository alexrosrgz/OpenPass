import { notFound } from "next/navigation"
import {
  getDestinationRequirements,
  getPassportRequirements,
  getCountry,
  getAllCountries,
  getAllPassports,
} from "@/lib/data"
import type { Country, RequirementType } from "@/lib/types"
import { REQUIREMENT_CONFIG } from "@/lib/constants"
import { CountryFlag } from "@/components/CountryFlag"
import { DestinationClient } from "@/components/DestinationClient"
import type { Metadata } from "next"

export function generateStaticParams() {
  return getAllPassports().map((p) => ({ code: p.code }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const country = getCountry(code.toUpperCase())
  return {
    title: country
      ? `Travel to ${country.name} — OpenPass`
      : "Destination — OpenPass",
  }
}

export default async function DestinationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ passport?: string }>
}) {
  const { code } = await params
  const { passport } = await searchParams
  const upperCode = code.toUpperCase()
  const country = getCountry(upperCode)
  if (!country) notFound()

  // Look up the user's specific visa requirement
  const passportCode = passport?.toUpperCase()
  const passportCountry = passportCode ? getCountry(passportCode) : null
  let userRequirement: { type: RequirementType; days?: number } | null = null
  if (passportCode) {
    const passportReqs = getPassportRequirements(passportCode)
    const req = passportReqs.find((r) => r.destination === upperCode)
    if (req) {
      userRequirement = { type: req.requirement, days: req.days }
    }
  }

  const requirements = getDestinationRequirements(upperCode)

  // Group by requirement type
  const grouped: Record<RequirementType, { passport: string; days?: number }[]> = {
    "visa-free": [],
    "visa-on-arrival": [],
    eta: [],
    "e-visa": [],
    "visa-required": [],
    "no-admission": [],
  }

  for (const req of requirements) {
    grouped[req.requirement].push({
      passport: req.passport,
      days: req.days,
    })
  }

  const visaFreeCount =
    grouped["visa-free"].length +
    grouped["visa-on-arrival"].length +
    grouped["eta"].length

  // Build countries lookup
  const allCountries = getAllCountries()
  const countriesMap: Record<string, Country> = {}
  for (const c of allCountries) {
    countriesMap[c.iso3] = c
  }

  return (
    <div className="min-h-screen pt-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Hero */}
        <div className="flex flex-col items-center gap-6 py-12 md:flex-row md:items-center md:gap-12">
          <CountryFlag
            iso2={country.iso2}
            name={country.name}
            size={96}
            className="rounded-lg shadow-2xl"
          />
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {country.name}
            </h1>
            <p className="mt-2 text-lg text-neutral-700">
              <span className="font-semibold text-emerald-600">
                {visaFreeCount}
              </span>{" "}
              passports can enter without a prior visa
            </p>
          </div>

          {userRequirement && passportCountry && (
            <div className="ml-0 flex items-center gap-4 rounded-2xl border px-4 py-3 md:ml-auto md:px-6 md:py-4" style={{ borderColor: REQUIREMENT_CONFIG[userRequirement.type].mapColor, backgroundColor: `${REQUIREMENT_CONFIG[userRequirement.type].mapColor}10` }}>
              <CountryFlag iso2={passportCountry.iso2} name={passportCountry.name} size={40} />
              <div>
                <div className="text-sm text-neutral-600">
                  With a <span className="font-semibold text-neutral-900">{passportCountry.name}</span> passport
                </div>
                <div className="text-xl font-bold" style={{ color: REQUIREMENT_CONFIG[userRequirement.type].mapColor }}>
                  {REQUIREMENT_CONFIG[userRequirement.type].label}
                  {userRequirement.days && <span className="ml-1 text-base font-medium text-neutral-600">· {userRequirement.days} days</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pb-16">
          <DestinationClient
            grouped={grouped}
            countriesMap={countriesMap}
            countries={allCountries}
          />
        </div>
      </div>
    </div>
  )
}
