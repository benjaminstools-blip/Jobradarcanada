import { cn } from '@/lib/utils'

interface Props {
  score: number | null
  loading?: boolean
  /** 'lg' for the primary numeral on a job row, 'sm' for dense contexts. */
  size?: 'sm' | 'lg'
}

/** Band thresholds are shared with JobCard's left-edge accent. */
export function scoreBand(score: number) {
  if (score >= 75) return { color: 'var(--forest)', label: 'Strong' }
  if (score >= 50) return { color: 'var(--ochre)', label: 'Partial' }
  return { color: 'var(--clay)', label: 'Weak' }
}

export function MatchScoreBadge({ score, loading, size = 'lg' }: Props) {
  if (loading) {
    return (
      <div className={cn('shrink-0', size === 'lg' ? 'w-16' : 'w-12')}>
        <div
          className={cn(
            'bg-paper-deep animate-pulse',
            size === 'lg' ? 'h-8' : 'h-5'
          )}
        />
        <div className="h-[2px] bg-rule mt-1.5" />
      </div>
    )
  }

  if (score === null) {
    return (
      <div className={cn('shrink-0', size === 'lg' ? 'w-16' : 'w-12')}>
        <span
          className={cn(
            'font-mono text-ink-faint tabular-nums block',
            size === 'lg' ? 'text-2xl' : 'text-sm'
          )}
        >
          —
        </span>
        <div className="h-[2px] bg-rule mt-1.5" />
      </div>
    )
  }

  const { color, label } = scoreBand(score)

  return (
    <div className={cn('shrink-0', size === 'lg' ? 'w-16' : 'w-12')}>
      <div className="flex items-baseline gap-0.5">
        <span
          className={cn(
            'font-mono font-medium tabular-nums leading-none',
            size === 'lg' ? 'text-2xl' : 'text-sm'
          )}
          style={{ color }}
        >
          {score}
        </span>
        <span className="font-mono text-[0.625rem] text-ink-faint leading-none">%</span>
      </div>

      {/* Hairline meter — the score made spatial without a progress-bar chrome. */}
      <div className="h-[2px] bg-rule mt-1.5 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 animate-draw"
          style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: color }}
        />
      </div>

      {size === 'lg' && (
        <span className="field-label block mt-1.5" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  )
}
