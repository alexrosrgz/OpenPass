"use client"

import { motion } from "framer-motion"
import type { Country, RequirementType } from "@/lib/types"
import { REQUIREMENT_CONFIG, REQUIREMENT_ORDER } from "@/lib/constants"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CountryFlag } from "./CountryFlag"
import Link from "next/link"

interface DestinationClientProps {
  grouped: Record<RequirementType, { passport: string; days?: number }[]>
  countriesMap: Record<string, Country>
}

export function DestinationClient({
  grouped,
  countriesMap,
}: DestinationClientProps) {
  const defaultTab =
    REQUIREMENT_ORDER.find((t) => grouped[t].length > 0) || "visa-free"

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
        {REQUIREMENT_ORDER.map((type) => {
          const count = grouped[type].length
          if (count === 0) return null
          const config = REQUIREMENT_CONFIG[type]
          return (
            <TabsTrigger
              key={type}
              value={type}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-600 transition-all data-[state=active]:border-neutral-300 data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
            >
              {config.label}
              <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs data-[state=active]:bg-white/20">
                {count}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {REQUIREMENT_ORDER.map((type) => {
        const entries = grouped[type]
        if (entries.length === 0) return null

        return (
          <TabsContent key={type} value={type}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {entries
                .sort((a, b) => {
                  const nameA = countriesMap[a.passport]?.name || a.passport
                  const nameB = countriesMap[b.passport]?.name || b.passport
                  return nameA.localeCompare(nameB)
                })
                .map((entry, i) => {
                  const country = countriesMap[entry.passport]
                  return (
                    <motion.div
                      key={entry.passport}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(i * 0.02, 0.5),
                      }}
                    >
                      <Link
                        href={`/?passport=${entry.passport}`}
                        className="group flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
                      >
                        {country && (
                          <CountryFlag
                            iso2={country.iso2}
                            name={country.name}
                            size={32}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-neutral-900">
                            {country?.name || entry.passport}
                          </div>
                          {entry.days && (
                            <div className="text-xs font-medium text-neutral-700">
                              {entry.days} days
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
