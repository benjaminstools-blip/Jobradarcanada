'use client'

import { useState, type CSSProperties } from 'react'
import { ExternalLink, Bookmark, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatchScoreBadge } from './MatchScoreBadge'
import type { Job } from '@/types'

interface Props {
  job: Job
  scoreLoading?: boolean
  onApply: (job: Job) => void
  onSave: (job: Job) => void
  onGenerateDocs: (job: Job) => void
}

export function JobCard({ job, scoreLoading, onApply, onSave, onGenerateDocs }: Props) {
  const [expanded, setExpanded] = useState(false)

  const SOURCE_STYLES: Record<Job['source'], CSSProperties> = {
    linkedin: { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#93C5FD' },
    indeed: { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#C4B5FD' },
    eluta: { background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)', color: '#5EEAD4' },
    workopolis: { background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)', color: '#F9A8D4' },
  }
  const sourceStyle = SOURCE_STYLES[job.source] ?? SOURCE_STYLES.linkedin

  const accentColor =
    job.match_score === null  ? '#1E2D3D'
    : job.match_score >= 70  ? '#10B981'
    : job.match_score >= 40  ? '#F59E0B'
                              : '#EF4444'

  return (
    <div
      className="card-hover animate-fade-up"
      style={{
        background: '#0D1424',
        border: '1px solid #1E2D3D',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 12,
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {job.match_score !== null && job.match_score >= 70 && (
        <div aria-hidden style={{
          position: 'absolute', top: -40, right: -40,
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={sourceStyle}>
                {job.source}
              </span>
              <MatchScoreBadge score={job.match_score} loading={scoreLoading} />
            </div>
            <h3 className="text-white font-semibold leading-snug text-base" style={{ fontFamily: 'Syne, sans-serif' }}>
              {job.job_title}
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">
              {job.company_name ?? 'Unknown company'}
              {job.location && <span className="text-slate-600"> · {job.location}</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="text-xs h-8 px-3 border-0"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#A5B4FC' }}
              onClick={() => onSave(job)}
            >
              <Bookmark size={12} className="mr-1" /> Save
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 px-3 border-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981' }}
              onClick={() => onGenerateDocs(job)}
            >
              <Sparkles size={12} className="mr-1" /> AI Docs
            </Button>
            {job.apply_url && (
              <Button
                size="sm"
                className="text-xs h-8 px-3 btn-glow border-0"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' }}
                onClick={() => onApply(job)}
              >
                Apply <ExternalLink size={12} className="ml-1" />
              </Button>
            )}
          </div>
        </div>

        {job.job_description && (
          <div>
            <p className={`text-slate-400 text-sm leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {job.job_description}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#34D399] text-xs mt-1 flex items-center gap-1 hover:text-[#6EE7B7] transition-colors"
            >
              {expanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> View Full Description</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
