"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

interface AnimatedScoreProps {
  value: number
  className?: string
}

export function AnimatedScore({ value, className = "" }: AnimatedScoreProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: "easeOut",
    })

    const unsubscribe = rounded.on("change", (v) => setDisplay(v))

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded])

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {display}
    </motion.span>
  )
}
