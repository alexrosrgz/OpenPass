import type { RequirementType } from "./types"

export const REQUIREMENT_CONFIG: Record<
  RequirementType,
  { label: string; color: string; bgColor: string; mapColor: string }
> = {
  "visa-free": {
    label: "Visa Free",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    mapColor: "#34d399",
  },
  "visa-on-arrival": {
    label: "Visa on Arrival",
    color: "text-green-700",
    bgColor: "bg-green-100",
    mapColor: "#86efac",
  },
  eta: {
    label: "eTA",
    color: "text-sky-700",
    bgColor: "bg-sky-100",
    mapColor: "#38bdf8",
  },
  "e-visa": {
    label: "e-Visa",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    mapColor: "#fbbf24",
  },
  "visa-required": {
    label: "Visa Required",
    color: "text-red-700",
    bgColor: "bg-red-100",
    mapColor: "#f87171",
  },
  "no-admission": {
    label: "No Admission",
    color: "text-neutral-700",
    bgColor: "bg-neutral-200",
    mapColor: "#525252",
  },
}

export const REQUIREMENT_ORDER: RequirementType[] = [
  "visa-free",
  "visa-on-arrival",
  "eta",
  "e-visa",
  "visa-required",
  "no-admission",
]

export const FLAG_CDN_URL = "https://flagcdn.com/w160"
