'use client'

import Link from 'next/link'
import { KeyRound, ExternalLink, ArrowRight } from 'lucide-react'

interface Props {
  // Which keys are missing — controls which get-a-key links to highlight.
  needsAnthropic: boolean
  needsApify: boolean
  // Short line describing what this screen needs the keys for.
  reason?: string
}

export function ApiKeysGate({ needsAnthropic, needsApify, reason }: Props) {
  return (
    <div
      className="max-w-xl mx-auto animate-scale-in"
      style={{
        background: '#0D1424',
        border: '1px solid #1E2D3D',
        borderRadius: 16,
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        className="mx-auto mb-4 flex items-center justify-center"
        style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
        }}
      >
        <KeyRound size={26} color="#34D399" />
      </div>

      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
        Add your API keys to get started
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        {reason ?? 'JobRadar runs on your own API keys.'} They&apos;re free to get and
        stored privately to your account — set them once in Settings.
      </p>

      <div className="space-y-2 mb-6 text-left">
        {needsAnthropic && (
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <p className="text-white text-sm font-medium">Anthropic API key</p>
              <p className="text-slate-500 text-xs">Powers CV parsing, match scoring & AI documents</p>
            </div>
            <ExternalLink size={15} className="text-slate-500 shrink-0" />
          </a>
        )}
        {needsApify && (
          <a
            href="https://console.apify.com/account/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <p className="text-white text-sm font-medium">Apify API key <span className="text-[#34D399]">· $5 free credit</span></p>
              <p className="text-slate-500 text-xs">Fetches live jobs from LinkedIn, Indeed, Eluta & Workopolis</p>
            </div>
            <ExternalLink size={15} className="text-slate-500 shrink-0" />
          </a>
        )}
      </div>

      <Link
        href="/settings"
        className="btn-glow inline-flex items-center justify-center gap-1.5 w-full text-white font-semibold text-sm h-11 rounded-lg"
        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
      >
        Add keys in Settings <ArrowRight size={15} />
      </Link>
    </div>
  )
}
