import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { NavbarServer } from "@/components/NavbarServer"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "OpenPass — Discover Your Passport Power",
  description:
    "Check visa requirements, compare passports, and explore where your passport can take you. Free, open, and beautifully designed.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NavbarServer />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
