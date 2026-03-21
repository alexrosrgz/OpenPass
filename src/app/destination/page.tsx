import { getAllCountries } from "@/lib/data"
import { DestinationSearch } from "@/components/DestinationSearch"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Destinations — OpenPass",
  description: "Search for a destination to see visa requirements by passport.",
}

export default function DestinationIndexPage() {
  const countries = getAllCountries()

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 pt-14">
      <div className="w-full max-w-xl text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
          Destinations
        </h1>
        <p className="mb-10 text-lg text-neutral-600">
          Select your passport and where you want to go
        </p>
        <DestinationSearch countries={countries} showPassportPicker />
      </div>
    </div>
  )
}
