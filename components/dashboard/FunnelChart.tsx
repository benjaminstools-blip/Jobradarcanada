'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

interface Props {
  data: { stage: string; count: number }[]
}

/** Stage colours come from the DESIGN.md signal palette — same hues the Kanban
 *  column edges use, so a stage reads the same in both views. */
const COLORS: Record<string, string> = {
  Applied: '#2B4A6F',
  Screening: '#554D42',
  'Technical Interview': '#A8721A',
  Offer: '#2C6142',
  Rejected: '#A33A28',
}

const AXIS_TICK = {
  fill: '#8A8073',
  fontSize: 11,
  fontFamily: 'IBM Plex Mono, monospace',
}

export function FunnelChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="#DDD5C6" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="stage"
          tick={AXIS_TICK}
          axisLine={{ stroke: '#17130E' }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--paper-raised)',
            border: '1px solid #17130E',
            borderRadius: 2,
            boxShadow: 'none',
            fontFamily: 'Archivo, sans-serif',
            fontSize: 13,
          }}
          labelStyle={{
            color: '#17130E',
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 16,
          }}
          itemStyle={{ color: '#554D42', fontFamily: 'IBM Plex Mono, monospace' }}
          cursor={{ fill: 'rgba(23, 19, 14, 0.04)' }}
        />
        {/* Square bars — the radius would read as a chat bubble, not a document. */}
        <Bar dataKey="count" radius={0} maxBarSize={64}>
          {data.map((entry) => (
            <Cell key={entry.stage} fill={COLORS[entry.stage] ?? '#554D42'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
