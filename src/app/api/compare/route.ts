import { NextRequest, NextResponse } from "next/server"
import {
  getPassportSummary,
  comparePassports,
  getAllCountries,
} from "@/lib/data"
import type { Country } from "@/lib/types"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const a = searchParams.get("a")?.toUpperCase()
  const b = searchParams.get("b")?.toUpperCase()

  if (!a || !b) {
    return NextResponse.json(
      { error: "Missing parameters: a and b are required" },
      { status: 400 }
    )
  }

  const summaryA = getPassportSummary(a)
  const summaryB = getPassportSummary(b)

  if (!summaryA || !summaryB) {
    return NextResponse.json(
      { error: "One or both passport codes not found" },
      { status: 404 }
    )
  }

  const comparison = comparePassports(a, b)

  const allCountries = getAllCountries()
  const countriesMap: Record<string, Country> = {}
  for (const c of allCountries) {
    countriesMap[c.iso3] = c
  }

  return NextResponse.json({
    summaryA,
    summaryB,
    comparison,
    countriesMap,
  })
}
