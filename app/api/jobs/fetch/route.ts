import { createClient } from '@/lib/supabase/server'
import {
  createApifyClient,
  INDEED_COUNTRY_CODES,
  DEFAULT_COUNTRY,
  indeedCountryName,
} from '@/lib/apify'
import { sourcesFor } from '@/lib/sources'
import { resolveApifyKey, NO_APIFY_KEY, resolveAnthropicKey } from '@/lib/keys'
import { createClaudeClient, CV_PARSE_MODEL, textOf } from '@/lib/claude'
import { buildSearchQueryPrompt } from '@/lib/prompts'
import { nocTitle } from '@/lib/noc'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const maxDuration = 60

const QueriesSchema = z.object({ queries: z.array(z.string()).min(1).max(3) })

// No minItems/maxItems — the API rejects them on an array ("For 'array' type,
// property 'maxItems' is not supported"). The 1-3 bound is enforced by
// QueriesSchema after parsing instead.
const QUERIES_JSON_SCHEMA = {
  type: 'object',
  properties: {
    queries: { type: 'array', items: { type: 'string' } },
  },
  required: ['queries'],
  additionalProperties: false,
} as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { jobTitle, location } = body as { jobTitle: string; location: string; country?: string }
  // Country drives Indeed's localized domain, gates the Canada-only boards, and
  // is the location fallback for the rest.
  const country = INDEED_COUNTRY_CODES.includes(body.country)
    ? (body.country as string)
    : DEFAULT_COUNTRY
  const countryName = indeedCountryName(country)
  const regionText = location?.trim() || countryName

  if (!jobTitle?.trim()) {
    return NextResponse.json({ error: 'Job title is required.' }, { status: 400 })
  }

  const { data: keysRow } = await supabase
    .from('user_api_keys')
    .select('apify_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  const apifyKey = resolveApifyKey(user.id, keysRow?.apify_api_key)
  if (!apifyKey) return NextResponse.json(NO_APIFY_KEY, { status: 400 })
  const apify = createApifyClient(apifyKey)

  // Refine the typed phrase into terms that match the candidate's actual
  // occupation. A literal search on what she types drifts into the wrong
  // industry — see buildSearchQueryPrompt. Never block the search on this:
  // any failure falls back to the raw phrase.
  let searchQuery = jobTitle.trim()
  let refinedFrom: string | null = null

  const [{ data: profile }, { data: anthropicRow }] = await Promise.all([
    supabase.from('cv_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_api_keys').select('anthropic_api_key').eq('user_id', user.id).maybeSingle(),
  ])

  const anthropicKey = resolveAnthropicKey(user.id, anthropicRow?.anthropic_api_key)

  if (profile && anthropicKey) {
    try {
      const groupTitle = profile.noc_code ? nocTitle(profile.noc_code) ?? null : null
      const prompt = buildSearchQueryPrompt(profile, jobTitle.trim(), groupTitle)
      const claude = createClaudeClient(anthropicKey)
      const message = await claude.messages.create({
        model: CV_PARSE_MODEL,
        max_tokens: 2048,
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: QUERIES_JSON_SCHEMA },
        },
        system: prompt.system,
        messages: prompt.messages,
      })
      if (message.stop_reason !== 'refusal') {
        const { queries } = QueriesSchema.parse(JSON.parse(textOf(message)))
        const best = queries[0]?.trim()
        if (best && best.toLowerCase() !== jobTitle.trim().toLowerCase()) {
          refinedFrom = jobTitle.trim()
          searchQuery = best
        }
      }
    } catch (err) {
      console.error('[jobs/fetch] query refine:', err instanceof Error ? err.message : err)
    }
  }

  const params = { jobTitle: searchQuery, location: location ?? '', country, countryName, regionText }
  const sources = sourcesFor(country)

  // Start every applicable actor concurrently and return immediately — Apify
  // runs take 30–90s, well past the Vercel function limit, so the client polls.
  const started = await Promise.all(
    sources.map(async (source) => {
      try {
        const run = await apify.actor(source.actor).start(source.input(params))
        return { id: source.id, runId: run.id }
      } catch (err) {
        console.error(`[jobs/fetch] ${source.id}:`, err instanceof Error ? err.message : err)
        return { id: source.id, runId: null }
      }
    })
  )

  const runs: Record<string, string> = {}
  const errors: string[] = []
  for (const { id, runId } of started) {
    if (runId) runs[id] = runId
    else errors.push(id)
  }

  if (Object.keys(runs).length === 0) {
    const names = sources.map((s) => s.label).join(', ')
    return NextResponse.json({
      error: `Couldn't fetch jobs from ${names}. Check your Apify API key in Settings or try again in a moment.`,
    }, { status: 502 })
  }

  return NextResponse.json({ runs, errors, searchQuery, refinedFrom })
}
