# OpenPass

Check visa requirements, compare passports, and explore where your passport can take you. Free, open, and beautifully designed.

## Features

- **Passport Lookup** — Select your passport and see every destination color-coded by visa requirement on an interactive world map
- **Destination Lookup** — Pick a country and see which passports can enter without a visa
- **Compare** — Side-by-side passport comparison with score differences
- **Ranking** — Full leaderboard of 199 passports sorted by mobility score

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui
- react19-simple-maps

## Getting Started

```bash
# Install dependencies
npm install

# Fetch and generate visa requirement data
npx tsx scripts/ingest.ts

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

Visa requirement data is sourced from [imorte/passport-index-data](https://github.com/imorte/passport-index-data) (MIT licensed). The ingestion script fetches the upstream CSV and transforms it into JSON stored in `/data`.

To refresh the data, re-run the ingestion script:

```bash
npx tsx scripts/ingest.ts
```

## Project Structure

```
scripts/ingest.ts              # Data ingestion script
data/                          # Generated JSON datasets
src/
  app/                         # Next.js pages (App Router)
    passport/[code]/page.tsx   # Passport detail + world map
    destination/[code]/page.tsx # Destination detail
    compare/page.tsx           # Side-by-side comparison
    ranking/page.tsx           # Leaderboard
  lib/                         # Types, data access, constants
  components/                  # UI components
```

## License

MIT
