import { createClient } from '@/lib/supabase/server'
import {
  createApifyClient,
  INDEED_COUNTRY_CODES,
  DEFAULT_COUNTRY,
  indeedCountryName,
} from '@/lib/apify'
import { sourcesFor } from '@/lib/sources'
import { resolveApifyKey, NO_APIFY_KEY } from '@/lib/keys'
import { NextResponse } from 'next/server'

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

  const params = { jobTitle, location: location ?? '', country, countryName, regionText }
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

  return NextResponse.json({ runs, errors })
}
