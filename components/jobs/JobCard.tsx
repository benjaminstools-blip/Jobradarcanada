'use client'

import { useState } from 'react'
import { MatchScoreBadge } from './MatchScoreBadge'
import type { Job } from '@/types'

interface Props {
  job: Job
  scoreLoading?: boolean
  onApply: (job: Job) => void
  onSave: (job: Job) => void
  onGenerateDocs: (job: Job) => void
}

const SOURCE_LABEL: Record<Job['source'], string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  eluta: 'Eluta',
  workopolis: 'Workopolis',
}

export function JobCard({ job, scoreLoading, onApply, onSave, onGenerateDocs }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Only a strong match earns the edge. If every row is marked, none is.
  const flagged = job.match_score !== null && job.match_score >= 75

  return (
    <article
      className="row-hover group relative border-b border-rule bg-paper"
      style={flagged ? { boxShadow: 'inset 2px 0 0 0 var(--vermilion)' } : undefined}
    >
      <div className="flex items-start gap-6 py-6 pl-5 pr-1">
        <MatchScoreBadge score={job.match_score} loading={scoreLoading} />

        <div className="flex-1 min-w-0">
          {/* Provenance line — mono, because it is all codes and sources. */}
          <div className="flex items-center gap-2 mb-2 font-mono text-[0.6875rem] text-ink-faint">
            <span className="uppercase tracking-wider">{SOURCE_LABEL[job.source] ?? job.source}</span>
            {job.province && (
              <>
                <span aria-hidden className="text-rule-strong">/</span>
                <span className="text-ink-soft">{job.province}</span>
              </>
            )}
          </div>

          <h3 className="font-display text-2xl leading-tight text-ink">
            {job.job_title}
          </h3>

          <p className="text-sm text-ink-soft mt-1">
            {job.company_name ?? 'Company not stated'}
            {job.location && (
              <>
                <span aria-hidden className="text-rule-strong mx-2">·</span>
                <span className="text-ink-faint">{job.location}</span>
              </>
            )}
          </p>

          {job.job_description && (
            <div className="mt-3">
              <p
                className={`text-sm text-ink-soft leading-relaxed max-w-2xl ${
                  expanded ? '' : 'line-clamp-2'
                }`}
              >
                {job.job_description}
              </p>
              <button
                onClick={() => setExpanded(!expanded)}
                className="field-label mt-2 hover:text-vermilion transition-colors duration-150"
              >
                {expanded ? '— Collapse' : '+ Full description'}
              </button>
            </div>
          )}
        </div>

        {/* Actions stay quiet until the row is engaged. */}
        <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
          {job.apply_url && (
            <button
              onClick={() => onApply(job)}
              className="px-4 py-2 text-xs font-medium tracking-wide uppercase bg-vermilion text-paper-raised hover:bg-vermilion-deep transition-colors duration-150"
            >
              Apply
            </button>
          )}
          <button
            onClick={() => onGenerateDocs(job)}
            className="px-4 py-2 text-xs font-medium tracking-wide uppercase border border-ink text-ink hover:bg-vermilion-wash transition-colors duration-150"
          >
            Documents
          </button>
          <button
            onClick={() => onSave(job)}
            className="field-label hover:text-ink transition-colors duration-150"
          >
            Save
          </button>
        </div>
      </div>
    </article>
  )
}
