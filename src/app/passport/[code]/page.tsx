import { redirect } from "next/navigation"
import { getAllPassports } from "@/lib/data"

export function generateStaticParams() {
  return getAllPassports().map((p) => ({ code: p.code }))
}

export default async function PassportPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  redirect(`/?passport=${code.toUpperCase()}`)
}
