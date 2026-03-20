import { Suspense } from "react"
import { getAllCountries } from "@/lib/data"
import { CompareClient } from "@/components/CompareClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Compare Passports — OpenPass",
  description: "Compare two passports side by side.",
}

export default function ComparePage() {
  const countries = getAllCountries()

  return (
    <div className="min-h-screen pt-24">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Compare Passports
        </h1>
        <p className="mt-2 text-neutral-400">
          See the differences side by side
        </p>

        <div className="mt-12">
          <Suspense fallback={<div className="text-neutral-500">Loading...</div>}>
            <CompareClient countries={countries} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
