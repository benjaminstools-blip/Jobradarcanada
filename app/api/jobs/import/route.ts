import { createClient } from '@/lib/supabase/server'
import { createClaudeClient, CV_PARSE_MODEL, textOf } from '@/lib/claude'
import { resolveAnthropicKey, NO_ANTHROPIC_KEY } from '@/lib/keys'
import { parseProvince } from '@/lib/provinces'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export const runtime = 'nodejs'
export const maxDuration = 60

const FETCH_TIMEOUT_MS = 15_000
const MAX_HTML_BYTES = 3 * 1024 * 1024
/** Below this the page is a login wall, a challenge, or an empty shell. */
const MIN_WORDS = 120
/** Cap what reaches Claude — job pages carry nav, footers, and related listings. */
const MAX_TEXT_CHARS = 24_000

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const CHALLENGE_RE =
  /security check|enable javascript|just a moment|captcha|verify you are human|unusual traffic|access denied/i

// ─── SSRF guard ──────────────────────────────────────────────────────────────
// The URL is user-supplied and fetched by the server. Without this the route is
// a proxy for probing anything the server can reach — the Supabase host, cloud
// metadata at 169.254.169.254, or services on localhost.

function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::') return true
    if (v.startsWith('fc') || v.startsWith('fd')) return true // unique-local
    if (v.startsWith('fe80')) return true // link-local
    // IPv4-mapped (::ffff:10.0.0.1) — re-check the embedded address.
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isBlockedAddress(mapped[1])
    return false
  }

  const [a, b] = ip.split('.').map(Number)
  if (a === 127 || a === 0 || a === 10) return true
  if (a === 169 && b === 254) return true // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
  if (a >= 224) return true // multicast + reserved
  return false
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('That does not look like a web address.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https links are supported.')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')

  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new Error('That address is not reachable.')
    return url
  }

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('That address is not reachable.')
  }

  // Resolve before fetching so a hostname pointing at a private range is caught.
  let resolved: { address: string }[]
  try {
    resolved = await lookup(host, { all: true })
  } catch {
    throw new Error('Could not resolve that address.')
  }
  if (resolved.length === 0 || resolved.some((r) => isBlockedAddress(r.address))) {
    throw new Error('That address is not reachable.')
  }

  return url
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/** jobLocation is a nested Place/PostalAddress object. Flatten it to
 *  "City, REGION" rather than passing raw JSON through to the model — an
 *  empty addressLocality is common, so drop blank parts. */
function readJobLocation(value: unknown): string | null {
  const places = Array.isArray(value) ? value : [value]
  for (const place of places) {
    const addr = (place as Record<string, unknown> | null)?.address as
      | Record<string, unknown>
      | undefined
    if (!addr) continue
    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    if (parts.length > 0) return parts.join(', ')
  }
  return null
}

/** Prefer a JSON-LD JobPosting block — it is the publisher's own structured
 *  description, without nav and footer noise. */
function fromJsonLd(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const [, body] of blocks) {
    try {
      const parsed: unknown = JSON.parse(body.trim())
      const nodes = Array.isArray(parsed) ? parsed : [parsed]
      for (const node of nodes) {
        const n = node as Record<string, unknown>
        const graph = Array.isArray(n['@graph']) ? (n['@graph'] as Record<string, unknown>[]) : [n]
        for (const g of graph) {
          if (g['@type'] !== 'JobPosting') continue
          const parts = [
            g.title,
            (g.hiringOrganization as Record<string, unknown> | undefined)?.name,
            readJobLocation(g.jobLocation),
            g.description,
          ]
          const joined = parts.filter((p) => typeof p === 'string' || typeof p === 'number').join('\n')
          if (joined.trim()) return stripTags(String(joined))
        }
      }
    } catch {
      // A malformed block is not a reason to abandon the page.
    }
  }
  return null
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Structuring ─────────────────────────────────────────────────────────────

const StructuredJobSchema = z.object({
  job_title: z.string().nullable(),
  company_name: z.string().nullable(),
  location: z.string().nullable(),
  job_description: z.string().nullable(),
})

