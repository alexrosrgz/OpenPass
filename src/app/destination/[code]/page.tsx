import { notFound } from "next/navigation"
import {
  getDestinationRequirements,
  getCountry,
  getAllCountries,
  getAllPassports,
} from "@/lib/data"
import type { Country, RequirementType } from "@/lib/types"
import { REQUIREMENT_CONFIG, REQUIREMENT_ORDER } from "@/lib/constants"
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
}) {
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
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const upperCode = code.toUpperCase()
  const country = getCountry(upperCode)
  if (!country) notFound()

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
      <div className="mx-auto max-w-7xl px-6">
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
