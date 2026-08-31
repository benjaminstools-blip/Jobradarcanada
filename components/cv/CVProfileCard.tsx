import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CVProfile } from '@/types'

export function CVProfileCard({ profile }: { profile: CVProfile }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-lg">Your CV Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
            <p className="text-white font-medium">{profile.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current Title</p>
            <p className="text-white font-medium">{profile.current_job_title ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Experience</p>
            <p className="text-white font-medium">
              {profile.years_of_experience != null ? `${profile.years_of_experience} yrs` : '—'}
            </p>
          </div>
        </div>

        {profile.technical_skills && profile.technical_skills.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.technical_skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="bg-slate-800 text-slate-300 border-slate-600">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {profile.professional_summary && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Summary</p>
            <p className="text-slate-300 text-sm leading-relaxed">{profile.professional_summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
