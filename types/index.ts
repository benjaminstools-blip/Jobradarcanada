export interface CVProfile {
  id: string
  user_id: string
  full_name: string | null
  current_job_title: string | null
  years_of_experience: number | null
  technical_skills: string[] | null
  professional_summary: string | null
  raw_cv_text: string | null
  cv_file_path: string | null
  created_at: string
  updated_at: string
}

/** Keep in sync with SOURCES in lib/sources.ts and the jobs_source_check
 *  constraint in supabase/schema.sql. */
export type JobSource = 'linkedin' | 'indeed' | 'eluta' | 'workopolis'

export interface Job {
  id: string
  user_id: string
  source: JobSource
  job_title: string
  company_name: string | null
  location: string | null
  job_description: string | null
  apply_url: string | null
  match_score: number | null
  fetched_at: string
}

export type ApplicationStatus =
  | 'Saved'
  | 'Applied'
  | 'Screening'
  | 'Technical Interview'
  | 'Offer'
  | 'Rejected'

export interface Application {
  id: string
  user_id: string
  job_id: string
  status: ApplicationStatus
  status_updated_at: string
  created_at: string
  job?: Job
}

export interface UserApiKeys {
  user_id: string
  anthropic_api_key: string | null
  apify_api_key: string | null
  updated_at: string
}

export type DocumentType = 'cover_letter' | 'tailored_cv'

export interface GeneratedDocument {
  id: string
  user_id: string
  job_id: string
  type: DocumentType
  content: string
  created_at: string
}

export interface DashboardStats {
  total_applications: number
  response_rate: number
  avg_match_score: number
  funnel: { stage: string; count: number }[]
}
