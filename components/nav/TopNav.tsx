'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Upload', href: '/upload', index: '01' },
  { label: 'Feed', href: '/jobs', index: '02' },
  { label: 'Tracker', href: '/tracker', index: '03' },
  { label: 'Dashboard', href: '/dashboard', index: '04' },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-rule-strong">
      <div className="page-frame flex items-center gap-8 h-16">
        <Link href="/jobs" className="shrink-0 group">
          <span className="font-display text-2xl leading-none tracking-tight">
            Job
            <span className="italic text-vermilion">Canada</span>
          </span>
        </Link>

        {/* Numbered like dossier sections. Scrolls rather than collapsing on
            small screens — a hamburger hides the whole information scent. */}
        <nav className="flex-1 flex items-stretch gap-6 overflow-x-auto h-16">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2 shrink-0 transition-colors duration-150',
                  active ? 'text-ink' : 'text-ink-faint hover:text-ink'
                )}
              >
                <span className="font-mono text-[0.625rem] tabular-nums opacity-60">
                  {tab.index}
                </span>
                <span className="text-sm font-medium">{tab.label}</span>
                <span
                  className={cn(
                    'absolute left-0 right-0 bottom-0 h-[2px] transition-transform duration-150 origin-left',
                    active
                      ? 'bg-vermilion scale-x-100'
                      : 'bg-rule-strong scale-x-0 group-hover:scale-x-100'
                  )}
                />
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-5 shrink-0">
          <Link
            href="/settings"
            className={cn(
              'field-label transition-colors duration-150 hover:text-ink',
              pathname === '/settings' && 'text-vermilion'
            )}
          >
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="field-label transition-colors duration-150 hover:text-clay"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
