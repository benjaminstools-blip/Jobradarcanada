import { createClient } from '@/lib/supabase/server'
import { maskKey } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_api_keys')
    .select('anthropic_api_key, apify_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  // Never return the raw key to the browser — masked preview + presence flag only.
  return NextResponse.json({
    keys: {
      anthropic_set: !!data?.anthropic_api_key,
      apify_set: !!data?.apify_api_key,
      anthropic_preview: data?.anthropic_api_key ? maskKey(data.anthropic_api_key) : null,
      apify_preview: data?.apify_api_key ? maskKey(data.apify_api_key) : null,
    },
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Client no longer holds the full stored key, so an omitted/blank field
  // means "leave as-is" — merge against the existing row instead of nulling.
  const { data: existing } = await supabase
    .from('user_api_keys')
    .select('anthropic_api_key, apify_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  const nextAnthropic = typeof body.anthropic_api_key === 'string' && body.anthropic_api_key.length
    ? body.anthropic_api_key
    : existing?.anthropic_api_key ?? null
  const nextApify = typeof body.apify_api_key === 'string' && body.apify_api_key.length
    ? body.apify_api_key
    : existing?.apify_api_key ?? null

  const { error } = await supabase
    .from('user_api_keys')
    .upsert({
      user_id: user.id,
      anthropic_api_key: nextAnthropic,
      apify_api_key: nextApify,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
