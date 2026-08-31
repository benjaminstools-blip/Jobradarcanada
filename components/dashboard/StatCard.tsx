import { Skeleton } from '@/components/ui/skeleton'

type Accent = 'green' | 'cyan' | 'indigo'

interface Props {
  label: string
  value: string | number
  sub?: string
  loading?: boolean
  accent?: Accent
}

const ACCENT_TOP: Record<Accent, string> = {
  green:  '#10B981',
  cyan:   '#06B6D4',
  indigo: '#6366F1',
}

const ACCENT_GRADIENT: Record<Accent, string> = {
  green:  'linear-gradient(135deg, #10B981, #34D399)',
  cyan:   'linear-gradient(135deg, #06B6D4, #22D3EE)',
  indigo: 'linear-gradient(135deg, #6366F1, #818CF8)',
}

export function StatCard({ label, value, sub, loading, accent = 'green' }: Props) {
  return (
    <div
      className="card-hover animate-fade-up"
      style={{
        background: '#0D1424',
        border: '1px solid #1E2D3D',
        borderTop: `2px solid ${ACCENT_TOP[accent]}`,
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
      }}
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <Skeleton className="h-10 w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      ) : (
        <>
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-2 font-medium">{label}</p>
          <p
            className="text-4xl font-bold leading-none"
            style={{
              fontFamily: 'Syne, sans-serif',
              background: ACCENT_GRADIENT[accent],
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {value}
          </p>
          {sub && <p className="text-slate-600 text-xs mt-2">{sub}</p>}
        </>
      )}
    </div>
  )
}
