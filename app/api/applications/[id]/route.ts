import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const StatusSchema = z.enum([
  'Saved', 'Applied', 'Screening', 'Technical Interview', 'Offer', 'Rejected',
])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const result = StatusSchema.safeParse(body.status)
  if (!result.success) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  const { data: status } = result

  const { data, error } = await supabase
    .from('applications')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[applications/patch]', error.message)
    return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 })
  }

  return NextResponse.json({ application: data })
}
