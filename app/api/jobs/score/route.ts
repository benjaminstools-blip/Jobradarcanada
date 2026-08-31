import { createClient } from '@/lib/supabase/server'
import { createClaudeClient, SCORING_MODEL, textOf } from '@/lib/claude'
import { resolveAnthropicKey, NO_ANTHROPIC_KEY } from '@/lib/keys'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const maxDuration = 120

const ScoreSchema = z.object({ score: z.number().int().min(0).max(100) })

const SCORE_JSON_SCHEMA = {
  type: 'object',
  properties: { score: { type: 'integer' } },
  required: ['score'],
  additionalProperties: false,
} as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { job_id } = await request.json()
  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  const [{ data: job }, { data: profile }, { data: keysRow }] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', job_id).eq('user_id', user.id).single(),
    supabase.from('cv_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_api_keys').select('anthropic_api_key').eq('user_id', user.id).maybeSingle(),
  ])

  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (!profile) return NextResponse.json({ score: null, reason: 'No CV profile — upload your CV first.' })

  const anthropicKey = resolveAnthropicKey(user.id, keysRow?.anthropic_api_key)
  if (!anthropicKey) return NextResponse.json(NO_ANTHROPIC_KEY, { status: 400 })

  const profileText = JSON.stringify({
    full_name: profile.full_name,
    current_job_title: profile.current_job_title,
    years_of_experience: profile.years_of_experience,
    technical_skills: profile.technical_skills,
    professional_summary: profile.professional_summary,
  })

  let score: number | null = null

  try {
    const claude = createClaudeClient(anthropicKey)
    // Thinking shares the max_tokens budget with the response, so this is far
    // larger than the one-key JSON object it has to emit.
    const message = await claude.messages.create({
      model: SCORING_MODEL,
      max_tokens: 4096,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCORE_JSON_SCHEMA },
      },
      system:
        'You are a recruitment assistant for the Canadian job market. Given the ' +
        'candidate profile and the job description, return a match score as an ' +
        'integer from 0 to 100.\n' +
        'Score on skills overlap, seniority fit, and how well the stated ' +
        'locations line up (same city > same province > remote-friendly > ' +
        'requires relocation).\n' +
        'Never adjust the score based on the candidate\'s name, nationality, ' +
        'where they were educated, or any inference about their immigration or ' +
        'work-authorization status. None of that is in evidence, and weighting ' +
        'it would be discriminatory.',
      messages: [
        {
          role: 'user',
          content: `Profile: ${profileText}\n\nJob: ${job.job_description ?? job.job_title}`,
        },
      ],
    })

    if (message.stop_reason !== 'refusal') {
      score = ScoreSchema.parse(JSON.parse(textOf(message))).score
    }
  } catch (err) {
    console.error('[jobs/score]', err instanceof Error ? err.message : err)
  }

  if (score !== null) {
    await supabase.from('jobs').update({ match_score: score }).eq('id', job_id)
  }

  return NextResponse.json({ score })
}
