import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: applications, error } = await supabase
    .from('applications')
    .select('status, job:jobs(match_score)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const active = applications.filter((a) => a.status !== 'Saved')
  const total = active.length

  const pastApplied = active.filter((a) =>
    ['Screening', 'Technical Interview', 'Offer', 'Rejected'].includes(a.status)
  ).length
  const responseRate = total > 0 ? Math.round((pastApplied / total) * 100) : 0

  const scores = active
    .map((a) => {
      const job = a.job as unknown as { match_score: number | null } | null
      return job?.match_score
    })
    .filter((s): s is number => s !== null && s !== undefined)
  const avgMatchScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  const funnelStages = ['Applied', 'Screening', 'Technical Interview', 'Offer'] as const
  const funnel = funnelStages.map((stage) => ({
    stage,
    count: applications.filter((a) => a.status === stage).length,
  }))

  return NextResponse.json({
    total_applications: total,
    response_rate: responseRate,
    avg_match_score: avgMatchScore,
    funnel,
  })
}
