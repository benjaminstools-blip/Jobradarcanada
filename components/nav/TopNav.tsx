'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Upload CV', href: '/upload' },
  { label: 'Job Feed', href: '/jobs' },
  { label: 'Tracker', href: '/tracker' },
  { label: 'Dashboard', href: '/dashboard' },
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
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(8, 13, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(16, 185, 129, 0.12)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <span className="text-lg font-bold shrink-0" style={{ fontFamily: 'Syne, sans-serif' }}>
          <span className="text-white">Job</span>
          <span style={{
            background: 'linear-gradient(135deg, #10B981, #34D399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Radar</span>
        </span>

        <nav className="flex-1 flex items-center justify-center gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                )}
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))',
                  border: '1px solid rgba(16,185,129,0.35)',
                  color: '#34D399',
                } : {}}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className={cn(
              'p-2 rounded-md transition-colors',
              pathname === '/settings' ? 'text-[#10B981]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
            )}
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
