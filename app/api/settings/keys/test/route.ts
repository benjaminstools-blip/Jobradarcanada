import { createClient } from '@/lib/supabase/server'
import { createClaudeClient } from '@/lib/claude'
import { createApifyClient } from '@/lib/apify'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { service, key: providedKey, stored } = await request.json()

  // When the client asks to test the stored key, it never received the raw
  // value — look it up server-side by user_id instead.
  let key = providedKey
  if (stored && (typeof key !== 'string' || !key.length)) {
    const column = service === 'anthropic' ? 'anthropic_api_key' : 'apify_api_key'
    const { data } = await supabase
      .from('user_api_keys')
      .select(column)
      .eq('user_id', user.id)
      .maybeSingle()
    key = (data as Record<string, string | null> | null)?.[column] ?? null
  }

  if (typeof key !== 'string' || key.length < 8) {
    return NextResponse.json({ success: false, error: 'Invalid key format.' }, { status: 400 })
  }

  if (service === 'anthropic') {
    if (!key.startsWith('sk-ant-')) {
      return NextResponse.json({ success: false, error: 'Anthropic keys must start with sk-ant-.' })
    }
    try {
      const claude = createClaudeClient(key)
      // Cheapest possible auth check — the Models API bills no tokens.
      await claude.models.list({ limit: 1 })
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[keys/test] anthropic:', err instanceof Error ? err.message : err)
      return NextResponse.json({ success: false, error: 'Anthropic API key is invalid.' })
    }
  }

  if (service === 'apify') {
    if (!key.startsWith('apify_api_')) {
      return NextResponse.json({ success: false, error: 'Apify keys must start with apify_api_.' })
    }
    try {
      const apify = createApifyClient(key)
      await apify.user().get()
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[keys/test] apify:', err instanceof Error ? err.message : err)
      return NextResponse.json({ success: false, error: 'Apify API key is invalid.' })
    }
  }

  return NextResponse.json({ error: 'Unknown service.' }, { status: 400 })
}
