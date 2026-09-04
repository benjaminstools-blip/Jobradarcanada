'use client'

import Link from 'next/link'

interface Props {
  // Which keys are missing — controls which get-a-key links to highlight.
  needsAnthropic: boolean
  needsApify: boolean
  // Short line describing what this screen needs the keys for.
  reason?: string
}

export function ApiKeysGate({ needsAnthropic, needsApify, reason }: Props) {
  return (
    <section className="max-w-2xl border-t-2 border-vermilion pt-6 animate-rise">
      <p className="field-label">Blocked</p>

      <h2 className="font-display text-3xl mt-3 text-ink">
        Two keys, then you are running
      </h2>

      <p className="text-ink-soft mt-4 leading-relaxed">
        {reason ?? 'Job Canada runs on your own API keys.'} Both are free to
        obtain and stored privately against your account — set them once in
        Settings.
      </p>

      <ol className="mt-8 border-t border-rule">
        {needsAnthropic && (
          <KeyRow
            index="01"
            name="Anthropic"
            note="CV parsing, match scoring, and document generation"
            href="https://console.anthropic.com/settings/keys"
          />
        )}
        {needsApify && (
          <KeyRow
            index="02"
            name="Apify"
            note="Live listings from LinkedIn, Indeed, Eluta and Workopolis"
            aside="$5 free credit"
            href="https://console.apify.com/account/integrations"
          />
        )}
      </ol>

      <Link
        href="/settings"
        className="inline-block mt-8 px-7 py-3 text-xs font-medium tracking-widest uppercase bg-vermilion text-paper-raised hover:bg-vermilion-deep transition-colors duration-150"
      >
        Add keys in Settings
      </Link>
    </section>
  )
}

function KeyRow({
  index,
  name,
  note,
  aside,
  href,
}: {
  index: string
  name: string
  note: string
  aside?: string
  href: string
}) {
  return (
    <li className="border-b border-rule">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="row-hover flex items-baseline gap-4 py-4 px-2 -mx-2 group"
      >
        <span className="font-mono text-[0.625rem] text-ink-faint tabular-nums">
          {index}
        </span>
        <span className="flex-1">
          <span className="block text-ink font-medium">
            {name} API key
            {aside && (
              <span className="font-mono text-[0.6875rem] text-forest ml-2">
                {aside}
              </span>
            )}
          </span>
          <span className="block text-ink-faint text-xs mt-0.5">{note}</span>
        </span>
        <span className="field-label group-hover:text-vermilion transition-colors duration-150">
          Get key →
        </span>
      </a>
    </li>
  )
}
