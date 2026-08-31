'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  data: { stage: string; count: number }[]
}

const COLORS: Record<string, string> = {
  Applied:               '#06B6D4',
  Screening:             '#6366F1',
  'Technical Interview': '#F59E0B',
  Offer:                 '#10B981',
  Rejected:              '#EF4444',
}

export function FunnelChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="stage"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#0D1424',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          labelStyle={{ color: '#e2e8f0', fontFamily: 'Syne, sans-serif', fontSize: 13 }}
          itemStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.stage} fill={COLORS[entry.stage] ?? '#06B6D4'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
