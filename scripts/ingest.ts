import { parse } from "csv-parse/sync"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

const DATA_DIR = join(__dirname, "..", "data")

// Upstream URLs
const CSV_URL =
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy-iso3.csv"
const CSV_NAMES_URL =
  "https://raw.githubusercontent.com/imorte/passport-index-data/main/passport-index-tidy.csv"

type RequirementType =
  | "visa-free"
  | "visa-on-arrival"
  | "eta"
  | "e-visa"
  | "visa-required"
  | "no-admission"

interface VisaReq {
  destination: string
  requirement: RequirementType
  days?: number
}

// ISO3 to ISO2 mapping (subset — covers all 199 passports)
// prettier-ignore
const ISO3_TO_ISO2: Record<string, string> = {
  AFG:"af",ALB:"al",DZA:"dz",AND:"ad",AGO:"ao",ATG:"ag",ARG:"ar",ARM:"am",AUS:"au",AUT:"at",
  AZE:"az",BHS:"bs",BHR:"bh",BGD:"bd",BRB:"bb",BLR:"by",BEL:"be",BLZ:"bz",BEN:"bj",BTN:"bt",
  BOL:"bo",BIH:"ba",BWA:"bw",BRA:"br",BRN:"bn",BGR:"bg",BFA:"bf",BDI:"bi",CPV:"cv",KHM:"kh",
  CMR:"cm",CAN:"ca",CAF:"cf",TCD:"td",CHL:"cl",CHN:"cn",COL:"co",COM:"km",COG:"cg",COD:"cd",
  CRI:"cr",CIV:"ci",HRV:"hr",CUB:"cu",CYP:"cy",CZE:"cz",DNK:"dk",DJI:"dj",DMA:"dm",DOM:"do",
  ECU:"ec",EGY:"eg",SLV:"sv",GNQ:"gq",ERI:"er",EST:"ee",SWZ:"sz",ETH:"et",FJI:"fj",FIN:"fi",
  FRA:"fr",GAB:"ga",GMB:"gm",GEO:"ge",DEU:"de",GHA:"gh",GRC:"gr",GRD:"gd",GTM:"gt",GIN:"gn",
  GNB:"gw",GUY:"gy",HTI:"ht",HND:"hn",HUN:"hu",ISL:"is",IND:"in",IDN:"id",IRN:"ir",IRQ:"iq",
  IRL:"ie",ISR:"il",ITA:"it",JAM:"jm",JPN:"jp",JOR:"jo",KAZ:"kz",KEN:"ke",KIR:"ki",PRK:"kp",
  KOR:"kr",KWT:"kw",KGZ:"kg",LAO:"la",LVA:"lv",LBN:"lb",LSO:"ls",LBR:"lr",LBY:"ly",LIE:"li",
  LTU:"lt",LUX:"lu",MDG:"mg",MWI:"mw",MYS:"my",MDV:"mv",MLI:"ml",MLT:"mt",MHL:"mh",MRT:"mr",
  MUS:"mu",MEX:"mx",FSM:"fm",MDA:"md",MCO:"mc",MNG:"mn",MNE:"me",MAR:"ma",MOZ:"mz",MMR:"mm",
  NAM:"na",NRU:"nr",NPL:"np",NLD:"nl",NZL:"nz",NIC:"ni",NER:"ne",NGA:"ng",MKD:"mk",NOR:"no",
  OMN:"om",PAK:"pk",PLW:"pw",PAN:"pa",PNG:"pg",PRY:"py",PER:"pe",PHL:"ph",POL:"pl",PRT:"pt",
  QAT:"qa",ROU:"ro",RUS:"ru",RWA:"rw",KNA:"kn",LCA:"lc",VCT:"vc",WSM:"ws",SMR:"sm",STP:"st",
  SAU:"sa",SEN:"sn",SRB:"rs",SYC:"sc",SLE:"sl",SGP:"sg",SVK:"sk",SVN:"si",SLB:"sb",SOM:"so",
  ZAF:"za",SSD:"ss",ESP:"es",LKA:"lk",SDN:"sd",SUR:"sr",SWE:"se",CHE:"ch",SYR:"sy",TJK:"tj",
  TZA:"tz",THA:"th",TLS:"tl",TGO:"tg",TON:"to",TTO:"tt",TUN:"tn",TUR:"tr",TKM:"tm",TUV:"tv",
  UGA:"ug",UKR:"ua",ARE:"ae",GBR:"gb",USA:"us",URY:"uy",UZB:"uz",VUT:"vu",VAT:"va",VEN:"ve",
  VNM:"vn",YEM:"ye",ZMB:"zm",ZWE:"zw",
  // Territories
  TWN:"tw",MAC:"mo",HKG:"hk",XKX:"xk",PSE:"ps",
}

