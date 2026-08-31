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
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
        <div className="flex gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-48 shrink-0" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white animate-fade-up" style={{ fontFamily: 'Syne, sans-serif' }}>Tracker</h1>
        <p className="text-slate-600 text-sm text-center py-24 animate-fade-in">
          Apply to jobs from the Job Feed to start tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold text-white animate-fade-up" style={{ fontFamily: 'Syne, sans-serif' }}>Tracker</h1>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {COLUMNS.map((status) => (
            <div key={status} style={{ minWidth: '220px', flexShrink: 0 }}>
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
