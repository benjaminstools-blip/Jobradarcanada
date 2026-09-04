import { TopNav } from '@/components/nav/TopNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <TopNav />
      <main className="relative z-10 flex-1 page-frame w-full py-12">
        {children}
      </main>
      <footer className="relative z-10 border-t border-rule mt-16">
        <div className="page-frame py-6 flex items-baseline justify-between gap-4">
          <span className="field-label">Job Canada</span>
          <span className="font-mono text-[0.6875rem] text-ink-faint tabular-nums">
            NOC 2021 · TEER
          </span>
        </div>
      </footer>
    </div>
  )
}
