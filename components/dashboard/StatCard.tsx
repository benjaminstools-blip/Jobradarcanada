type Accent = 'vermilion' | 'slate' | 'forest'

interface Props {
  label: string
  value: string | number
  sub?: string
  loading?: boolean
  accent?: Accent
}

const ACCENT: Record<Accent, string> = {
  vermilion: 'var(--vermilion)',
  slate: 'var(--slate-blue)',
  forest: 'var(--forest)',
}

/** A ruled statistic, not a card. Colour appears only as a 2px top edge. */
export function StatCard({ label, value, sub, loading, accent = 'vermilion' }: Props) {
  return (
    <div
      className="pt-5 border-t-2"
      style={{ borderTopColor: ACCENT[accent] }}
    >
      {loading ? (
        <div className="space-y-3">
          <div className="h-2.5 w-24 bg-paper-deep animate-pulse" />
          <div className="h-10 w-20 bg-paper-deep animate-pulse" />
        </div>
      ) : (
        <>
          <p className="field-label">{label}</p>
          <p className="font-mono text-5xl leading-none tabular-nums mt-3 text-ink">
            {value}
          </p>
          {sub && <p className="text-ink-faint text-xs mt-3">{sub}</p>}
        </>
      )}
    </div>
  )
}
