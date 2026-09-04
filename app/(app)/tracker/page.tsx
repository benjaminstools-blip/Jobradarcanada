'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { KanbanColumn } from '@/components/tracker/KanbanColumn'
import type { Application, ApplicationStatus } from '@/types'

const COLUMNS: ApplicationStatus[] = [
  'Saved', 'Applied', 'Screening', 'Technical Interview', 'Offer', 'Rejected',
]

export default function TrackerPage() {
  const queryClient = useQueryClient()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await fetch('/api/applications')
      if (!res.ok) throw new Error('Failed to load applications')
      const json = await res.json()
      return json.applications ?? []
    },
  })

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const appId = String(active.id)
    const newStatus = String(over.id) as ApplicationStatus

    if (!COLUMNS.includes(newStatus)) return

    const prev = applications
    const optimistic = prev.map((a) =>
      a.id === appId ? { ...a, status: newStatus, status_updated_at: new Date().toISOString() } : a
    )

    queryClient.setQueryData(['applications'], optimistic)

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch {
      queryClient.setQueryData(['applications'], prev)
      toast.error('Failed to move card. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div>
        <TrackerMasthead count={null} />
        <div className="flex gap-4 mt-12 overflow-x-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="min-w-[220px] flex-1">
              <div className="border-t-2 border-rule pt-3 pb-3">
                <div className="h-2.5 w-20 bg-paper-deep animate-pulse" />
              </div>
              <div className="h-40 bg-paper-deep animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="stagger-in">
        <TrackerMasthead count={0} />
        <div className="py-24 text-center">
          <p className="font-display text-3xl text-ink">No applications yet</p>
          <p className="text-ink-faint text-sm mt-2">
            Apply from the feed and cards will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TrackerMasthead count={applications.length} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 mt-12">
          {COLUMNS.map((status) => (
            <div key={status} className="min-w-[220px] flex-1 shrink-0">
              <KanbanColumn
                status={status}
                applications={applications.filter((a) => a.status === status)}
              />
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  )
}

function TrackerMasthead({ count }: { count: number | null }) {
  return (
    <header>
      <p className="field-label">Pipeline</p>
      <h1 className="display-title mt-3">Tracker</h1>
      <div className="title-rule mt-5" />
      <p className="text-ink-soft mt-4 text-sm">
        Drag a card between stages to update it.
        {count !== null && (
          <>
            <span aria-hidden className="text-rule-strong mx-2">·</span>
            <span className="font-mono tabular-nums">{count}</span>
            <span className="text-ink-faint"> tracked</span>
          </>
        )}
      </p>
    </header>
  )
}
