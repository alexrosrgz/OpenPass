import {
  getAllCountries,
  getAllPassports,
  getPassportSummary,
  getPassportRequirements,
  getCountry,
} from "@/lib/data"
import type { Country } from "@/lib/types"
import { PassportExplorer } from "@/components/PassportExplorer"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ passport?: string }>
}) {
  const { passport } = await searchParams
  const countries = getAllCountries()
  const topPassports = getAllPassports().slice(0, 10)

  const code = passport?.toUpperCase()
  let passportData = null

  if (code) {
    const summary = getPassportSummary(code)
    const country = getCountry(code)
    if (summary && country) {
      const requirements = getPassportRequirements(code)
      const countriesMap: Record<string, Country> = {}
      for (const c of countries) {
        countriesMap[c.iso3] = c
      }
      passportData = { summary, country, requirements, countriesMap }
    }
  }

  return (
    <PassportExplorer
      countries={countries}
      topPassports={topPassports}
      passportData={passportData}
    />
  )
}
