'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { JobCard } from '@/components/jobs/JobCard'
import { GenerateDocsModal } from '@/components/jobs/GenerateDocsModal'
import { ApiKeysGate } from '@/components/ApiKeysGate'
import { INDEED_COUNTRIES, DEFAULT_COUNTRY } from '@/lib/countries'
import { SOURCE_LABELS } from '@/lib/sources'
import { PROVINCES, provinceName } from '@/lib/provinces'
import type { Job, JobSource } from '@/types'
import type { ProvinceCode } from '@/lib/provinces'

export default function JobsPage() {
  const queryClient = useQueryClient()
  const [jobTitle, setJobTitle] = useState('')
  const [location, setLocation] = useState('')
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [fetching, setFetching] = useState(false)
  const [fetchStatus, setFetchStatus] = useState('')
  const [scoringProgress, setScoringProgress] = useState<{ done: number; total: number } | null>(null)
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set())
  const [partialWarning, setPartialWarning] = useState('')
  const [clearing, setClearing] = useState(false)
  const [generateDocsJob, setGenerateDocsJob] = useState<Job | null>(null)
  const [provinceFilter, setProvinceFilter] = useState<ProvinceCode | 'all' | 'none'>('all')

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await fetch('/api/jobs')
      if (!res.ok) throw new Error('Failed to load jobs')
      const json = await res.json()
      return json.jobs ?? []
    },
  })

  const hasCvProfile = useQuery({
    queryKey: ['cv-profile'],
    queryFn: async () => {
      const res = await fetch('/api/cv/profile')
      const json = await res.json()
      return json.profile
    },
  })

  const apiKeys = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/settings/keys')
      const json = await res.json()
      return json.keys as { anthropic_set: boolean; apify_set: boolean }
    },
  })

  async function scoreJobsBatched(jobsToScore: Job[]) {
    const unscored = jobsToScore.filter((j) => j.match_score === null)
    if (unscored.length === 0) return

    setScoringProgress({ done: 0, total: unscored.length })
    setScoringIds(new Set(unscored.map((j) => j.id)))

    let done = 0
    const concurrency = 3

    async function scoreOne(job: Job) {
      try {
        await fetch('/api/jobs/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: job.id }),
        })
      } catch { /* ignore individual failures */ }
      done++
      setScoringProgress({ done, total: unscored.length })
      setScoringIds((prev) => {
        const next = new Set(prev)
        next.delete(job.id)
        return next
      })
    }

    for (let i = 0; i < unscored.length; i += concurrency) {
      const batch = unscored.slice(i, i + concurrency)
      await Promise.all(batch.map(scoreOne))
      await new Promise((r) => setTimeout(r, 200))
    }

    setScoringProgress(null)
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
  }

  async function handleFetch() {
    if (!jobTitle.trim()) {
      toast.error('Please enter a job title.')
      return
    }
    if (!hasCvProfile.data) {
      toast.error('Upload your CV first to fetch personalized jobs.')
      return
    }

    setFetching(true)
    setFetchStatus('Starting job search…')
    setPartialWarning('')

    let started: { runs: Record<string, string>; errors: string[] }

    try {
      const res = await fetch('/api/jobs/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, location, country }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to start job search.')
        setFetching(false)
        return
      }
      started = json
    } catch {
      toast.error('Network error. Please try again.')
      setFetching(false)
      return
    }

    const requested = Object.keys(started.runs)
    const label = (id: string) => SOURCE_LABELS[id as JobSource] ?? id

    // Client-side polling — works on Vercel free tier
    setFetchStatus(
      `Searching ${requested.map(label).join(', ')}… (this takes 30–90 seconds)`
    )

    // Sources that never started count as failures from the outset.
    let failed: string[] = started.errors ?? []
    const runsParam = requested.map((id) => `${id}:${started.runs[id]}`).join(',')

    let attempts = 0
    const maxAttempts = 40 // 40 × 3s = 2 min max

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 3000))
      attempts++

      try {
        const res = await fetch(
          `/api/jobs/poll?runs=${encodeURIComponent(runsParam)}&country=${encodeURIComponent(country)}`
        )
        const status = await res.json()

        if (status.done) {
          failed = [...new Set([...failed, ...(status.errors ?? [])])]
          const succeeded = requested.filter((s) => !failed.includes(s))

          if (failed.length > 0 && succeeded.length > 0) {
            setPartialWarning(
              `Showing results from ${succeeded.map(label).join(', ')} only — ` +
              `${failed.map(label).join(', ')} fetch failed.`
            )
          }
          break
        }
      } catch { /* keep polling */ }
    }

    setFetching(false)
    setFetchStatus('')
    await queryClient.invalidateQueries({ queryKey: ['jobs'] })

    // Start scoring
    const freshJobs = await queryClient.fetchQuery<Job[]>({
      queryKey: ['jobs'],
      queryFn: async () => {
        const res = await fetch('/api/jobs')
        const json = await res.json()
        return json.jobs ?? []
      },
    })

    if (freshJobs?.length) {
      scoreJobsBatched(freshJobs)
    }
  }

  async function handleClear() {
    if (!confirm('Clear all fetched jobs? This cannot be undone.')) return
    setClearing(true)
    try {
      const res = await fetch('/api/jobs', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      queryClient.setQueryData(['jobs'], [])
      toast.success('All jobs cleared.')
    } catch {
      toast.error('Failed to clear jobs.')
    } finally {
      setClearing(false)
    }
  }

  async function handleApply(job: Job) {
    if (job.apply_url) {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer')
    }
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? 'Failed to save to tracker.')
        return
      }
      toast.success('Added to tracker.')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    } catch {
      toast.error('Network error. Could not save to tracker.')
    }
  }

  function handleGenerateDocs(job: Job) {
    setGenerateDocsJob(job)
  }

  async function handleSave(job: Job) {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, status: 'Saved' }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? 'Failed to save to tracker.')
        return
      }
      toast.success('Saved to tracker.')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    } catch {
      toast.error('Network error. Could not save to tracker.')
    }
  }

  const sortedJobs = [...jobs].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1))

  // Only provinces actually present in the current feed get a chip — an empty
  // row of 13 is noise. Ordered by PROVINCES so the row is stable between fetches.
  const provinceCounts = new Map<ProvinceCode, number>()
  let noProvinceCount = 0
  for (const job of sortedJobs) {
    if (job.province) provinceCounts.set(job.province, (provinceCounts.get(job.province) ?? 0) + 1)
    else noProvinceCount++
  }
  const presentProvinces = PROVINCES.filter((p) => provinceCounts.has(p.code))
  const showProvinceFilter = presentProvinces.length > 0

  const visibleJobs =
    provinceFilter === 'all'
      ? sortedJobs
      : provinceFilter === 'none'
        ? sortedJobs.filter((j) => !j.province)
        : sortedJobs.filter((j) => j.province === provinceFilter)

  const keysMissing =
    !apiKeys.isLoading && apiKeys.data && (!apiKeys.data.anthropic_set || !apiKeys.data.apify_set)

  if (keysMissing) {
    return (
      <div className="stagger-in">
        <PageMasthead />
        <div className="mt-10">
          <ApiKeysGate
            needsAnthropic={!apiKeys.data!.anthropic_set}
            needsApify={!apiKeys.data!.apify_set}
            reason="Fetching and scoring jobs needs your Anthropic and Apify keys."
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="stagger-in">
        <PageMasthead />

        {/* Search bar — a ruled instrument panel, not floating inputs. */}
        <section className="mt-10 border-y border-rule-strong">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] divide-y md:divide-y-0 md:divide-x divide-rule">
            <Field label="Role">
              <input
                placeholder="Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !fetching && handleFetch()}
                className="w-full bg-transparent text-ink placeholder:text-ink-faint/60 text-lg outline-none"
              />
            </Field>
            <Field label="City">
              <input
                placeholder="Toronto — optional"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !fetching && handleFetch()}
                className="w-full bg-transparent text-ink placeholder:text-ink-faint/60 text-lg outline-none"
              />
            </Field>
            <Field label="Country">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Country"
                className="w-full md:w-44 bg-transparent text-ink text-lg outline-none cursor-pointer"
              >
                {INDEED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="flex items-center gap-6 mt-5">
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="px-7 py-3 text-xs font-medium tracking-widest uppercase bg-vermilion text-paper-raised hover:bg-vermilion-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {fetching ? 'Searching' : 'Search'}
          </button>
          {jobs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing || fetching}
              className="field-label hover:text-clay disabled:opacity-40 transition-colors duration-150"
            >
              {clearing ? 'Clearing' : 'Clear all'}
            </button>
          )}
          <span className="ml-auto font-mono text-xs text-ink-faint tabular-nums">
            {jobs.length} {jobs.length === 1 ? 'listing' : 'listings'}
          </span>
        </div>

        {fetching && <StatusLine text={fetchStatus} />}

        {scoringProgress && (
          <StatusLine
            text={`Scoring ${scoringProgress.done} of ${scoringProgress.total}`}
            ratio={scoringProgress.done / scoringProgress.total}
          />
        )}

        {partialWarning && (
          <p className="mt-5 border-l-2 border-ochre pl-4 py-1 text-sm text-ink-soft animate-fade-in">
            {partialWarning}
          </p>
        )}

        {showProvinceFilter && !isLoading && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 pb-4 border-b border-rule">
            <span className="field-label">Province</span>
            <ProvinceChip
              label="All"
              count={sortedJobs.length}
              active={provinceFilter === 'all'}
              onClick={() => setProvinceFilter('all')}
            />
            {presentProvinces.map((p) => (
              <ProvinceChip
                key={p.code}
                label={p.code}
                title={provinceName(p.code)}
                count={provinceCounts.get(p.code) ?? 0}
                active={provinceFilter === p.code}
                onClick={() => setProvinceFilter(p.code)}
              />
            ))}
            {noProvinceCount > 0 && (
              <ProvinceChip
                label="Other"
                title="Remote, nationwide, or no province named"
                count={noProvinceCount}
                active={provinceFilter === 'none'}
                onClick={() => setProvinceFilter('none')}
              />
            )}
          </div>
        )}
      </div>

      {!hasCvProfile.data && !hasCvProfile.isLoading && (
        <EmptyState
          heading="No CV on file"
          body="Upload your CV first — jobs are scored against it."
        />
      )}

      {hasCvProfile.data && jobs.length === 0 && !fetching && !isLoading && (
        <EmptyState
          heading="Nothing fetched yet"
          body="Name a role above and search. Results arrive in 30 to 90 seconds."
        />
      )}

      {isLoading ? (
        <div className="mt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-b border-rule py-6 pl-5 flex gap-6">
              <div className="w-16 h-8 bg-paper-deep animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-3 w-24 bg-paper-deep animate-pulse" />
                <div className="h-6 w-2/3 bg-paper-deep animate-pulse" />
                <div className="h-3 w-1/3 bg-paper-deep animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 border-t border-rule">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              scoreLoading={scoringIds.has(job.id)}
              onApply={handleApply}
              onSave={handleSave}
              onGenerateDocs={handleGenerateDocs}
            />
          ))}
        </div>
      )}

      {generateDocsJob && (
        <GenerateDocsModal
          job={generateDocsJob}
          open={true}
          onOpenChange={(open) => { if (!open) setGenerateDocsJob(null) }}
        />
      )}
    </div>
  )
}

