export type RequirementType =
  | "visa-free"
  | "visa-on-arrival"
  | "eta"
  | "e-visa"
  | "visa-required"
  | "no-admission"

export interface VisaRequirement {
  destination: string // ISO3
  requirement: RequirementType
  days?: number
}

export interface PassportSummary {
  code: string // ISO3
  name: string
  score: number // visa-free + VOA + ETA count
  rank: number
  breakdown: Record<RequirementType, number>
}

export interface Country {
  iso3: string
  iso2: string
  name: string
  passportImageUrl?: string
}

export interface VisaRequirementData {
  [passportCode: string]: VisaRequirement[]
}

export interface CountryData {
  [iso3: string]: Country
}
