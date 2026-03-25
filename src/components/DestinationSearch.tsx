"use client"

import { useState } from "react"
import type { Country } from "@/lib/types"
import { CountrySearch } from "./CountrySearch"
import { CountryFlag } from "./CountryFlag"

interface DestinationSearchProps {
  countries: Country[]
  showPassportPicker?: boolean
}

export function DestinationSearch({ countries, showPassportPicker = false }: DestinationSearchProps) {
  const [selectedPassport, setSelectedPassport] = useState<Country | null>(null)

  if (!showPassportPicker) {
    return (
      <CountrySearch
        countries={countries}
        placeholder="Search a destination..."
        navigateTo={(code) => `/destination/${code}`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: Select passport */}
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-500">Your passport</p>
        {selectedPassport ? (
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-3">
            <CountryFlag iso2={selectedPassport.iso2} name={selectedPassport.name} size={32} />
            <span className="flex-1 text-left font-medium">{selectedPassport.name}</span>
            <button
              onClick={() => setSelectedPassport(null)}
              className="text-neutral-400 hover:text-neutral-900"
            >
              ×
            </button>
          </div>
        ) : (
          <CountrySearch
            countries={countries}
            placeholder="Select your passport..."
            onSelect={(country) => setSelectedPassport(country)}
          />
        )}
      </div>

      {/* Step 2: Search destination */}
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-500">Destination</p>
        <CountrySearch
          countries={countries}
          placeholder="Where are you going?"
          navigateTo={(code) =>
            selectedPassport
              ? `/destination/${code}?passport=${selectedPassport.iso3}`
              : `/destination/${code}`
          }
        />
      </div>
    </div>
  )
}
