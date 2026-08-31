# Job Canada

AI job-search assistant for the Canadian market. Upload a CV, get live postings from LinkedIn,
Indeed, Eluta, and Workopolis scored against your profile, and generate a tailored resume and cover
letter per job — all tracked on a Kanban board.

Built with Next.js 16 (App Router), Supabase, Claude, and Apify.

## How it works

1. **Upload** a PDF CV. `pdf-parse` extracts the text, Claude structures it into a profile.
2. **Search** by job title, city, and country. Apify actors scrape each applicable board in the
   background; the client polls until every run reaches a terminal state. Eluta and Workopolis only
   run when the country is Canada — they index Canadian employers, so firing them for a search
   elsewhere would spend credits to return the wrong jobs.
3. **Score** — each job is rated 0–100 against your profile, three at a time.
4. **Generate** a cover letter or ATS-tailored resume for any job, following Canadian resume
   conventions. Results are cached per job.
5. **Track** applications across six Kanban stages, with a funnel chart on the dashboard.

## Setup

Requires Node 20+ and a Supabase project.

```bash
npm install
cp .env.local.example .env.local   # then fill it in
```

### Database

Run `supabase/schema.sql` in the Supabase SQL editor. It creates five tables with row-level
security, plus the private `cvs` storage bucket.

The file is idempotent and safe to re-run, **with one exception**: it deletes any rows left over
from the removed Jobberman scraper (`delete from jobs where source = 'jobberman'`) so it can tighten
the `jobs_source_check` constraint. On an existing database, check before applying:

```sql
select count(*) from jobs where source = 'jobberman';
```

### Auth

In Supabase → Authentication → URL Configuration, set the Site URL to `http://localhost:3000` and
add `http://localhost:3000/auth/callback` as a redirect URL.

### API keys

Every user supplies their own Anthropic and Apify keys in Settings. The keys in `.env.local` are a
fallback **only** for the Supabase user IDs listed in `OWNER_USER_IDS` — this is what stops a random
signup from spending the owner's credits. Leave `OWNER_USER_IDS` empty and everyone must bring
their own.

Apify additionally requires each user to open every actor page and click "Try for free" once before
the API will accept run requests:

- `curious_coder/linkedin-jobs-scraper`
- `borderline/indeed-scraper`
- `blackfalcondata/eluta-scraper` (Canada only)
- `shahidirfan/workopolis-job-scraper` (Canada only)

Note that `blackfalcondata/eluta-scraper` is a paid actor (~$1.50 per 1,000 jobs) on top of Apify
platform usage.

## Development

```bash
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type check
npm run build        # production build
npm run lint
```

## Notes for contributors

This is **Next.js 16** — `middleware.ts` is now `proxy.ts`, `cookies()` is async, route params
arrive as a `Promise`, and Tailwind v4 config lives in `app/globals.css` rather than a
`tailwind.config.js`. See `AGENTS.md`.

Adding a job board means adding one entry to `SOURCES` in `lib/sources.ts` — actor ID, an input
builder, and a field mapper — plus the source name in the `jobs_source_check` constraint and the
`JobSource` union. The fetch and poll routes iterate the registry and need no change. Actor input
field names are not consistent between actors (Eluta takes `query`/`maxResults`, Workopolis takes
`keyword`/`results_wanted`), so read the actor's input schema rather than copying a neighbour.

Claude runs on `claude-opus-5`, which rejects `temperature` / `top_p` / `top_k` outright and thinks
by default — thinking shares the `max_tokens` budget with the response, so budgets are sized well
above the visible output. All model access goes through `lib/claude.ts`; never call the SDK
directly from a route.

Fuller architecture notes are in `.claude/docs/summary.md`.
