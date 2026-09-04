'use client'

import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/dashboard/StatCard'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import type { DashboardStats } from '@/types'

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) throw new Error('Failed to load stats')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const hasFunnelData = stats?.funnel && stats.funnel.some((f) => f.count > 0)

  return (
    <div className="stagger-in">
      <header>
        <p className="field-label">Your search</p>
        <h1 className="display-title mt-3">Dashboard</h1>
        <div className="title-rule mt-5" />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mt-12">
        <StatCard
          label="Applications"
          value={stats?.total_applications ?? 0}
          loading={isLoading}
          accent="vermilion"
        />
        <StatCard
          label="Response rate"
          value={stats ? `${stats.response_rate}%` : '0%'}
          sub="Moved past the Applied stage"
          loading={isLoading}
          accent="slate"
        />
        <StatCard
          label="Avg match"
          value={stats ? `${stats.avg_match_score}%` : '—'}
          sub="Across active applications"
          loading={isLoading}
          accent="forest"
        />
      </div>

      <section className="mt-16 pt-6 border-t border-rule-strong">
        <div className="flex items-baseline justify-between gap-4 mb-8">
          <h2 className="font-display text-2xl text-ink">Application funnel</h2>
          <span className="field-label">By stage</span>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <span className="field-label">Loading</span>
          </div>
        ) : hasFunnelData ? (
          <FunnelChart data={stats!.funnel} />
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <p className="font-display text-2xl text-ink">Nothing tracked yet</p>
            <p className="text-ink-faint text-sm mt-2">
              Apply from the feed and stages will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