function mapRequirement(raw: string): { requirement: RequirementType; days?: number } | null {
  const val = raw.trim().toLowerCase()

  if (val === "-1") return null // self

  const num = parseInt(val)
  if (!isNaN(num) && num > 0) {
    return { requirement: "visa-free", days: num }
  }

  switch (val) {
    case "visa free":
      return { requirement: "visa-free" }
    case "visa on arrival":
      return { requirement: "visa-on-arrival" }
    case "eta":
      return { requirement: "eta" }
    case "e-visa":
      return { requirement: "e-visa" }
    case "visa required":
      return { requirement: "visa-required" }
    case "no admission":
      return { requirement: "no-admission" }
    default:
      console.warn(`Unknown requirement: "${raw}"`)
      return { requirement: "visa-required" }
  }
}

async function fetchCSV(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

async function main() {
  console.log("Fetching data...")

  const [csv3, csvNames] = await Promise.all([
    fetchCSV(CSV_URL),
    fetchCSV(CSV_NAMES_URL),
  ])

  // Parse ISO3 CSV
  const rows3 = parse(csv3, { columns: true, skip_empty_lines: true }) as {
    Passport: string
    Destination: string
    Requirement: string
  }[]

  // Parse names CSV for country name lookup
  const rowsNames = parse(csvNames, { columns: true, skip_empty_lines: true }) as {
    Passport: string
    Destination: string
    Requirement: string
  }[]

  // Build country name lookup from names CSV
  const nameSet = new Set<string>()
  for (const row of rowsNames) {
    nameSet.add(row.Passport)
    nameSet.add(row.Destination)
  }

  // Build ISO3 → name mapping from paired CSV rows
  // Both CSVs have same row order, so we can pair them
  const iso3ToName: Record<string, string> = {}
  for (let i = 0; i < rows3.length && i < rowsNames.length; i++) {
    const iso3 = rows3[i].Passport
    const name = rowsNames[i].Passport
    if (iso3 && name && !iso3ToName[iso3]) {
      iso3ToName[iso3] = name
    }
    const destIso3 = rows3[i].Destination
    const destName = rowsNames[i].Destination
    if (destIso3 && destName && !iso3ToName[destIso3]) {
      iso3ToName[destIso3] = destName
    }
  }

  // Build visa requirements
  const visaRequirements: Record<string, VisaReq[]> = {}

  for (const row of rows3) {
    const mapped = mapRequirement(row.Requirement)
    if (!mapped) continue

    if (!visaRequirements[row.Passport]) {
      visaRequirements[row.Passport] = []
    }

    const entry: VisaReq = {
      destination: row.Destination,
      requirement: mapped.requirement,
    }
    if (mapped.days) entry.days = mapped.days

    visaRequirements[row.Passport].push(entry)
  }

  // Build countries data
  const countries: Record<string, { iso3: string; iso2: string; name: string }> = {}
  for (const iso3 of Object.keys(visaRequirements)) {
    const iso2 = ISO3_TO_ISO2[iso3] || iso3.substring(0, 2).toLowerCase()
    countries[iso3] = {
      iso3,
      iso2,
      name: iso3ToName[iso3] || iso3,
    }
  }
  // Also add destinations that might not be passport issuers
  for (const reqs of Object.values(visaRequirements)) {
    for (const req of reqs) {
      if (!countries[req.destination]) {
        const iso2 = ISO3_TO_ISO2[req.destination] || req.destination.substring(0, 2).toLowerCase()
        countries[req.destination] = {
          iso3: req.destination,
          iso2,
          name: iso3ToName[req.destination] || req.destination,
        }
      }
    }
  }

  // Write output
  mkdirSync(DATA_DIR, { recursive: true })

  writeFileSync(
    join(DATA_DIR, "visa-requirements.json"),
    JSON.stringify(visaRequirements, null, 2)
  )
  console.log(
    `✓ visa-requirements.json — ${Object.keys(visaRequirements).length} passports`
  )

  writeFileSync(join(DATA_DIR, "countries.json"), JSON.stringify(countries, null, 2))
  console.log(`✓ countries.json — ${Object.keys(countries).length} countries`)

  // Print stats
  let totalEntries = 0
  for (const reqs of Object.values(visaRequirements)) {
    totalEntries += reqs.length
  }
  console.log(`✓ Total visa requirement entries: ${totalEntries}`)
}

main().catch(console.error)
