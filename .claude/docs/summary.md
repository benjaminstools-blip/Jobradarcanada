# Job Canada — Project Summary

> Reference this when resuming the project. Verified against the codebase on 2026-08-13.

---

## What This App Is

Job Canada is a full-stack Next.js 16 web app for job seekers. Users upload a CV (PDF), the app
parses it with Claude, fetches live jobs from LinkedIn, Indeed, Eluta, and Workopolis via Apify,
scores each job against the user's profile, generates tailored cover letters and CVs, and tracks
applications on a Kanban board with an analytics dashboard.

It is a fork of an earlier Nigeria-targeted app (JobRadar). The pivot is complete on the source
side: the Jobberman scraper is gone, two Canadian boards were added, and the country selector
defaults to Canada, though every Indeed country remains selectable.

---

## Repo State

- **Path:** `/Users/Sketcho/Desktop/Job canada/job-canada`
- **Git:** initialized on `main`, **no commits yet**, no remote configured
- **Not deployed.** There is no Vercel project and no live URL for this fork.
- **Local dev:** http://localhost:3000

---

## Build Status

`npx tsc --noEmit` clean; `npx next build` passes. All 24 routes compile.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js **16.2.4** App Router (TypeScript) |
| Styling | Tailwind CSS **v4** (`@import "tailwindcss"` — no `tailwind.config.js`) |
| Fonts | **Syne** (headings) + **DM Sans** (body), Google Fonts `@import` in `globals.css` |
| Components | shadcn/ui (button, card, input, label, badge, tabs, progress, skeleton, sonner, dialog) |
| Data fetching | TanStack Query v5 |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | Recharts |
| Auth + DB + Storage | Supabase (`@supabase/ssr`) |
| AI | **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude Opus 5 |
| Job scraping | Apify client (`apify-client`) |
| PDF parsing | `pdf-parse` **v1.1.1** (CJS, required at runtime — NOT bundled) |
| Validation | Zod v4 |
| Toasts | Sonner |
| Icons | Lucide React |

---

## Critical Next.js 16 Breaking Changes

Not in standard training data. Read before touching framework-level code.

1. **`middleware.ts` is now `proxy.ts`** — the exported function is `proxy`, not `middleware`. `config.matcher` works the same.
2. **`cookies()` is async** — `await cookies()` everywhere.
3. **Tailwind v4** — config lives in `globals.css`. No `tailwind.config.ts`. Custom variants via `@custom-variant`; theme tokens in `@theme inline {}`.
4. **Route handler params are async** — dynamic params arrive as `Promise<{ id: string }>`; `await params`.
5. **`serverExternalPackages`** replaces `experimental.serverComponentsExternalPackages`.

`AGENTS.md` (aliased by `CLAUDE.md`) points at `node_modules/next/dist/docs/` for the authoritative guides.

---

## Claude Integration Rules

All Claude access goes through `lib/claude.ts`. These are non-negotiable — Claude Opus 5 rejects
several parameters that older models accepted.

- **Pinned model strings, never aliases.** `SCORING_MODEL` / `CV_PARSE_MODEL` / `GENERATION_MODEL` are all `claude-opus-5`. `PROMPT_VERSION` is exported alongside them.
- **No `temperature` / `top_p` / `top_k`.** Opus 5 returns a 400 for any of them. Steer via prompting.
- **Thinking is on by default and shares the `max_tokens` budget with the response text.** Size `max_tokens` well above the expected output or responses truncate mid-answer. Current values: 8192 (CV parse), 4096 (score), 8000/16000 (cover letter / tailored CV).
- **`output_config.effort`** replaces any notion of a thinking-token budget — `low` for parse/score, `medium` for generation.
- **Structured outputs** (`output_config.format` with a `json_schema`) are used for CV parse and scoring. Every response is still re-validated with Zod before any field is read.
- **`textOf(message)`** in `lib/claude.ts` concatenates text blocks. Never read `content[0].text` — thinking blocks come first in the union.
- **Check `stop_reason === 'refusal'`** before reading content.
- **Anti-hallucination clauses** are in both prompt builders in `lib/prompts.ts` and must stay — inventing a credential in a regulated field is a disqualifying error.

---

## API Key Model

