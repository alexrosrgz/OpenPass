"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ScoreTooltip } from "./ScoreTooltip"
import type { Country, PassportSummary, VisaRequirement } from "@/lib/types"
import { REQUIREMENT_CONFIG } from "@/lib/constants"
import { CountrySearch } from "./CountrySearch"
import { CountryFlag } from "./CountryFlag"
import { WorldMap } from "./WorldMap"

interface CompareClientProps {
  countries: Country[]
}

interface CompareData {
  summaryA: PassportSummary
  summaryB: PassportSummary
  comparison: {
    destination: string
    requirementA: VisaRequirement | null
    requirementB: VisaRequirement | null
  }[]
  countriesMap: Record<string, Country>
}

export function CompareClient({ countries }: CompareClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const codeA = searchParams.get("a")?.toUpperCase() || ""
  const codeB = searchParams.get("b")?.toUpperCase() || ""

  const [data, setData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!codeA || !codeB) {
      setData(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    fetch(`/api/compare?a=${codeA}&b=${codeB}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false)
      })

    return () => controller.abort()
  }, [codeA, codeB])

  const countryA = countries.find((c) => c.iso3 === codeA)
  const countryB = countries.find((c) => c.iso3 === codeB)

  const setPassport = (which: "a" | "b", code: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(which, code)
    router.push(`/compare?${params.toString()}`)
  }

  // Score comparison helpers
  const getReqColor = (req: VisaRequirement | null) => {
    if (!req) return "bg-neutral-200"
    return REQUIREMENT_CONFIG[req.requirement].bgColor
  }

  const getReqLabel = (req: VisaRequirement | null) => {
    if (!req) return "—"
    const config = REQUIREMENT_CONFIG[req.requirement]
    return req.days ? `${config.label} (${req.days}d)` : config.label
  }

  return (
    <div>
      {/* Selectors */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {countryA ? (
            <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 md:px-6 md:py-5">
              <CountryFlag iso2={countryA.iso2} name={countryA.name} size={72} />
              <span className="flex-1 font-medium">{countryA.name}</span>
              {data && (
                <div className="flex flex-wrap items-center gap-2 text-sm md:gap-3">
                  <ScoreTooltip><span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Score</span></ScoreTooltip>
                  <span className="text-lg font-bold text-emerald-600">{data.summaryA.score}</span>
                  <span className="text-neutral-400">Rank #{data.summaryA.rank}</span>
                </div>
              )}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete("a")
                  router.push(`/compare?${params.toString()}`)
                }}
                className="ml-2 text-neutral-400 hover:text-neutral-900"
              >
                ×
              </button>
            </div>
          ) : (
            <CountrySearch
              countries={countries}
              placeholder="Select first passport..."
              navigateTo={(code) => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("a", code)
                return `/compare?${params.toString()}`
              }}
            />
          )}
        </div>

        <div>
          {countryB ? (
            <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 md:px-6 md:py-5">
              <CountryFlag iso2={countryB.iso2} name={countryB.name} size={72} />
              <span className="flex-1 font-medium">{countryB.name}</span>
              {data && (
                <div className="flex flex-wrap items-center gap-2 text-sm md:gap-3">
                  <ScoreTooltip><span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Score</span></ScoreTooltip>
                  <span className="text-lg font-bold text-emerald-600">{data.summaryB.score}</span>
                  <span className="text-neutral-400">Rank #{data.summaryB.rank}</span>
                </div>
              )}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete("b")
                  router.push(`/compare?${params.toString()}`)
                }}
                className="ml-2 text-neutral-400 hover:text-neutral-900"
              >
                ×
              </button>
            </div>
          ) : (
            <CountrySearch
              countries={countries}
              placeholder="Select second passport..."
              navigateTo={(code) => {
                const params = new URLSearchParams(searchParams.toString())
                params.set("b", code)
                return `/compare?${params.toString()}`
              }}
            />
          )}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="mt-12 text-center text-neutral-700">Loading...</div>
      )}

      {data && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6"
        >
          {data.summaryA.score !== data.summaryB.score && (
            <p className="mb-6 text-center text-neutral-600">
              <span className="font-semibold">
                {data.summaryA.score > data.summaryB.score
                  ? data.summaryA.name
                  : data.summaryB.name}
              </span>{" "}
              can visit{" "}
              <span className="font-semibold text-emerald-600">
                {Math.abs(data.summaryA.score - data.summaryB.score)}
              </span>{" "}
              more countries without a visa
            </p>
          )}

          {/* Maps */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <div>
              <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                <WorldMap
                  requirements={data.comparison
                    .filter((r) => r.requirementA)
                    .map((r) => r.requirementA!)}
                  passportCode={codeA}
                  countries={data.countriesMap}
                  showHint={false}
                />
              </div>
            </div>
            <div>
              <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                <WorldMap
                  requirements={data.comparison
                    .filter((r) => r.requirementB)
                    .map((r) => r.requirementB!)}
                  passportCode={codeB}
                  countries={data.countriesMap}
                  showHint={false}
                />
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="overflow-auto rounded-xl border border-neutral-200 max-h-[600px]">
            <div className="sticky top-0 z-10 grid min-w-fit grid-cols-[150px_100px_100px] md:grid-cols-[1fr_140px_140px] items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-700">
              <div>Destination</div>
              <div className="text-center">{countryA?.name || codeA}</div>
              <div className="text-center">{countryB?.name || codeB}</div>
            </div>

            <div>
              {data.comparison.map((row) => {
                const dest = data.countriesMap[row.destination]
                return (
                  <div
                    key={row.destination}
                    className="grid grid-cols-[150px_100px_100px] md:grid-cols-[1fr_140px_140px] items-center gap-2 border-b border-neutral-100 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {dest && (
                        <CountryFlag
                          iso2={dest.iso2}
                          name={dest.name}
                          size={24}
                        />
                      )}
                      <span>
                        {dest?.name || row.destination}
                      </span>
                    </div>
                    <div
                      className={`rounded-md px-2 py-1 text-center text-xs ${getReqColor(row.requirementA)}`}
                    >
                      {getReqLabel(row.requirementA)}
                    </div>
                    <div
                      className={`rounded-md px-2 py-1 text-center text-xs ${getReqColor(row.requirementB)}`}
                    >
                      {getReqLabel(row.requirementB)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
