"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { Country } from "@/lib/types"
import { CountryFlag } from "./CountryFlag"

interface CountrySearchProps {
  countries: Country[]
  placeholder?: string
  navigateTo?: (code: string) => string
  onSelect?: (country: Country) => void
  className?: string
  compact?: boolean
}

export function CountrySearch({
  countries,
  placeholder = "Search for a country...",
  navigateTo,
  onSelect,
  className = "",
  compact = false,
}: CountrySearchProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtered = query.trim()
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().startsWith(query.toLowerCase()) ||
          c.iso3.toLowerCase().startsWith(query.toLowerCase()) ||
          c.iso2.toLowerCase().startsWith(query.toLowerCase())
      )
    : countries

  const displayed = filtered.slice(0, 8)

  const select = useCallback(
    (country: Country) => {
      setQuery("")
      setSelectedIndex(0)
      setIsOpen(false)
      if (onSelect) {
        onSelect(country)
      } else {
        const url = navigateTo ? navigateTo(country.iso3) : `/?passport=${country.iso3}`
        router.push(url)
      }
    },
    [router, navigateTo, onSelect]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, displayed.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (displayed[selectedIndex]) {
          select(displayed[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            compact
              ? "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all focus:border-neutral-300 focus:bg-white focus:ring-1 focus:ring-neutral-200"
              : "w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-4 text-lg text-neutral-900 placeholder-neutral-500 outline-none transition-all duration-300 focus:border-neutral-300 focus:bg-white focus:ring-1 focus:ring-neutral-200"
          }
          autoComplete="off"
        />
        <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && query.trim() !== "" && displayed.length > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
          >
            {displayed.map((country, i) => (
              <button
                key={country.iso3}
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(country)
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <CountryFlag iso2={country.iso2} name={country.name} size={28} />
                <span className="flex-1 font-medium">{country.name}</span>
                <span className="text-xs text-neutral-600">{country.iso3}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