Every user supplies their own Anthropic + Apify keys via Settings. The owner's env keys are a
fallback **only** for user IDs listed in `OWNER_USER_IDS`, so a random signup cannot drain the
owner's credits. All of that logic lives in `lib/keys.ts` (`resolveAnthropicKey`, `resolveApifyKey`,
`isOwner`) — routes never read the env vars directly.

Routes return `NO_ANTHROPIC_KEY` / `NO_APIFY_KEY` (status 400) when no key resolves; the client
renders `components/ApiKeysGate.tsx` in response.

---

## Design System

### Color Palette
| Color | Hex | Used for |
|-------|-----|----------|
| Page background | `#080D1A` | All page backgrounds (inline style, not Tailwind) |
| Card background | `#0D1424` | All cards (inline style) |
| Card border | `#1E2D3D` | Default card borders |
| Primary green | `#10B981` | CTAs, active states, high match score |
| Green gradient | `#10B981 → #34D399` | Logo, headings, primary buttons |
| Cyan | `#06B6D4` | Response Rate stat, funnel chart |
| Indigo | `#6366F1` | Avg Match stat, Save button, funnel chart |
| Amber | `#F59E0B` | Medium match score, Tech Interview column |
| Red | `#EF4444` | Low match score, Rejected column |

### Typography
Headings use Syne, body uses DM Sans — applied globally via `@layer base` in `globals.css`, plus
inline `fontFamily: 'Syne, sans-serif'` on key elements. Both fonts load via a Google Fonts
`@import` at the **top** of `globals.css`, before `@import "tailwindcss"`.

### CSS Utilities (`@layer utilities` in `globals.css`)
`.animate-fade-up`, `.animate-fade-in`, `.animate-scale-in`, `.animate-glow-pulse`,
`.animate-gradient-shift`, `.card-hover`, `.btn-glow`

### Key Patterns
- **Cards:** raw `div` with inline styles, not shadcn `Card` — needed for the left-border accent and full gradient control
- **Glass morphism:** `background: rgba(13,20,36,0.8)` + `backdropFilter: blur(24px)` — auth pages and nav
- **Left border accent:** `borderLeft: 3px solid ${accentColor}` on job cards, color driven by match score
- **Stagger animation:** wrap mapped items in `<div style={{ animationDelay: \`${index * 60}ms\` }}>` with `animate-fade-up` on the inner component
- **dnd-kit split div:** outer div takes dnd-kit's style/ref/attributes/listeners; inner div takes visual styles — otherwise the dnd transform overwrites the visual CSS

