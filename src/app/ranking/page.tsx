import { getAllPassports, getCountry, getAllCountries } from "@/lib/data"
import { RankingClient } from "@/components/RankingClient"
import type { Country } from "@/lib/types"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Passport Ranking — OpenPass",
  description: "See how all 199 passports rank by visa-free travel access.",
}

export default function RankingPage() {
  const passports = getAllPassports()
  const allCountries = getAllCountries()

  const countriesMap: Record<string, Country> = {}
  for (const c of allCountries) {
    countriesMap[c.iso3] = c
  }

  const passportsWithIso2 = passports.map((p) => {
    const country = getCountry(p.code)
    return { ...p, iso2: country?.iso2 || "" }
  })

  return (
    <div className="pt-14">
      <RankingClient passports={passportsWithIso2} countriesMap={countriesMap} />
    </div>
  )
}
