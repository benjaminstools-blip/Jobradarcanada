// Registry of job-board scrapers. Everything source-specific lives here — the
// fetch and poll routes just iterate. Adding a board should mean adding one
// entry below and nothing else.
//
// Pure data + pure functions, no server-only imports, so the client can import
// SOURCE_LABELS from it too.
import type { ScrapedSource } from '@/types'

export interface SearchParams {
  jobTitle: string
  /** User-entered city, may be empty. */
  location: string
  /** Lowercase Indeed country code, e.g. 'ca'. */
  country: string
  /** Display name for `country`, e.g. 'Canada'. */
  countryName: string
  /** `location` if the user gave one, otherwise `countryName`. */
  regionText: string
}

/** The subset of a `jobs` row that a scraper can supply. */
export interface MappedJob {
  job_title: string
  company_name: string | null
  location: string | null
  job_description: string | null
  apply_url: string | null
}

export interface SourceDef {
  id: ScrapedSource
  label: string
  actor: string
  /** Builds the actor's input. Field names differ per actor — do not assume. */
  input: (params: SearchParams) => Record<string, unknown>
  map: (record: Record<string, unknown>) => MappedJob
  /** Boards that only cover certain countries opt out here rather than burning
   *  Apify credits on a search they cannot answer. */
  appliesTo?: (country: string) => boolean
}

export function stripHtml(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.replace(/<[^>]*>/g, '').trim() || null
}

// Indeed returns location as an object ({ city, region, country, ... }), not a string.
function formatIndeedLocation(value: unknown): string | null {
  if (typeof value === 'string') return stripHtml(value)
  if (value && typeof value === 'object') {
    const loc = value as Record<string, unknown>
    const parts = [loc.city, loc.region, loc.country]
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    if (parts.length) return parts.join(', ')
  }
  return null
}

/** Actors vary their field names across builds, so every mapper falls back
 *  through the plausible spellings rather than trusting one. */
const PER_SOURCE_LIMIT = 10

export const SOURCES: SourceDef[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    actor: 'curious_coder/linkedin-jobs-scraper',
    input: ({ jobTitle, regionText }) => ({
      queries: jobTitle,
      location: regionText,
      limit: PER_SOURCE_LIMIT,
    }),
    map: (r) => ({
      job_title: stripHtml(r.title ?? r.jobTitle ?? r.position) ?? 'Untitled',
      company_name: stripHtml(r.companyName ?? r.company),
      location: stripHtml(r.location),
      job_description: stripHtml(r.description ?? r.jobDescription),
      apply_url: stripHtml(r.applyUrl ?? r.jobUrl ?? r.url),
    }),
  },
  {
    id: 'indeed',
    label: 'Indeed',
    actor: 'borderline/indeed-scraper',
    // `country` selects the localized indeed.com domain.
    input: ({ jobTitle, location, country }) => ({
      query: jobTitle,
      location: location.trim(),
      country,
      maxRows: PER_SOURCE_LIMIT,
    }),
    map: (r) => ({
      job_title: stripHtml(r.title ?? r.jobTitle) ?? 'Untitled',
      company_name: stripHtml(r.companyName ?? r.company),
      location: formatIndeedLocation(r.location),
      job_description: stripHtml(r.descriptionText ?? r.description),
      apply_url: stripHtml(r.applyUrl ?? r.jobUrl),
    }),
  },
  {
    id: 'eluta',
    label: 'Eluta',
    actor: 'blackfalcondata/eluta-scraper',
    // eluta.ca indexes Canadian employers only.
    appliesTo: (country) => country === 'ca',
    input: ({ jobTitle, location }) => ({
      query: jobTitle,
      location: location.trim(),
      country: 'CA',
      maxResults: PER_SOURCE_LIMIT,
      includeDetails: true,
    }),
    map: (r) => ({
      job_title: stripHtml(r.title) ?? 'Untitled',
      company_name: stripHtml(r.company ?? r.companyName),
      location: stripHtml(r.location),
      job_description: stripHtml(r.description ?? r.descriptionText ?? r.descriptionHtml),
      apply_url: stripHtml(r.applyUrl ?? r.canonicalUrl ?? r.sourceUrl),
    }),
  },
  {
    id: 'workopolis',
    label: 'Workopolis',
    actor: 'shahidirfan/workopolis-job-scraper',
    // workopolis.com is a Canadian board.
    appliesTo: (country) => country === 'ca',
    // Note the snake_case — this actor does not accept `query`/`maxResults`.
    input: ({ jobTitle, regionText }) => ({
      keyword: jobTitle,
      location: regionText,
      results_wanted: PER_SOURCE_LIMIT,
      max_pages: 2,
    }),
    map: (r) => ({
      job_title: stripHtml(r.title ?? r.jobTitle) ?? 'Untitled',
      company_name: stripHtml(r.company ?? r.companyName),
      location: stripHtml(r.location),
      job_description: stripHtml(r.description_text ?? r.description_html ?? r.snippet),
      apply_url: stripHtml(r.url ?? r.jobUrl ?? r.applyUrl),
    }),
  },
]

export const SOURCE_LABELS: Record<ScrapedSource, string> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s.label])
) as Record<ScrapedSource, string>

export function sourcesFor(country: string): SourceDef[] {
  return SOURCES.filter((s) => !s.appliesTo || s.appliesTo(country))
}

export function sourceById(id: string): SourceDef | undefined {
  return SOURCES.find((s) => s.id === id)
}

export const DATASET_ITEM_LIMIT = PER_SOURCE_LIMIT
