"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { VisaRequirement, Country } from "@/lib/types"
import type { RequirementType } from "@/lib/types"
import { REQUIREMENT_CONFIG, REQUIREMENT_ORDER } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CountryFlag } from "./CountryFlag"
import { WorldMap } from "./WorldMap"

interface RequirementGridProps {
  requirements: VisaRequirement[]
  countries: Record<string, Country>
  passportCode: string
}

export function RequirementGrid({
  requirements,
  countries,
  passportCode,
}: RequirementGridProps) {
  const [hoveredIso3, setHoveredIso3] = useState<string | null>(null)

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
      {/* Tabs row */}
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="text-2xl font-bold">Destinations</h2>
        <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent p-0 !h-auto">
          {REQUIREMENT_ORDER.map((type) => {
            const count = grouped.get(type)?.length || 0
            if (count === 0) return null
            const config = REQUIREMENT_CONFIG[type]
            return (
              <TabsTrigger
                key={type}
                value={type}
                className="rounded-full border px-4 py-2 text-sm font-medium transition-all [&]:shadow-none [&]:bg-transparent [&[data-active]]:!bg-[var(--tab-color)] [&[data-active]]:!text-white [&[data-active]]:!border-[var(--tab-color)]"
                style={{
                  "--tab-color": config.mapColor,
                  borderColor: config.mapColor,
                  color: config.mapColor,
                } as React.CSSProperties}
              >
                {config.label}
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-xs"
                  style={{ backgroundColor: `${config.mapColor}30` }}
                >
                  {count}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      {/* Side-by-side: country list + map */}
      <div className="flex flex-col gap-4 md:h-[calc(100vh-14rem)] md:flex-row md:gap-6">
        {/* Map (mobile: top, fixed height; desktop: right side, flex) */}
        <div className="h-[250px] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 md:order-2 md:h-auto md:flex-1">
          <WorldMap
            requirements={requirements}
            passportCode={passportCode}
            countries={countries}
            externallyHoveredIso3={hoveredIso3}
          />
        </div>

        {/* Country list */}
        <div className="w-full max-h-[50vh] overflow-y-auto md:order-1 md:w-[360px] md:max-h-none md:shrink-0 md:pr-2">
          {REQUIREMENT_ORDER.map((type) => {
            const reqs = grouped.get(type) || []
            if (reqs.length === 0) return null

            return (
              <TabsContent key={type} value={type}>
                <div className="flex flex-col gap-2">
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
                          tabIndex={0}
                          onMouseEnter={() => setHoveredIso3(req.destination)}
                          onMouseLeave={() => setHoveredIso3(null)}
                          onFocus={() => setHoveredIso3(req.destination)}
                          onBlur={() => setHoveredIso3(null)}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                            hoveredIso3 === req.destination
                              ? "border-neutral-900 bg-neutral-50 shadow-sm"
                              : "hover:border-neutral-300 hover:bg-neutral-50"
                          )}
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
        </div>

      </div>
    </Tabs>
  )
}