### Kanban Column Colours
| Status | Gradient |
|--------|----------|
| Saved | slate (#334155 → #1E293B) |
| Applied | blue (#1D4ED8 → #1E3A8A) |
| Screening | purple (#6D28D9 → #4C1D95) |
| Technical Interview | amber (#B45309 → #78350F) |
| Offer | emerald (#059669 → #064E3B) |
| Rejected | red (#991B1B → #7F1D1D) |

---

## File Structure

```
job-canada/
├── proxy.ts                        ← Auth guard (was middleware.ts in older Next.js)
├── next.config.ts                  ← serverExternalPackages: ["pdf-parse"]
├── AGENTS.md / CLAUDE.md           ← CLAUDE.md is just @AGENTS.md
├── supabase/schema.sql             ← Full DB schema + RLS (idempotent)
├── .env.local.example              ← Template (real values in .env.local, gitignored)
├── types/index.ts                  ← CVProfile, Job, Application, DashboardStats, DocumentType
├── lib/
│   ├── supabase/{server,client}.ts ← createClient() per context
│   ├── claude.ts                   ← createClaudeClient(key), pinned models, textOf()
│   ├── keys.ts                     ← resolveAnthropicKey / resolveApifyKey, owner allowlist
│   ├── prompts.ts                  ← buildCoverLetterPrompt, buildTailoredCvPrompt
│   ├── apify.ts                    ← createApifyClient(token), re-exports countries
│   ├── sources.ts                  ← SOURCES registry: actor, input builder, mapper, country gate
│   ├── countries.ts                ← INDEED_COUNTRIES, DEFAULT_COUNTRY='ca' (client-safe, no server deps)
│   └── utils.ts                    ← cn(), maskKey(), formatRelativeTime()
├── components/
│   ├── providers.tsx               ← TanStack QueryClientProvider
│   ├── ApiKeysGate.tsx             ← Shown when a required key is missing
│   ├── nav/TopNav.tsx
│   ├── cv/CVProfileCard.tsx
│   ├── jobs/{JobCard,MatchScoreBadge,GenerateDocsModal}.tsx
│   ├── tracker/{KanbanColumn,KanbanCard}.tsx
│   └── dashboard/{StatCard,FunnelChart}.tsx
└── app/
    ├── layout.tsx, page.tsx (→ /upload), globals.css
    ├── (auth)/{login,signup,forgot-password,reset-password}/page.tsx
    ├── auth/callback/route.ts      ← Email verification handler
    ├── (app)/{upload,jobs,tracker,dashboard,settings}/page.tsx
    └── api/
        ├── cv/upload/route.ts      ← POST: PDF → pdf-parse → Claude → cv_profiles
        ├── cv/profile/route.ts     ← GET
        ├── jobs/route.ts           ← GET list | DELETE clear all
        ├── jobs/fetch/route.ts     ← POST: start Apify runs, return run IDs
        ├── jobs/poll/route.ts      ← GET: poll runs, insert results when terminal
        ├── jobs/score/route.ts     ← POST: score ONE job, update match_score
        ├── jobs/[id]/generate/route.ts ← POST: cover letter or tailored CV
        ├── applications/route.ts, applications/[id]/route.ts
        ├── dashboard/stats/route.ts
        └── settings/keys/route.ts, settings/keys/test/route.ts
```

---

## Database Schema (Supabase)

RLS enabled on every table, policy `auth.uid() = user_id`.

| Table | Key columns |
|-------|-------------|
| `cv_profiles` | user_id (unique), full_name, current_job_title, years_of_experience, technical_skills (jsonb), professional_summary, raw_cv_text, cv_file_path |
| `jobs` | user_id, source (`linkedin` \| `indeed` \| `eluta` \| `workopolis`), job_title, company_name, location, job_description, apply_url, match_score (int) |
| `applications` | user_id, job_id (FK→jobs), status (Saved \| Applied \| Screening \| Technical Interview \| Offer \| Rejected), status_updated_at |
| `user_api_keys` | user_id (PK), **anthropic_api_key**, apify_api_key |
| `generated_documents` | user_id, job_id (FK→jobs), type (`cover_letter` \| `tailored_cv`), content, unique(user_id, job_id, type) |

Storage bucket: `cvs` (private), files at `cvs/{user_id}/cv.pdf`.

**The schema file is idempotent, with one destructive statement:** it deletes any leftover
`source = 'jobberman'` rows before tightening the `jobs_source_check` constraint. Those are stale
Nigeria listings the app no longer renders; re-running a search repopulates the feed.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=          # owner fallback only
APIFY_API_KEY=              # owner fallback only
OWNER_USER_IDS=             # comma-separated Supabase user IDs allowed the fallback
```

See `.env.local.example`. `.env.local` is gitignored.

---

## Key Architecture Decisions

### Apify polling pattern (Vercel free tier compatible)
Apify scrapes take 30–90 seconds; Vercel free-tier functions are killed at 10s. So:
- `/api/jobs/fetch` starts every applicable actor run concurrently and **immediately returns**
  `{ runs: { linkedin: 'id', … }, errors: [] }`
- The client polls `/api/jobs/poll?runs=linkedin:abc,indeed:def` every 3 seconds and waits on a
  single `done` flag. The `sourceId:runId` pair encoding means the query-string shape does not
  change when a board is added.
- A run counts as done at **any** terminal state, not just `SUCCEEDED` — one failing scraper must
  not block the ones that worked. Non-`SUCCEEDED` runs land in `errors` and their dataset is skipped,
  and the UI shows a partial-results warning naming the sources that did and didn't return.
- Sources that fail to *start* are in the fetch response's `errors`; the client merges those with
  the poll errors so a source that never launched still shows up in the warning.
- Client-side max wait: 40 polls × 3s = 2 minutes

### Match scoring
After a fetch, the client scores 3 jobs at a time against `/api/jobs/score` (one job per call), with
a 200ms pause between batches. Progress shows "Scoring 7 of 20 jobs…". The route sets
`maxDuration = 120` because Opus 5 thinks before answering.

### Document generation
`/api/jobs/[id]/generate` streams the response (`claude.messages.stream(...)` + `finalMessage()`) so
a long tailored CV can't hit the SDK's HTTP timeout. Results are cached in `generated_documents` and
returned with `cached: true` unless the client passes `refresh: true`.

### pdf-parse version lock
Must stay on **v1.1.1** — v2.x has a class-based API that breaks the `pdfParse(buffer)` call. Must
be listed in `serverExternalPackages`. Import as `const pdfParse = require('pdf-parse')` (CJS), and
the route needs `export const runtime = 'nodejs'`.

### Upload validation
`/api/cv/upload` checks the PDF **magic bytes** (`%PDF`), not the client-supplied MIME type, and
caps uploads at 5MB.

### CSS architecture
Tailwind classes for layout/spacing/color; inline `style={}` only for arbitrary gradients,
`backdrop-filter`, the `borderLeft` accent trick, and `WebkitTextFillColor` gradient text. Never use
shadcn `Card` where full border control is needed.

---

## Job Sources

`lib/sources.ts` is the registry — actor ID, input builder, output mapper, and country gate per
board. The fetch and poll routes iterate it, so **adding a board is one entry there** plus the
`JobSource` union in `types/index.ts` and the `jobs_source_check` constraint in `schema.sql`.

| Source | Actor | Runs when | Notes |
|--------|-------|-----------|-------|
| LinkedIn | `curious_coder/linkedin-jobs-scraper` | always | |
| Indeed | `borderline/indeed-scraper` | always | country code picks the localized domain |
| Eluta | `blackfalcondata/eluta-scraper` | country is `ca` | paid actor, ~$1.50 / 1,000 jobs |
| Workopolis | `shahidirfan/workopolis-job-scraper` | country is `ca` | |

Eluta and Workopolis index Canadian employers only, so `appliesTo` gates them to `country === 'ca'`
rather than spending credits to return Canadian jobs for a search elsewhere.

**Actor input field names are not consistent** and are the easiest thing to get silently wrong — a
bad input yields an empty run, not an error. Verified against each actor's published input schema:

- LinkedIn: `queries`, `location`, `limit`
- Indeed: `query`, `location`, `country`, `maxRows`
- Eluta: `query`, `location`, `country` (uppercase `CA`), `maxResults`, `includeDetails`
- Workopolis: `keyword`, `location`, `results_wanted`, `max_pages` — **snake_case**

Output mappers fall back through several plausible field spellings per source, because actors rename
fields between builds.

Users must visit every actor page on apify.com and click "Try for free" before the API accepts run
requests.

---

## Supabase Configuration

Local dev needs Site URL `http://localhost:3000` and redirect URL
`http://localhost:3000/auth/callback`. Add production equivalents when this fork is deployed.

---

## Features Built

- CV upload + Claude parsing, stored in `cv_profiles`
- Live job fetching from LinkedIn, Indeed, Eluta, and Workopolis via Apify, with per-country Indeed
  targeting and Canada-only gating for the two Canadian boards
- AI match scoring (0–100) per job
- Cover letter and tailored-CV generation per job, cached and regenerable
- Save / Apply buttons on job cards, feeding the tracker
- Kanban board with drag-and-drop across 6 status columns
- Clear Jobs button
- Dashboard with 3 stat cards + funnel chart
- Settings page for per-user Anthropic + Apify keys, with live key testing
- Auth: login, signup, forgot password, reset password, email verification

---

## Not Built Yet

- No commit history, no remote, no deployment
- README.md is still the untouched `create-next-app` boilerplate
- Realtime Supabase subscription on `applications` (dashboard polls every 30s instead)
- Canada-specific features beyond source selection — no NOC codes, no provincial filtering, no
  Canadian-format CV conventions in the prompts
- CV re-parse from the stored file (re-upload required)
- Search history / saved searches
- Mobile nav (hamburger for small screens)
- Upload and Settings pages were never included in the visual redesign

---

## Running Locally

```bash
cd "/Users/Sketcho/Desktop/Job canada/job-canada"

npm run dev          # → http://localhost:3000
npx tsc --noEmit     # type check
npm run build        # production build check
```
