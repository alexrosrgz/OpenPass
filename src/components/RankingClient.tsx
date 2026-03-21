"use client"

import { useState } from "react"
import Link from "next/link"
import type { PassportSummary, Country } from "@/lib/types"
import { CountryFlag } from "./CountryFlag"
import { RankingMap, scoreToColor } from "./RankingMap"
import { ScoreTooltip } from "./ScoreTooltip"

interface RankingPassport extends PassportSummary {
  iso2: string
}

interface RankingClientProps {
  passports: RankingPassport[]
  countriesMap: Record<string, Country>
}

export function RankingClient({ passports, countriesMap }: RankingClientProps) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? passports.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : passports

  const maxScore = passports.length > 0 ? passports[0].score : 1

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-4 py-4" style={{ paddingLeft: "max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))", paddingRight: "max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))" }}>
      {/* Left: list */}
      <div className="flex w-full flex-col md:w-[460px] md:min-w-[460px]">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs text-neutral-600">
              {passports.length} passports ranked by mobility score
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by country..."
              className="mt-3 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all focus:border-neutral-300 focus:bg-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 grid grid-cols-[44px_1fr_56px_72px] items-center gap-2 border-b border-neutral-200 bg-neutral-50/90 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 backdrop-blur-sm">
              <div>Rank</div>
              <div>Country</div>
              <div className="text-right"><ScoreTooltip>Score</ScoreTooltip></div>
              <div className="text-right">Visa-Free</div>
            </div>

            {filtered.map((passport) => (
              <Link
                key={passport.code}
                href={`/?passport=${passport.code}`}
                className="grid grid-cols-[44px_1fr_56px_72px] items-center gap-2 border-b border-neutral-100 px-5 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <div className="text-xs font-medium text-neutral-500">
                  #{passport.rank}
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  {passport.iso2 && (
                    <CountryFlag
                      iso2={passport.iso2}
                      name={passport.name}
                      size={28}
                    />
                  )}
                  <span className="truncate text-sm font-medium">{passport.name}</span>
                </div>
                <div
                  className="text-right font-mono text-xs font-bold"
                  style={{ color: scoreToColor(passport.score, maxScore) }}
                >
                  {passport.score}
                </div>
                <div className="text-right text-xs text-neutral-600">
                  {passport.breakdown["visa-free"]}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Right: map */}
      <div className="relative hidden flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 md:block">
        <RankingMap passports={passports} countries={countriesMap} />
        <div className="absolute bottom-[1rem] left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 text-[10px] font-medium text-neutral-600 backdrop-blur-sm">
          <span>Low</span>
          {["#ef4444", "#f97316", "#fbbf24", "#34d399", "#059669"].map((c) => (
            <div
              key={c}
              className="h-2.5 w-5 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
