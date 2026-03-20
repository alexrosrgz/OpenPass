import { Suspense } from "react"
import { Navbar } from "./Navbar"

export function NavbarServer() {
  return (
    <Suspense>
      <Navbar />
    </Suspense>
  )
}
