import { ApifyClient } from 'apify-client'

// Requires a resolved token — no env fallback here. Callers resolve the token
// via lib/keys.ts (resolveApifyKey) so the owner-only fallback lives in one place.
export function createApifyClient(token: string) {
  if (!token) {
    throw new Error('No Apify API key provided.')
  }
  return new ApifyClient({ token })
}

// Actor IDs and their per-source input/output mapping live in lib/sources.ts.

// Re-export the client-safe country data so server routes can keep importing
// everything Apify-related from this module.
export {
  INDEED_COUNTRIES,
  INDEED_COUNTRY_CODES,
  DEFAULT_COUNTRY,
  indeedCountryName,
} from './countries'
