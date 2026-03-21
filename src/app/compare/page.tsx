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
        <div className="mt-0">
          <Suspense fallback={<div className="text-neutral-500">Loading...</div>}>
            <CompareClient countries={countries} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
