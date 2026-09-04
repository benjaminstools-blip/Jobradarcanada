'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'
import type { Application, ApplicationStatus } from '@/types'

/** Status reads as a 2px top edge, never a filled gradient header. Same hues as
 *  the funnel chart so a stage is recognisable across both views. */
const STATUS_EDGE: Record<ApplicationStatus, string> = {
  Saved: 'var(--rule-strong)',
  Applied: 'var(--slate-blue)',
  Screening: 'var(--ink-soft)',
  'Technical Interview': 'var(--ochre)',
  Offer: 'var(--forest)',
  Rejected: 'var(--clay)',
}

interface Props {
  status: ApplicationStatus
  applications: Application[]
}

export function KanbanColumn({ status, applications }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-[220px] w-full">
      <div
        className="flex items-baseline justify-between gap-2 border-t-2 pt-3 pb-3"
        style={{ borderTopColor: STATUS_EDGE[status] }}
      >
        <span className="field-label text-ink">{status}</span>
        <span className="font-mono text-xs text-ink-faint tabular-nums">
          {applications.length}
        </span>
      </div>

      <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 min-h-[140px] p-1.5 border transition-colors duration-150 ${
            isOver ? 'border-vermilion bg-vermilion-wash' : 'border-transparent'
          }`}
        >
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}

          {applications.length === 0 && (
            <p className="field-label text-center py-8 opacity-50">Empty</p>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
