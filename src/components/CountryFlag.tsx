import { FLAG_CDN_URL } from "@/lib/constants"
import Image from "next/image"

interface CountryFlagProps {
  iso2: string
  name: string
  size?: number
  className?: string
}

export function CountryFlag({
  iso2,
  name,
  size = 32,
  className = "",
}: CountryFlagProps) {
  const height = Math.round(size * 0.75)
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-sm ${className}`}
      style={{ width: size, height, minWidth: size }}
    >
      <Image
        src={`${FLAG_CDN_URL}/${iso2}.png`}
        alt={`${name} flag`}
        width={size}
        height={height}
        className="h-full w-full object-contain"
        unoptimized
      />
    </span>
  )
}
