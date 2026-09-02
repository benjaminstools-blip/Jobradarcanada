import { createClient } from '@/lib/supabase/server'
import { createClaudeClient, CV_PARSE_MODEL, textOf } from '@/lib/claude'
import { resolveAnthropicKey, NO_ANTHROPIC_KEY } from '@/lib/keys'
import { NOC_CODES, NOC_REFERENCE_LIST, isValidNocCode } from '@/lib/noc'
import { NextResponse } from 'next/server'
import { z } from 'zod'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export const runtime = 'nodejs'
export const maxDuration = 120

const ParsedCvSchema = z.object({
  full_name: z.string().nullable(),
  current_job_title: z.string().nullable(),
  years_of_experience: z.number().nullable(),
  technical_skills: z.array(z.string()).nullable(),
  professional_summary: z.string().nullable(),
  noc_code: z.string().nullable(),
})

// Mirrors ParsedCvSchema. Structured outputs require every property listed in
// `required` and `additionalProperties: false`, so nullable stands in for optional.
const CV_JSON_SCHEMA = {
  type: 'object',
  properties: {
    full_name: { type: ['string', 'null'] },
    current_job_title: { type: ['string', 'null'] },
    years_of_experience: { type: ['number', 'null'] },
    technical_skills: { type: ['array', 'null'], items: { type: 'string' } },
    professional_summary: { type: ['string', 'null'] },
    // Constrained to the 516 real NOC 2021 codes, so the model cannot emit a
    // code that does not exist. Still re-checked with isValidNocCode below.
    noc_code: { type: ['string', 'null'], enum: [...NOC_CODES, null] },
  },
  required: [
    'full_name',
    'current_job_title',
    'years_of_experience',
    'technical_skills',
    'professional_summary',
    'noc_code',
  ],
  additionalProperties: false,
} as const

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5MB.' }, { status: 400 })
  }

  // Upload PDF to Supabase Storage
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Validate magic bytes — client-supplied MIME type is not trustworthy
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }

  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(`${user.id}/cv.pdf`, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Storage error: ${uploadError.message}` }, { status: 500 })
  }

  // Extract text from PDF
  let rawCvText: string
  try {
    const parsed = await pdfParse(buffer)
    rawCvText = parsed.text
    if (!rawCvText?.trim()) {
      return NextResponse.json({
        error: 'Your CV appears to be a scanned image. Please upload a text-based PDF.',
      }, { status: 422 })
    }
  } catch {
    return NextResponse.json({
      error: 'Could not read your PDF. Make sure it\'s a standard text-based PDF.',
    }, { status: 422 })
  }

  // Fetch user's Anthropic key if set
  const { data: keysRow } = await supabase
    .from('user_api_keys')
    .select('anthropic_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  const anthropicKey = resolveAnthropicKey(user.id, keysRow?.anthropic_api_key)
  if (!anthropicKey) return NextResponse.json(NO_ANTHROPIC_KEY, { status: 400 })

  // Parse with Claude. Structured outputs constrain the response to the schema,
  // and Zod re-validates it before any field is read.
  let parsed: z.infer<typeof ParsedCvSchema>
  try {
    const claude = createClaudeClient(anthropicKey)
    // Thinking is on by default and shares the max_tokens budget with the
    // response, so this sits well above the size of the JSON itself.
    const message = await claude.messages.create({
      model: CV_PARSE_MODEL,
      max_tokens: 8192,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: CV_JSON_SCHEMA },
      },
      system:
        'You are a CV parser. Extract the requested fields from the CV text. ' +
        'Use null for any field the CV does not state — never invent a value. ' +
        'professional_summary is two sentences at most.\n\n' +
        'noc_code: pick the single NOC 2021 unit group that best matches the ' +
        "candidate's current or most recent occupation, choosing from the list " +
        'below. Match on the actual work performed, not on job-title wording — ' +
        'titles vary by employer while NOC groups do not. Use null if the CV ' +
        'does not establish an occupation clearly enough to choose, or if ' +
        'nothing in the list is a reasonable fit. A wrong code is worse than ' +
        'no code: employers and immigration programs check it.\n\n' +
        'NOC 2021 unit groups (code then title):\n' +
        NOC_REFERENCE_LIST,
      messages: [{ role: 'user', content: rawCvText }],
    })

    if (message.stop_reason === 'refusal') throw new Error('Model declined to parse')

    parsed = ParsedCvSchema.parse(JSON.parse(textOf(message)))

    // Second line of defence behind the schema enum. A code outside the real
    // 516 is dropped rather than stored — null is recoverable, a wrong NOC on
    // an immigration-facing profile is not.
    if (parsed.noc_code !== null && !isValidNocCode(parsed.noc_code)) {
      console.warn(`[cv/upload] discarded invalid NOC code: ${parsed.noc_code}`)
      parsed.noc_code = null
    }
  } catch (err) {
    console.error('[cv/upload] parse failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: "Couldn't parse your CV. Try again, or check your Anthropic API key in Settings.",
    }, { status: 500 })
  }

  // Upsert into cv_profiles
  const { data: profile, error: upsertError } = await supabase
    .from('cv_profiles')
    .upsert({
      user_id: user.id,
      full_name: parsed.full_name,
      current_job_title: parsed.current_job_title,
      years_of_experience: parsed.years_of_experience,
      technical_skills: parsed.technical_skills,
      professional_summary: parsed.professional_summary,
      noc_code: parsed.noc_code,
      raw_cv_text: rawCvText,
      cv_file_path: `${user.id}/cv.pdf`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (upsertError) {
    console.error('[cv/upload] upsert failed:', upsertError.message)
    return NextResponse.json({ error: 'Failed to save CV profile.' }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
