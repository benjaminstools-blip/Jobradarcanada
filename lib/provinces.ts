// Pure data — safe to import from client components (no server-only deps),
// same contract as lib/countries.ts.

export type ProvinceCode =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT'
  | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT'

export const PROVINCES: { code: ProvinceCode; name: string }[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

export const PROVINCE_CODES: ProvinceCode[] = PROVINCES.map((p) => p.code)

export function provinceName(code: string): string {
  return PROVINCES.find((p) => p.code === code)?.name ?? code
}

// Spelled-out forms, including the ones job boards actually emit. Matched
// case-insensitively and accent-folded, so "Québec" and "quebec" both hit.
const NAME_ALIASES: Record<string, ProvinceCode> = {
  'alberta': 'AB',
  'british columbia': 'BC',
  'colombie britannique': 'BC',
  'manitoba': 'MB',
  'new brunswick': 'NB',
  'nouveau brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'newfoundland': 'NL',
  'labrador': 'NL',
  'northwest territories': 'NT',
  'nova scotia': 'NS',
  'nouvelle ecosse': 'NS',
  'nunavut': 'NU',
  'ontario': 'ON',
  'prince edward island': 'PE',
  'ile du prince edouard': 'PE',
  'quebec': 'QC',
  'saskatchewan': 'SK',
  'yukon': 'YT',
}

// Legacy / informal short forms that are unambiguous. Uppercase only, same
// reasoning as the official codes below.
const CODE_ALIASES: Record<string, ProvinceCode> = {
  'NFLD': 'NL',
  'NF': 'NL',
  'NWT': 'NT',
  'PEI': 'PE',
  'PQ': 'QC',
  'YK': 'YT',
}

// Strip accents, then reduce punctuation to spaces so "Toronto, ON" and
// "Toronto (ON)" both leave ON as a standalone token.
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
}

/**
 * Best-effort province extraction from a free-text location string.
 *
 * Returns null when no province is named — "Remote", "Canada", and
 * "Greater Toronto Area" all legitimately have no province token, and a null
 * is honest where a guess would be wrong.
 *
 * Two-letter codes are matched CASE-SENSITIVELY as uppercase. Lowercase "on"
 * is the English word ("work on site") and would otherwise map half the feed to
 * Ontario; real listings write "Toronto, ON".
 *
 * Only call this for Canadian searches. "Ontario, CA" is a city in California,
 * and this function cannot tell the difference — the caller carries that
 * context, so the country gate lives there.
 */
export function parseProvince(location: string | null | undefined): ProvinceCode | null {
  if (!location) return null

  const folded = fold(location)
  if (!folded) return null

  // Spelled-out names first — longest wins, so "Newfoundland and Labrador"
  // beats the bare "Newfoundland" entry rather than racing it.
  const lower = folded.toLowerCase()
  for (const name of Object.keys(NAME_ALIASES).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return NAME_ALIASES[name]
  }

  // Then informal codes (PEI, NWT, NFLD), then the official two-letter codes.
  for (const alias of Object.keys(CODE_ALIASES).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${alias}\\b`).test(folded)) return CODE_ALIASES[alias]
  }

  for (const code of PROVINCE_CODES) {
    if (new RegExp(`\\b${code}\\b`).test(folded)) return code
  }

  return null
}
