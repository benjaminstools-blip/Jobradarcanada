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

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">Your job search at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Applications" value={stats?.total_applications ?? 0} loading={isLoading} accent="green" />
        <StatCard label="Response Rate" value={stats ? `${stats.response_rate}%` : '0%'} sub="Applications past Applied stage" loading={isLoading} accent="cyan" />
        <StatCard label="Avg Match Score" value={stats ? `${stats.avg_match_score}%` : '—'} sub="Across active applications" loading={isLoading} accent="indigo" />
      </div>

      <div
        className="animate-fade-up"
        style={{
          background: '#0D1424',
          border: '1px solid #1E2D3D',
          borderRadius: 12,
          padding: '1.5rem',
          animationDelay: '120ms',
        }}
      >
        <h2 className="text-white text-sm font-semibold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Application Funnel
        </h2>
        {isLoading ? (
          <div className="h-60 flex items-center justify-center text-slate-600 text-sm">
            Loading chart…
          </div>
        ) : stats?.funnel && stats.funnel.some((f) => f.count > 0) ? (
          <FunnelChart data={stats.funnel} />
        ) : (
          <div className="h-60 flex items-center justify-center text-slate-600 text-sm">
            No applications yet. Start applying from the Job Feed.
          </div>
        )}
      </div>
    </div>
  )
}
