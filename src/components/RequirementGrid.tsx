"use client"

import { motion } from "framer-motion"
import type { VisaRequirement, Country } from "@/lib/types"
import type { RequirementType } from "@/lib/types"
import { REQUIREMENT_CONFIG, REQUIREMENT_ORDER } from "@/lib/constants"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CountryFlag } from "./CountryFlag"

interface RequirementGridProps {
  requirements: VisaRequirement[]
  countries: Record<string, Country>
}

export function RequirementGrid({
  requirements,
  countries,
}: RequirementGridProps) {
  const grouped = new Map<RequirementType, VisaRequirement[]>()
  for (const type of REQUIREMENT_ORDER) {
    grouped.set(type, [])
  }
  for (const req of requirements) {
    const list = grouped.get(req.requirement)
    if (list) list.push(req)
  }

  // Find first non-empty tab
  const defaultTab =
    REQUIREMENT_ORDER.find((t) => (grouped.get(t)?.length || 0) > 0) ||
    "visa-free"

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
        {REQUIREMENT_ORDER.map((type) => {
          const count = grouped.get(type)?.length || 0
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
        const reqs = grouped.get(type) || []
        if (reqs.length === 0) return null

        return (
          <TabsContent key={type} value={type}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {reqs
                .sort((a, b) => {
                  const nameA = countries[a.destination]?.name || a.destination
                  const nameB = countries[b.destination]?.name || b.destination
                  return nameA.localeCompare(nameB)
                })
                .map((req, i) => {
                  const country = countries[req.destination]
                  return (
                    <motion.div
                      key={req.destination}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(i * 0.02, 0.5),
                      }}
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
                          {country?.name || req.destination}
                        </div>
                        {req.days && (
                          <div className="text-xs font-medium text-neutral-700">
                            {req.days} days
                          </div>
                        )}
                      </div>
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
