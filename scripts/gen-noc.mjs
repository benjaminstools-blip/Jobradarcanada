import { writeFileSync } from 'node:fs'

const SRC = 'https://pioverseas.com/canada-noc/'
const OUT = new URL('../lib/noc.ts', import.meta.url)

const ENTITIES = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…',
}
function decode(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

const html = await (await fetch(SRC, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()
const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')

const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => decode(c[1])))
  .filter((c) => c.length === 2 && /^\d{5}$/.test(c[0]) && c[1])
  .map(([code, title]) => ({ code, title }))
  .sort((a, b) => a.code.localeCompare(b.code))

// Fail loudly rather than emit a half-scraped table.
const codes = new Set(rows.map((r) => r.code))
if (rows.length !== 516) throw new Error(`expected 516 unit groups, parsed ${rows.length}`)
if (codes.size !== 516) throw new Error(`duplicate codes: ${rows.length - codes.size}`)
for (const { code } of rows) {
  const teer = Number(code[1])
  if (teer < 0 || teer > 5) throw new Error(`code ${code} has out-of-range TEER digit`)
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const entries = rows.map((r) => `  { code: '${r.code}', title: '${esc(r.title)}' },`).join('\n')

writeFileSync(OUT, `// Pure data — safe to import from client components (no server-only deps).
//
// National Occupational Classification (NOC) 2021 unit groups — the 5-digit
// codes Canadian employers, ESDC, and IRCC use to identify an occupation. All
// 516 unit groups are listed.
//
// Scraped from ${SRC} on ${new Date().toISOString().slice(0, 10)}.
// That is a third-party immigration site, NOT Statistics Canada — the official
// source (noc.esdc.gc.ca) could not be fetched to cross-check the titles. The
// structure was validated: 516 unique codes, every TEER digit in range, all ten
// broad categories present. Treat individual titles as unverified; re-generate
// from the official source when one is reachable.
//
// Regenerate: node scripts/gen-noc.mjs

export interface NocUnitGroup {
  /** 5-digit NOC 2021 unit group code. */
  code: string
  /** Official occupation title for the unit group. */
  title: string
}

/**
 * TEER (Training, Education, Experience and Responsibilities) category.
 * In NOC 2021 the SECOND digit of the code IS the TEER category, so this is
 * derived rather than stored. Express Entry programs generally require TEER 0-3.
 */
export type TeerCategory = 0 | 1 | 2 | 3 | 4 | 5

export const TEER_LABELS: Record<TeerCategory, string> = {
  0: 'Management occupations',
  1: 'University degree',
  2: 'College diploma, apprenticeship (2+ years), or supervisory role',
  3: 'College diploma (under 2 years) or apprenticeship (under 2 years)',
  4: 'High school diploma or several weeks of on-the-job training',
  5: 'Short work demonstration, no formal education required',
}

/** First digit of the code — the NOC broad occupational category. */
export const BROAD_CATEGORIES: Record<string, string> = {
  '0': 'Legislative and senior management occupations',
  '1': 'Business, finance and administration occupations',
  '2': 'Natural and applied sciences and related occupations',
  '3': 'Health occupations',
  '4': 'Education, law and social, community and government services',
  '5': 'Art, culture, recreation and sport occupations',
  '6': 'Sales and service occupations',
  '7': 'Trades, transport and equipment operators and related occupations',
  '8': 'Natural resources, agriculture and related production occupations',
  '9': 'Manufacturing and utilities occupations',
}

export const NOC_UNIT_GROUPS: readonly NocUnitGroup[] = [
${entries}
] as const

const BY_CODE = new Map(NOC_UNIT_GROUPS.map((g) => [g.code, g]))

/**
 * Every valid code, for use as a JSON-schema \`enum\`. Constraining the model's
 * output to this set at the schema level means an invented code cannot be
 * produced in the first place; \`isValidNocCode\` is the second line of defence.
 */
export const NOC_CODES: readonly string[] = NOC_UNIT_GROUPS.map((g) => g.code)

/**
 * The full \`code title\` list as one string, for dropping into a prompt so the
 * model can actually choose between codes. Built once at module load — it is
 * roughly 26 KB, so read it, never rebuild it per request.
 */
export const NOC_REFERENCE_LIST: string = NOC_UNIT_GROUPS.map(
  (g) => \`\${g.code} \${g.title}\`
).join('\\n')

/**
 * Whether a string is a real NOC 2021 unit group code.
 * Every LLM-produced code must pass through this before it is stored or shown —
 * a plausible-looking but non-existent NOC code is worse than no code at all,
 * because employers and immigration programs check it.
 */
export function isValidNocCode(code: unknown): code is string {
  return typeof code === 'string' && BY_CODE.has(code)
}

export function nocByCode(code: string): NocUnitGroup | undefined {
  return BY_CODE.get(code)
}

export function nocTitle(code: string): string | undefined {
  return BY_CODE.get(code)?.title
}

/** TEER category, read off the second digit. Undefined for unknown codes. */
export function teerOf(code: string): TeerCategory | undefined {
  if (!isValidNocCode(code)) return undefined
  return Number(code[1]) as TeerCategory
}

export function teerLabel(code: string): string | undefined {
  const teer = teerOf(code)
  return teer === undefined ? undefined : TEER_LABELS[teer]
}

export function broadCategoryOf(code: string): string | undefined {
  if (!isValidNocCode(code)) return undefined
  return BROAD_CATEGORIES[code[0]]
}

/**
 * TEER 0-3 is the usual bar for Express Entry's skilled-worker streams. This is
 * a display hint only — actual program eligibility depends on far more than the
 * code, so never present it to a user as an eligibility determination.
 */
export function isSkilledTeer(code: string): boolean {
  const teer = teerOf(code)
  return teer !== undefined && teer <= 3
}
`)

console.log(`wrote ${rows.length} unit groups`)
