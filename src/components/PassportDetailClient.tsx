"use client"

import type { VisaRequirement, Country } from "@/lib/types"
import { AnimatedScore } from "./AnimatedScore"
import { RequirementGrid } from "./RequirementGrid"

interface ScoreOnlyProps {
  score: number
  scoreOnly: true
  requirements?: never
  passportCode?: never
  countriesMap?: never
}

interface FullProps {
  score: number
  scoreOnly?: false
  requirements: VisaRequirement[]
  passportCode: string
  countriesMap: Record<string, Country>
}

type PassportDetailClientProps = ScoreOnlyProps | FullProps

export function PassportDetailClient(props: PassportDetailClientProps) {
  if (props.scoreOnly) {
    return (
      <div className="text-2xl font-bold">
        <AnimatedScore value={props.score} />
      </div>
    )
  }

  const { score, requirements, passportCode, countriesMap } = props

  return (
    <RequirementGrid
      requirements={requirements}
      countries={countriesMap}
      passportCode={passportCode}
    />
  )
}
