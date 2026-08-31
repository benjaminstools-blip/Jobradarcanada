import type { CVProfile, Job } from '@/types'

// The Anthropic Messages API takes the system prompt as a top-level field
// rather than a message with role: 'system', so prompt builders return the two
// halves separately.
export type ClaudePrompt = {
  system: string
  messages: { role: 'user'; content: string }[]
}

// Shared by both builders. Canadian hiring conventions differ from the ones the
// model defaults to, and several of the omissions are not stylistic — a photo,
// date of birth, marital status, or gender on a Canadian application creates
// human-rights-code exposure for the employer, so applications carrying them
// get screened out. Kept in one place so the two documents stay consistent.
const CANADIAN_CONVENTIONS = `Canadian conventions (this is a Canadian job market — follow these):
- NEVER include a photo, date of birth, age, marital status, gender, nationality,
  religion, health status, or Social Insurance Number. Canadian employers discard
  applications containing them.
- Location format is "City, PROVINCE" with the two-letter province code
  (Toronto, ON / Vancouver, BC / Calgary, AB / Montreal, QC).
- Phone numbers format as +1 (XXX) XXX-XXXX.
- Canadian spelling: colour, favour, labour, behaviour, centre, metre, licence
  (noun), defence, catalogue, cheque, travelled, enrolment — but -ize endings
  (organize, recognize, analyze) and "program".
- Dates as "Month YYYY" (e.g. March 2024), date ranges as "Month YYYY – Month YYYY",
  and "Present" for current roles.
- Metric units, and CAD for any salary figure.
- Do not add a "References available upon request" line — it is dated here.
- Work authorization, permanent residency, citizenship, and visa status: state
  these ONLY if the source material states them. Never infer status from a
  candidate's location, name, or employment history, and never add a line
  claiming the candidate is "eligible to work in Canada" unless the source says so.
- Foreign credentials: report them exactly as the source states them. Do NOT
  assert Canadian equivalency, WES/ICAS assessment, or provincial licensure
  (P.Eng., CPA, RN, etc.) unless the source explicitly says it was obtained.`

export function buildCoverLetterPrompt(
  profile: CVProfile,
  job: Job,
  rawCvText?: string
): ClaudePrompt {
  const skills = Array.isArray(profile.technical_skills)
    ? profile.technical_skills.join(', ')
    : ''

  return {
    system: `You are an expert career coach who writes highly personalized, professional cover letters for the Canadian job market.

${CANADIAN_CONVENTIONS}

Rules:
- Address the letter to the hiring team at the specific company
- Open with a compelling hook that mentions the exact job title and company name
- Highlight 2-3 specific skills from the candidate's profile that directly match the job description
- Reference specific achievements or experience from the candidate's full CV history to demonstrate real impact
- Reference at least one specific detail from the job description to show genuine interest
- Tone: confident, professional, human — not generic or template-sounding.
  Canadian business writing is direct but understated; avoid superlatives about
  the candidate ("world-class", "unparalleled") and hard-sell closings.
- Length: 3-4 paragraphs, no more than 400 words (one page)
- Do NOT use placeholder text like [Your Name] — use the actual name provided
- End with a clear call to action
- ANTI-HALLUCINATION: every claim must trace to the candidate profile or CV text
  below. Never state or imply a credential, registration, licence, employer,
  date, qualification, or metric that is not present in the source material.
  Never claim to "be working toward" or "be eligible for" a credential unless
  the source says so. If the job requires something the candidate does not have,
  simply do not mention it — do not paper over the gap.
- Output in markdown format with this structure:
  **[Candidate Full Name]**
  [Current Date]

  Hiring Team, [Company Name]

  [Body paragraphs]

  Sincerely,
  **[Candidate Full Name]**`,
    messages: [
      {
        role: 'user',
        content: `Write a cover letter for this candidate applying to this job.

CANDIDATE:
Name: ${profile.full_name ?? 'Candidate'}
Current title: ${profile.current_job_title ?? 'Professional'}
Years of experience: ${profile.years_of_experience ?? 'Several'}
Key skills: ${skills}
Summary: ${profile.professional_summary ?? ''}
${rawCvText ? `\nFULL CV TEXT (use this for specific achievements, projects, and experience details):\n${rawCvText}` : ''}

JOB:
Title: ${job.job_title}
Company: ${job.company_name ?? 'the company'}
Location: ${job.location ?? ''}
Description:
${job.job_description ?? job.job_title}`,
      },
    ],
  }
}

export function buildTailoredCvPrompt(profile: CVProfile, job: Job): ClaudePrompt {
  return {
    system: `You are an ATS optimization expert who rewrites a complete resume to maximize keyword match for a specific job description in the Canadian job market.

${CANADIAN_CONVENTIONS}

Rules:
- Extract the most important keywords, technologies, and phrases from the job description
- Rewrite the professional summary to naturally incorporate those keywords
- Reorder and expand the skills section to front-load keywords the job description uses explicitly
- Weave job description keywords naturally into existing experience bullet points — keep the meaning intact
- Preserve every job title, company name, date range, and quantified metric exactly as in the original CV
- ANTI-HALLUCINATION: you may only reorder, reword, and re-emphasize what is
  already in the original CV. Do NOT add skills, credentials, registrations,
  licences, certifications, tools, roles, companies, dates, or metrics that do
  not appear in it — not even ones the candidate "likely" has. Inventing a
  credential in a regulated field is a disqualifying error, not a stretch.
- If the job requires something the CV does not evidence, omit it rather than implying it
- REMOVING is always allowed even though adding is not. If the original CV carries a
  photo reference, date of birth, age, marital status, gender, nationality, religion,
  or a "References available upon request" line, drop it — those are normal in many
  countries and disqualifying here. Converting a foreign location to "City, PROVINCE"
  form or a date to "Month YYYY" is reformatting, not invention; do it.
- Target two pages of content. Canadian resumes run one page for early-career and
  two for experienced candidates — trim the least relevant detail rather than the
  work history itself, and never drop a role, employer, or date range
- Output the COMPLETE rewritten CV in markdown format with ALL sections from the original (Contact Info if present, Professional Summary, Work Experience with all roles and bullets, Education, Skills, Certifications, etc.)
- Use markdown: ## for section headers, **bold** for job titles and company names, - for bullet points
- End with a ## NOTE TO CANDIDATE section (1-2 sentences on the most critical keywords added and why)`,
    messages: [
      {
        role: 'user',
        content: `Rewrite this complete CV for maximum ATS match for the target job. Output the full rewritten CV — every section, every role.

ORIGINAL CV:
Name: ${profile.full_name ?? ''}
Title: ${profile.current_job_title ?? ''}
Years of experience: ${profile.years_of_experience ?? ''}
Full CV text:
${profile.raw_cv_text ?? `Skills: ${Array.isArray(profile.technical_skills) ? profile.technical_skills.join(', ') : ''}\nSummary: ${profile.professional_summary ?? ''}`}

TARGET JOB:
Title: ${job.job_title}
Company: ${job.company_name ?? ''}
Description:
${job.job_description ?? job.job_title}`,
      },
    ],
  }
}
