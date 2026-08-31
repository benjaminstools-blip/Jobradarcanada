'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'
import type { Application, ApplicationStatus } from '@/types'

const STATUS_STYLES: Record<ApplicationStatus, { gradient: string; glow: string; badge: string }> = {
  Saved:                 { gradient: 'linear-gradient(135deg, #334155, #1E293B)', glow: 'rgba(148,163,184,0.15)', badge: '#94A3B8' },
  Applied:               { gradient: 'linear-gradient(135deg, #1D4ED8, #1E3A8A)', glow: 'rgba(59,130,246,0.2)',   badge: '#93C5FD' },
  Screening:             { gradient: 'linear-gradient(135deg, #6D28D9, #4C1D95)', glow: 'rgba(139,92,246,0.2)',   badge: '#C4B5FD' },
  'Technical Interview': { gradient: 'linear-gradient(135deg, #B45309, #78350F)', glow: 'rgba(245,158,11,0.2)',   badge: '#FCD34D' },
  Offer:                 { gradient: 'linear-gradient(135deg, #059669, #064E3B)', glow: 'rgba(16,185,129,0.25)',  badge: '#6EE7B7' },
  Rejected:              { gradient: 'linear-gradient(135deg, #991B1B, #7F1D1D)', glow: 'rgba(239,68,68,0.2)',    badge: '#FCA5A5' },
}

interface Props {
  status: ApplicationStatus
  applications: Application[]
}

export function KanbanColumn({ status, applications }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const s = STATUS_STYLES[status]

  return (
    <div className="flex flex-col min-w-[220px] w-full">
      <div
        className="flex items-center justify-between mb-3 p-2.5 rounded-lg"
        style={{ background: s.gradient, boxShadow: `0 2px 12px ${s.glow}` }}
      >
        <span
          className="text-white text-xs font-semibold uppercase"
          style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '0.08em' }}
        >
          {status}
        </span>
        <span
          className="text-xs font-bold rounded-full px-2 py-0.5"
          style={{ background: 'rgba(0,0,0,0.3)', color: s.badge }}
        >
          {applications.length}
        </span>
      </div>

      <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 space-y-2 min-h-[120px] rounded-xl p-1.5 transition-all duration-200"
          style={{
            background: isOver ? s.glow : 'transparent',
            border: isOver ? `1px solid ${s.badge}33` : '1px solid transparent',
          }}
        >
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
