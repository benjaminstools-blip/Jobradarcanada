'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MatchScoreBadge } from '@/components/jobs/MatchScoreBadge'
import { formatRelativeTime } from '@/lib/utils'
import type { Application } from '@/types'

export function KanbanCard({ application }: { application: Application }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
  })

  // dnd-kit style MUST stay on the outer div
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const job = application.job

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      {...attributes}
      {...listeners}
      className="card-hover touch-none"
    >
      <div
        style={{
          background: isDragging ? 'rgba(16,185,129,0.1)' : '#0D1424',
          border: isDragging ? '1px solid rgba(16,185,129,0.4)' : '1px solid #1E2D3D',
          borderRadius: 10,
          padding: '0.75rem',
          cursor: 'grab',
          boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <p className="text-white text-sm font-medium leading-snug line-clamp-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          {job?.job_title ?? 'Unknown role'}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">{job?.company_name ?? ''}</p>
        <div className="flex items-center justify-between mt-2.5">
          <MatchScoreBadge score={job?.match_score ?? null} />
          <span className="text-slate-700 text-xs">
            {formatRelativeTime(application.status_updated_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
