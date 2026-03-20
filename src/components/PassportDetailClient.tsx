"use client"

import { motion } from "framer-motion"
import type { VisaRequirement, Country } from "@/lib/types"
import { AnimatedScore } from "./AnimatedScore"
import { WorldMap } from "./WorldMap"
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
    <>
      {/* Map section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50"
      >
        <WorldMap
          requirements={requirements}
          passportCode={passportCode}
          countries={countriesMap}
        />
      </motion.div>

      {/* Requirement grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-12"
      >
        <h2 className="mb-6 text-2xl font-bold">Destinations</h2>
        <RequirementGrid requirements={requirements} countries={countriesMap} />
      </motion.div>
    </>
  )
}
