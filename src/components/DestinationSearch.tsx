"use client"

import type { Country } from "@/lib/types"
import { CountrySearch } from "./CountrySearch"

interface DestinationSearchProps {
  countries: Country[]
}

export function DestinationSearch({ countries }: DestinationSearchProps) {
  return (
    <CountrySearch
      countries={countries}
      placeholder="Search a destination..."
      navigateTo={(code) => `/destination/${code}`}
    />
  )
}