// Nullable fields are `type: ['string','null']` with NO enum — an enum under a
// nullable union type is rejected outright by the API and 400s the request.
const JOB_JSON_SCHEMA = {
  type: 'object',
  properties: {
    job_title: { type: ['string', 'null'] },
    company_name: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    job_description: { type: ['string', 'null'] },
  },
  required: ['job_title', 'company_name', 'location', 'job_description'],
  additionalProperties: false,
} as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const rawUrl: unknown = body.url
  const pastedText: unknown = body.pastedText

  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return NextResponse.json({ error: 'Paste a job link first.' }, { status: 400 })
  }

  let url: URL
  try {
    url = await assertPublicUrl(rawUrl.trim())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'That link cannot be used.' },
      { status: 400 }
    )
  }

  // ── Get the text, either from the user's paste or by fetching the page ──
  let sourceText: string

  if (typeof pastedText === 'string' && pastedText.trim().split(/\s+/).length >= 40) {
    sourceText = pastedText.trim().slice(0, MAX_TEXT_CHARS)
  } else {
    let html = ''
    let ok = false
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      ok = res.ok
      if (ok) {
        const buf = await res.arrayBuffer()
        html = Buffer.from(buf.slice(0, MAX_HTML_BYTES)).toString('utf8')
      }
    } catch {
      ok = false
    }

    const extracted = ok ? (fromJsonLd(html) ?? stripTags(html)) : ''
    const words = extracted ? extracted.split(/\s+/).length : 0
    const blocked = !ok || words < MIN_WORDS || CHALLENGE_RE.test(extracted.slice(0, 1200))

    if (blocked) {
      // Expected for Indeed and LinkedIn — not an error. The client reveals a
      // textarea and resubmits with pastedText.
      return NextResponse.json({
        needsPaste: true,
        reason: `${url.hostname} blocks automated reading. Copy the job description from the page and paste it below.`,
      })
    }

    sourceText = extracted.slice(0, MAX_TEXT_CHARS)
  }

  // ── Structure it ──
  const { data: keysRow } = await supabase
    .from('user_api_keys')
    .select('anthropic_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  const anthropicKey = resolveAnthropicKey(user.id, keysRow?.anthropic_api_key)
  if (!anthropicKey) return NextResponse.json(NO_ANTHROPIC_KEY, { status: 400 })

  let parsed: z.infer<typeof StructuredJobSchema>
  try {
    const claude = createClaudeClient(anthropicKey)
    const message = await claude.messages.create({
      model: CV_PARSE_MODEL,
      max_tokens: 8192,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: JOB_JSON_SCHEMA },
      },
      system:
        'You extract a job posting from the text of a web page. Return only what ' +
        'the text states — never infer or invent a company, location, or title. ' +
        'Use null for anything the text does not establish. job_description is ' +
        'the posting itself (responsibilities, requirements, qualifications) with ' +
        'site navigation, cookie notices, and unrelated job listings removed. ' +
        'Keep the description substantially intact; do not summarise it, because ' +
        'it is what a tailored CV and cover letter are written against.',
      messages: [{ role: 'user', content: sourceText }],
    })

    if (message.stop_reason === 'refusal') throw new Error('Model declined to parse')
    parsed = StructuredJobSchema.parse(JSON.parse(textOf(message)))
  } catch (err) {
    console.error('[jobs/import] parse failed:', err instanceof Error ? err.message : err)
    const status = (err as { status?: number } | null)?.status
    return NextResponse.json({
      error: status === 401 || status === 403
        ? 'Your Anthropic API key was rejected. Check it in Settings.'
        : "Couldn't read that posting. Try pasting the job description instead.",
    }, { status: 500 })
  }

  if (!parsed.job_title) {
    return NextResponse.json({
      needsPaste: true,
      reason: 'No job title found on that page. Paste the job description instead.',
    })
  }

  const { data: job, error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      source: 'manual',
      job_title: parsed.job_title,
      company_name: parsed.company_name,
      location: parsed.location,
      province: parseProvince(parsed.location),
      job_description: parsed.job_description,
      apply_url: url.toString(),
    })
    .select()
    .single()

  if (insertError) {
    console.error('[jobs/import] insert:', insertError.message)
    return NextResponse.json({ error: 'Failed to save that job.' }, { status: 500 })
  }

  return NextResponse.json({ job })
}
