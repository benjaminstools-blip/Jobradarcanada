'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Loader2, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { JobCard } from '@/components/jobs/JobCard'
import { GenerateDocsModal } from '@/components/jobs/GenerateDocsModal'
import { ApiKeysGate } from '@/components/ApiKeysGate'
import { INDEED_COUNTRIES, DEFAULT_COUNTRY } from '@/lib/countries'
import { SOURCE_LABELS } from '@/lib/sources'
import type { Job, JobSource } from '@/types'

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
        const res = await fetch(`/api/jobs/poll?runs=${encodeURIComponent(runsParam)}`)
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

  const keysMissing =
    !apiKeys.isLoading && apiKeys.data && (!apiKeys.data.anthropic_set || !apiKeys.data.apify_set)

  if (keysMissing) {
    return (
      <div className="space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Job{' '}
            <span style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Feed
            </span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Search live jobs from LinkedIn, Indeed, Eluta &amp; Workopolis.</p>
        </div>
        <ApiKeysGate
          needsAnthropic={!apiKeys.data!.anthropic_set}
          needsApify={!apiKeys.data!.apify_set}
          reason="Fetching and scoring jobs needs your Anthropic + Apify keys."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
          Job{' '}
          <span style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Feed
          </span>
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Search live jobs from LinkedIn, Indeed, Eluta &amp; Workopolis.</p>
      </div>

      <div className="flex gap-2 flex-col sm:flex-row animate-fade-up" style={{ animationDelay: '60ms' }}>
        <Input
          placeholder="Job title (e.g. Product Manager)"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="text-white placeholder:text-slate-600 sm:max-w-xs border-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
          onKeyDown={(e) => e.key === 'Enter' && !fetching && handleFetch()}
        />
        <Input
          placeholder="City (e.g. Toronto) — optional"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="text-white placeholder:text-slate-600 sm:max-w-xs border-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
          onKeyDown={(e) => e.key === 'Enter' && !fetching && handleFetch()}
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label="Country"
          className="text-white sm:max-w-[11rem] px-3 h-9 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
        >
          {INDEED_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} style={{ background: '#0D1424', color: '#fff' }}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          onClick={handleFetch}
          disabled={fetching}
          className="btn-glow border-0 text-white font-semibold"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        >
          {fetching ? <Loader2 size={16} className="animate-spin mr-1" /> : <Search size={16} className="mr-1" />}
          Fetch Jobs
        </Button>
        {jobs.length > 0 && (
          <Button
            onClick={handleClear}
            disabled={clearing || fetching}
            variant="outline"
            className="border-red-800 text-red-400 hover:bg-red-950/30"
          >
            {clearing ? <Loader2 size={16} className="animate-spin mr-1" /> : <Trash2 size={16} className="mr-1" />}
            Clear Jobs
          </Button>
        )}
      </div>

      {fetching && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-slate-400 text-sm">{fetchStatus}</p>
          <Progress value={0} className="h-1 animate-pulse" style={{ background: 'rgba(16,185,129,0.15)' }} />
        </div>
      )}

      {partialWarning && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl px-4 py-3 text-amber-400 text-sm animate-fade-in">
          {partialWarning}
        </div>
      )}

      {scoringProgress && (
        <div className="space-y-1 animate-fade-in">
          <p className="text-slate-400 text-sm">
            Scoring {scoringProgress.done} of {scoringProgress.total} jobs…
          </p>
          <Progress
            value={(scoringProgress.done / scoringProgress.total) * 100}
            className="h-1"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          />
        </div>
      )}

      {!hasCvProfile.data && !hasCvProfile.isLoading && (
        <div className="text-center py-20 text-slate-600 text-sm animate-fade-in">
          Upload your CV first to fetch personalized jobs.
        </div>
      )}

      {hasCvProfile.data && jobs.length === 0 && !fetching && !isLoading && (
        <div className="text-center py-20 text-slate-600 text-sm animate-fade-in">
          Search for a role and location above to see live jobs.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedJobs.map((job, index) => (
            <div key={job.id} style={{ animationDelay: `${index * 60}ms` }}>
              <JobCard
                job={job}
                scoreLoading={scoringIds.has(job.id)}
                onApply={handleApply}
                onSave={handleSave}
                onGenerateDocs={handleGenerateDocs}
              />
            </div>
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
