import Link from 'next/link'

/**
 * Shared frame for the four auth screens. Split composition: a fixed editorial
 * panel on the left, the form on the right. Stacks below `lg`.
 */
export function AuthShell({
  eyebrow,
  title,
  accent,
  standfirst,
  children,
  footer,
}: {
  eyebrow: string
  /** Leading words of the heading, set in the display serif. */
  title: string
  /** Trailing word, set in vermilion italic. */
  accent: string
  standfirst: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="grain min-h-screen bg-paper lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial panel — the statement, not the form. */}
      <aside className="relative z-10 hidden lg:flex flex-col justify-between border-r border-rule-strong p-14">
        <Link href="/" className="font-display text-2xl leading-none">
          Job<span className="italic text-vermilion">Canada</span>
        </Link>

        <div className="max-w-md">
          <p className="field-label">Canadian job search</p>
          <p className="font-display text-5xl leading-[1.05] mt-5 text-ink">
            Every posting, scored against the CV you actually have.
          </p>
          <div className="title-rule mt-8 w-16" />
          <p className="text-ink-soft text-sm leading-relaxed mt-6">
            Live listings from four Canadian boards, matched to your NOC unit
            group, with cover letters written from your own history — never
            invented.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-6 border-t border-rule pt-6">
          {[
            ['516', 'NOC groups'],
            ['13', 'Provinces'],
            ['4', 'Job boards'],
          ].map(([n, label]) => (
            <div key={label}>
              <dd className="font-mono text-2xl text-ink tabular-nums">{n}</dd>
              <dt className="field-label mt-1">{label}</dt>
            </div>
          ))}
        </dl>
      </aside>

      {/* Form column */}
      <main className="relative z-10 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-rise">
          <Link href="/" className="font-display text-2xl leading-none lg:hidden block mb-10">
            Job<span className="italic text-vermilion">Canada</span>
          </Link>

          <p className="field-label">{eyebrow}</p>
          <h1 className="font-display text-4xl leading-[1.05] mt-3">
            {title} <span className="italic text-vermilion">{accent}</span>
          </h1>
          <div className="title-rule mt-5" />
          <p className="text-ink-soft text-sm mt-4">{standfirst}</p>

          <div className="mt-9">{children}</div>

          {footer && (
            <div className="mt-8 pt-6 border-t border-rule text-sm text-ink-soft space-y-2">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/** Label-over-input pair, ruled rather than boxed. */
export function AuthField({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="field-label block mb-2">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full bg-paper-deep border border-rule px-3 py-2.5 text-ink placeholder:text-ink-faint/60 outline-none focus:border-vermilion focus:ring-0 transition-colors duration-150"
      />
    </div>
  )
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-clay pl-3 py-1 text-sm text-clay animate-fade-in">
      {children}
    </p>
  )
}

export function AuthSubmit({
  loading,
  idle,
  busy,
}: {
  loading: boolean
  idle: string
  busy: string
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 text-xs font-medium tracking-widest uppercase bg-vermilion text-paper-raised hover:bg-vermilion-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
    >
      {loading ? busy : idle}
    </button>
  )
}
