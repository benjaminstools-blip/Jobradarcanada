import { createClient } from '@/lib/supabase/server'
import { createClaudeClient, GENERATION_MODEL, textOf } from '@/lib/claude'
import { resolveAnthropicKey, NO_ANTHROPIC_KEY } from '@/lib/keys'
import { buildCoverLetterPrompt, buildTailoredCvPrompt } from '@/lib/prompts'
import { NextResponse } from 'next/server'
import type { DocumentType } from '@/types'

export const maxDuration = 120

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const type: DocumentType = body.type
  const refresh: boolean = body.refresh === true

  if (type !== 'cover_letter' && type !== 'tailored_cv') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const [{ data: job }, { data: profile }, { data: keysRow }, { data: existing }] =
    await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('cv_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_api_keys').select('anthropic_api_key').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('generated_documents')
        .select('content')
        .eq('job_id', id)
        .eq('user_id', user.id)
        .eq('type', type)
        .maybeSingle(),
    ])

  if (existing && !refresh) return NextResponse.json({ document: existing.content, cached: true })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (!profile) return NextResponse.json({ error: 'Upload your CV first' }, { status: 400 })

  const anthropicKey = resolveAnthropicKey(user.id, keysRow?.anthropic_api_key)
  if (!anthropicKey) return NextResponse.json(NO_ANTHROPIC_KEY, { status: 400 })

  const prompt = type === 'cover_letter'
    ? buildCoverLetterPrompt(profile, job, profile.raw_cv_text ?? undefined)
    : buildTailoredCvPrompt(profile, job)

  // Thinking is on by default on Opus 5 and shares the max_tokens budget with
  // the response, so this is sized well above the document length itself.
  const maxTokens = type === 'tailored_cv' ? 16000 : 8000

  let content: string
  try {
    const claude = createClaudeClient(anthropicKey)
    // Streamed so a long tailored CV can't hit the SDK's HTTP timeout.
    const stream = claude.messages.stream({
      model: GENERATION_MODEL,
      max_tokens: maxTokens,
      output_config: { effort: 'medium' },
      system: prompt.system,
      messages: prompt.messages,
    })
    const message = await stream.finalMessage()

    if (message.stop_reason === 'refusal') {
      return NextResponse.json({
        error: 'The model declined to generate this document.',
      }, { status: 502 })
    }

    content = textOf(message).trim()
  } catch (err) {
    console.error('[jobs/generate]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  if (!content) return NextResponse.json({ error: 'Generation failed' }, { status: 500 })

  await supabase.from('generated_documents').upsert(
    { user_id: user.id, job_id: id, type, content },
    { onConflict: 'user_id, job_id, type' }
  )

  return NextResponse.json({ document: content, cached: false })
}
