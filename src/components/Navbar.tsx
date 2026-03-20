"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navbar() {
  const pathname = usePathname()

  const isHome = pathname === "/"
  const isDestination = pathname.startsWith("/destination")
  const isRanking = pathname === "/ranking"
  const isCompare = pathname === "/compare"

  const linkClass = (active: boolean) =>
    active
      ? "text-neutral-900 border-b-2 border-neutral-900 pb-0.5"
      : "text-neutral-500 transition-colors hover:text-neutral-900"

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          OpenPass
        </Link>

        <div className="ml-auto flex items-center gap-6 text-sm font-medium">
          <Link href="/" className={linkClass(isHome)}>
            My Passport
          </Link>
          <Link href="/destination" className={linkClass(isDestination)}>
            Destinations
          </Link>
          <Link href="/ranking" className={linkClass(isRanking)}>
            Ranking
          </Link>
          <Link href="/compare" className={linkClass(isCompare)}>
            Compare
          </Link>
        </div>
      </div>
    </nav>
  )
}
