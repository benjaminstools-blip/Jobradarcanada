import { createClient } from '@/lib/supabase/server'
import { createApifyClient } from '@/lib/apify'
import { sourceById, DATASET_ITEM_LIMIT } from '@/lib/sources'
import { resolveApifyKey, NO_APIFY_KEY } from '@/lib/keys'
import { parseProvince } from '@/lib/provinces'
import { DEFAULT_COUNTRY } from '@/lib/countries'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// A run is "done" (stop waiting) once it reaches ANY terminal state, not only
// SUCCEEDED. A failing source must not block the ones that succeeded — otherwise
// one ABORTED/FAILED scraper leaves the whole feed empty. Terminal-but-not-
// SUCCEEDED runs are reported in `errors` so their dataset is skipped.
const TERMINAL = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // `runs` is a comma-separated list of sourceId:runId pairs, so adding a board
  // doesn't change the query-string shape.
  // Province is only derivable for Canadian searches: "Ontario, CA" is a city in
  // California, and the location string alone cannot settle it. Defaults to the
  // product's own default country when the param is absent.
  const isCanada =
    (request.nextUrl.searchParams.get('country') ?? DEFAULT_COUNTRY) === 'ca'

  const runs = (request.nextUrl.searchParams.get('runs') ?? '')
    .split(',')
    .map((pair) => pair.split(':'))
    .filter(([id, runId]) => id && runId && sourceById(id))
    .map(([id, runId]) => ({ id, runId }))

  if (runs.length === 0) {
    return NextResponse.json({ done: true, errors: [] })
  }

  const { data: keysRow } = await supabase
    .from('user_api_keys')
    .select('apify_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  const apifyKey = resolveApifyKey(user.id, keysRow?.apify_api_key)
  if (!apifyKey) return NextResponse.json(NO_APIFY_KEY, { status: 400 })
  const apify = createApifyClient(apifyKey)

  const errors: string[] = []

  const settled = await Promise.all(
    runs.map(async ({ id, runId }) => {
      try {
        const status = (await apify.run(runId).get())?.status
        if (status === 'SUCCEEDED') return { id, runId, done: true, ok: true }
        if (status && TERMINAL.includes(status)) return { id, runId, done: true, ok: false }
        return { id, runId, done: false, ok: false } // still running — keep polling
      } catch {
        // Give up on this source rather than hang the whole batch.
        return { id, runId, done: true, ok: false }
      }
    })
  )

  for (const { id, done, ok } of settled) {
    if (done && !ok) errors.push(id)
  }

  const done = settled.every((r) => r.done)
  if (!done) return NextResponse.json({ done, errors })

  // Every run is terminal — ingest whichever succeeded.
  const harvested = await Promise.all(
    settled
      .filter((r) => r.ok)
      .map(async ({ id, runId }) => {
        const source = sourceById(id)!
        try {
          const datasetId = (await apify.run(runId).get())!.defaultDatasetId
          const { items } = await apify.dataset(datasetId).listItems({ limit: DATASET_ITEM_LIMIT })
          return items.map((item) => {
            const mapped = source.map(item as Record<string, unknown>)
            return {
              user_id: user.id,
              source: source.id,
              ...mapped,
              province: isCanada ? parseProvince(mapped.location) : null,
            }
          })
        } catch (err) {
          console.error(`[jobs/poll] ${id} dataset:`, err instanceof Error ? err.message : err)
          return []
        }
      })
  )

  const insertRows = harvested.flat()
  if (insertRows.length > 0) {
    await supabase.from('jobs').insert(insertRows)
  }

  return NextResponse.json({ done, errors })
}