function PageMasthead() {
  return (
    <header>
      <p className="field-label">Live listings</p>
      <h1 className="display-title mt-3">
        Job <span className="italic text-vermilion">Feed</span>
      </h1>
      <div className="title-rule mt-5" />
      <p className="text-ink-soft mt-4 max-w-xl text-[1.0625rem] leading-relaxed">
        Live postings from LinkedIn, Indeed, Eluta and Workopolis, scored against
        your CV.
      </p>
    </header>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block px-5 py-4 cursor-text">
      <span className="field-label block mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function StatusLine({ text, ratio }: { text: string; ratio?: number }) {
  return (
    <div className="mt-5 animate-fade-in">
      <p className="font-mono text-xs text-ink-soft tabular-nums">{text}</p>
      <div className="h-[2px] bg-rule mt-2 overflow-hidden">
        <div
          className={ratio === undefined ? 'h-full w-1/3 bg-vermilion animate-pulse' : 'h-full bg-vermilion transition-[width] duration-300'}
          style={ratio === undefined ? undefined : { width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="py-24 text-center animate-fade-in">
      <h2 className="font-display text-3xl text-ink">{heading}</h2>
      <p className="text-ink-faint text-sm mt-2">{body}</p>
    </div>
  )
}

function ProvinceChip({
  label,
  title,
  count,
  active,
  onClick,
}: {
  label: string
  title?: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`group flex items-baseline gap-1.5 pb-1 border-b-2 transition-colors duration-150 ${
        active
          ? 'border-vermilion text-ink'
          : 'border-transparent text-ink-faint hover:text-ink hover:border-rule-strong'
      }`}
    >
      <span className="font-mono text-xs font-medium">{label}</span>
      <span className="font-mono text-[0.625rem] tabular-nums opacity-60">{count}</span>
    </button>
  )
}
