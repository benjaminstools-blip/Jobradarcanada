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

  // dnd-kit style MUST stay on the outer div — the inner div owns the visuals,
  // or the drag transform overwrites them.
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const job = application.job

  return (
    <div ref={setNodeRef} style={dndStyle} {...attributes} {...listeners} className="touch-none">
      <div
        className={`border px-3 py-3 cursor-grab active:cursor-grabbing transition-colors duration-150 ${
          isDragging
            ? 'border-vermilion bg-vermilion-wash'
            : 'border-rule bg-paper hover:border-rule-strong hover:bg-paper-deep'
        }`}
      >
        <p className="text-sm font-medium leading-snug line-clamp-2 text-ink">
          {job?.job_title ?? 'Unknown role'}
        </p>
        <p className="text-ink-faint text-xs mt-1">{job?.company_name ?? ''}</p>

        <div className="flex items-end justify-between mt-3 pt-3 border-t border-rule">
          <MatchScoreBadge score={job?.match_score ?? null} size="sm" />
          <span className="font-mono text-[0.625rem] text-ink-faint tabular-nums">
            {formatRelativeTime(application.status_updated_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
