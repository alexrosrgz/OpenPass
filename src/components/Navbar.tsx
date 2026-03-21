"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isHome = pathname === "/"
  const isDestination = pathname.startsWith("/destination")
  const isRanking = pathname === "/ranking"
  const isCompare = pathname === "/compare"

  const linkClass = (active: boolean) =>
    active
      ? "text-neutral-900 border-b-2 border-neutral-900 pb-0.5"
      : "text-neutral-500 transition-colors hover:text-neutral-900"

  const mobileLinkClass = (active: boolean) =>
    active
      ? "block px-4 py-3 text-sm font-medium text-neutral-900 bg-neutral-50"
      : "block px-4 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"

  const links = [
    { href: "/", label: "My Passport", active: isHome },
    { href: "/destination", label: "Destinations", active: isDestination },
    { href: "/ranking", label: "Ranking", active: isRanking },
    { href: "/compare", label: "Compare", active: isCompare },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-4 md:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          OpenPass
        </Link>

        {/* Desktop links */}
        <div className="ml-auto hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.active)}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Hamburger button */}
        <button
          className="ml-auto md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-neutral-200 bg-white md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={mobileLinkClass(link.active)}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
