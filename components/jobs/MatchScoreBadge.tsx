import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  score: number | null
  loading?: boolean
}

export function MatchScoreBadge({ score, loading }: Props) {
  if (loading) {
    return <Skeleton className="h-6 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
  }

  if (score === null) return null

  const style =
    score >= 70
      ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.5)', color: '#6EE7B7', boxShadow: '0 0 8px rgba(16,185,129,0.3)' }
      : score >= 40
      ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#FCD34D', boxShadow: '0 0 8px rgba(245,158,11,0.25)' }
      : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', boxShadow: '0 0 8px rgba(239,68,68,0.2)' }

  return (
    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={style}>
      {score}% match
    </span>
  )
}
