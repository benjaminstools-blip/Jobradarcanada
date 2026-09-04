import { nocTitle, teerOf, teerLabel, broadCategoryOf } from '@/lib/noc'
import type { CVProfile } from '@/types'

/** The candidate's own record — the dossier's cover sheet. */
export function CVProfileCard({ profile }: { profile: CVProfile }) {
  const noc = profile.noc_code && nocTitle(profile.noc_code) ? profile.noc_code : null

  return (
    <section className="border-t-2 border-ink pt-6">
      <div className="flex items-baseline justify-between gap-4 mb-8">
        <p className="field-label">On file</p>
        <span className="font-mono text-[0.6875rem] text-ink-faint">CV PROFILE</span>
      </div>

      <h2 className="font-display text-4xl leading-none text-ink">
        {profile.full_name ?? 'Unnamed candidate'}
      </h2>
      <p className="text-ink-soft mt-2">
        {profile.current_job_title ?? 'Title not stated'}
        {profile.years_of_experience != null && (
          <>
            <span aria-hidden className="text-rule-strong mx-2">·</span>
            <span className="font-mono text-sm tabular-nums">
              {profile.years_of_experience}
            </span>
            <span className="text-ink-faint text-sm"> yrs</span>
          </>
        )}
      </p>

      {noc && (
        <div className="mt-8 pt-6 border-t border-rule grid gap-6 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="field-label">NOC 2021</p>
            <p className="font-mono text-3xl tabular-nums text-vermilion mt-2 leading-none">
              {noc}
            </p>
          </div>
          <div>
            <p className="field-label">Unit group</p>
            <p className="text-ink mt-2 leading-snug">{nocTitle(noc)}</p>
            <p className="text-ink-faint text-xs mt-2">{broadCategoryOf(noc)}</p>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-mono text-xs border border-rule-strong px-2 py-1 text-ink">
                TEER {teerOf(noc)}
              </span>
              <span className="text-ink-faint text-xs">{teerLabel(noc)}</span>
            </div>
          </div>
        </div>
      )}

      {profile.technical_skills && profile.technical_skills.length > 0 && (
        <div className="mt-8 pt-6 border-t border-rule">
          <p className="field-label mb-3">Skills</p>
          <ul className="flex flex-wrap gap-1.5">
            {profile.technical_skills.map((skill) => (
              <li
                key={skill}
                className="font-mono text-[0.6875rem] border border-rule bg-paper-deep px-2 py-1 text-ink-soft"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.professional_summary && (
        <div className="mt-8 pt-6 border-t border-rule">
          <p className="field-label mb-3">Summary</p>
          <p className="text-ink-soft leading-relaxed max-w-2xl">
            {profile.professional_summary}
          </p>
        </div>
      )}
    </section>
  )
}
