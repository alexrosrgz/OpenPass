"use client"

import { motion } from "framer-motion"
import type { Country, VisaRequirement, PassportSummary } from "@/lib/types"
import { CountrySearch } from "./CountrySearch"
import { CountryFlag } from "./CountryFlag"
import { PassportDetailClient } from "./PassportDetailClient"
import Link from "next/link"

interface PassportExplorerProps {
  countries: Country[]
  topPassports: (PassportSummary & { iso2?: string })[]
  passportData: {
    summary: PassportSummary
    country: Country
    requirements: VisaRequirement[]
    countriesMap: Record<string, Country>
  } | null
}

export function PassportExplorer({
  countries,
  topPassports,
  passportData,
}: PassportExplorerProps) {
  const countriesMap: Record<string, Country> = {}
  for (const c of countries) {
    countriesMap[c.iso3] = c
  }

  return (
    <div className="min-h-screen pt-14">
      {passportData ? (
        /* ── Passport selected ── */
        <>
          {/* Compact header bar */}
          <div className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
              <CountryFlag
                iso2={passportData.country.iso2}
                name={passportData.country.name}
                size={48}
                className="rounded-md shadow"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                  {passportData.country.name}
                </h1>
              </div>

              {/* Inline search to switch passport */}
              <div className="hidden w-64 md:block">
                <CountrySearch
                  countries={countries}
                  placeholder="Switch passport..."
                  navigateTo={(code) => `/?passport=${code}`}
                  className=""
                  compact
                />
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Score
                  </div>
                  <div className="text-xl font-bold">{passportData.summary.score}</div>
                </div>
                <div className="h-8 w-px bg-neutral-200" />
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Rank
                  </div>
                  <div className="text-xl font-bold">#{passportData.summary.rank}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map + Grid */}
          <div className="mx-auto max-w-7xl px-6 pt-4 pb-16">
            <PassportDetailClient
              score={passportData.summary.score}
              requirements={passportData.requirements}
              passportCode={passportData.country.iso3}
              countriesMap={passportData.countriesMap}
            />
          </div>
        </>
      ) : (
        /* ── No passport selected — landing ── */
        <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl text-center"
          >
            <h1 className="mb-2 text-5xl font-bold tracking-tight md:text-6xl">
              OpenPass
            </h1>
            <p className="mb-10 text-lg text-neutral-600">
              Discover your passport power
            </p>

            <CountrySearch
              countries={countries}
              placeholder="Search your passport..."
              navigateTo={(code) => `/?passport=${code}`}
            />
          </motion.div>

          {/* Top passports quick picks */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-14 w-full max-w-2xl"
          >
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Top passports
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {topPassports.map((p) => {
                const country = countriesMap[p.code]
                if (!country) return null
                return (
                  <Link
                    key={p.code}
                    href={`/?passport=${p.code}`}
                    className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm"
                  >
                    <CountryFlag iso2={country.iso2} name={country.name} size={24} />
                    {country.name}
                    <span className="text-xs text-neutral-500">{p.score}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>

        </div>
      )}
    </div>
  )
}
