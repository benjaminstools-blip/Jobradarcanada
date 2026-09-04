'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { maskKey } from '@/lib/utils'

type TestState = 'idle' | 'loading' | 'ok' | 'fail'

interface TestStatus {
  anthropic: TestState
  apify: TestState
}

// Module scope, not nested in SettingsPage — a component declared during render
// is a fresh type on every pass, so React unmounts and remounts it each time.
function TestStatusLabel({ status }: { status: TestState }) {
  if (status === 'idle') return null
  const map: Record<Exclude<TestState, 'idle'>, { text: string; color: string }> = {
    loading: { text: 'Testing', color: 'var(--ink-faint)' },
    ok: { text: 'Valid', color: 'var(--forest)' },
    fail: { text: 'Rejected', color: 'var(--clay)' },
  }
  const { text, color } = map[status]
  return (
    <span className="field-label" style={{ color }}>
      {text}
    </span>
  )
}

/** One key row: label, stored preview, masked input, test control. */
function KeyRow({
  label,
  index,
  placeholder,
  value,
  onChange,
  preview,
  show,
  onToggleShow,
  status,
  onTest,
}: {
  label: string
  index: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  preview: string | null
  show: boolean
  onToggleShow: () => void
  status: TestState
  onTest: () => void
}) {
  return (
    <div className="border-b border-rule py-7">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[0.625rem] text-ink-faint tabular-nums">{index}</span>
          <span className="field-label text-ink">{label}</span>
        </div>
        <TestStatusLabel status={status} />
      </div>

      {preview && (
        <p className="font-mono text-xs text-ink-faint mb-3">Stored: {preview}</p>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-paper-deep border border-rule px-3 py-2.5 pr-16 font-mono text-sm text-ink placeholder:text-ink-faint/60 outline-none focus:border-vermilion transition-colors duration-150"
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 field-label hover:text-ink transition-colors duration-150"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={status === 'loading'}
          className="px-5 border border-ink text-ink text-xs font-medium tracking-widest uppercase hover:bg-vermilion-wash disabled:opacity-40 transition-colors duration-150"
        >
          Test
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [apifyKey, setApifyKey] = useState('')
  const [savedAnthropicPreview, setSavedAnthropicPreview] = useState<string | null>(null)
  const [savedApifyPreview, setSavedApifyPreview] = useState<string | null>(null)
  const [anthropicSet, setAnthropicSet] = useState(false)
  const [apifySet, setApifySet] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [showApify, setShowApify] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>({ anthropic: 'idle', apify: 'idle' })

  useEffect(() => {
    fetch('/api/settings/keys')
      .then((r) => r.json())
      .then(({ keys }) => {
        setAnthropicSet(!!keys?.anthropic_set)
        setApifySet(!!keys?.apify_set)
        setSavedAnthropicPreview(keys?.anthropic_preview ?? null)
        setSavedApifyPreview(keys?.apify_preview ?? null)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Only send freshly typed keys — omitted fields keep their stored value.
          anthropic_api_key: anthropicKey || undefined,
          apify_api_key: apifyKey || undefined,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      if (anthropicKey) { setAnthropicSet(true); setSavedAnthropicPreview(maskKey(anthropicKey)) }
      if (apifyKey) { setApifySet(true); setSavedApifyPreview(maskKey(apifyKey)) }
      setAnthropicKey('')
      setApifyKey('')
      toast.success('API keys saved.')
    } catch {
      toast.error('Failed to save keys. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function testKey(service: 'anthropic' | 'apify') {
    const typed = service === 'anthropic' ? anthropicKey : apifyKey
    const hasStored = service === 'anthropic' ? anthropicSet : apifySet
    if (!typed && !hasStored) {
      toast.error(`Enter a ${service === 'anthropic' ? 'Anthropic' : 'Apify'} key first.`)
      return
    }

    setTestStatus((s) => ({ ...s, [service]: 'loading' }))
    try {
      const res = await fetch('/api/settings/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No typed key → test the server-stored key; raw value never leaves the server.
        body: JSON.stringify({ service, key: typed || undefined, stored: !typed }),
      })
      const json = await res.json()
      setTestStatus((s) => ({ ...s, [service]: json.success ? 'ok' : 'fail' }))
      if (!json.success) toast.error(json.error ?? 'Key test failed.')
    } catch {
      setTestStatus((s) => ({ ...s, [service]: 'fail' }))
    }
  }

  return (
    <div className="stagger-in max-w-2xl">
      <header>
        <p className="field-label">Configuration</p>
        <h1 className="display-title mt-3">Settings</h1>
        <div className="title-rule mt-5" />
        <p className="text-ink-soft mt-4 leading-relaxed">
          Job Canada runs on your own API keys — both are required. Each is free
          to obtain:{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-ink"
          >
            Anthropic
          </a>
          {' · '}
          <a
            href="https://console.apify.com/account/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline text-ink"
          >
            Apify
          </a>
        </p>
      </header>

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4 pb-3 border-b-2 border-ink">
          <h2 className="font-display text-2xl text-ink">API keys</h2>
          <span className="field-label">Per account</span>
        </div>

        <KeyRow
          index="01"
          label="Anthropic"
          placeholder="sk-ant-..."
          value={anthropicKey}
          onChange={setAnthropicKey}
          preview={savedAnthropicPreview}
          show={showAnthropic}
          onToggleShow={() => setShowAnthropic(!showAnthropic)}
          status={testStatus.anthropic}
          onTest={() => testKey('anthropic')}
        />

        <KeyRow
          index="02"
          label="Apify"
          placeholder="apify_api_..."
          value={apifyKey}
          onChange={setApifyKey}
          preview={savedApifyPreview}
          show={showApify}
          onToggleShow={() => setShowApify(!showApify)}
          status={testStatus.apify}
          onTest={() => testKey('apify')}
        />

        <div className="flex items-center gap-6 mt-7">
          <button
            onClick={handleSave}
            disabled={saving || (!anthropicKey && !apifyKey)}
            className="px-7 py-3 text-xs font-medium tracking-widest uppercase bg-vermilion text-paper-raised hover:bg-vermilion-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {saving ? 'Saving' : 'Save keys'}
          </button>
          <p className="text-ink-faint text-xs max-w-xs leading-relaxed">
            Stored per user in Supabase, never exposed to other accounts. Only
            keys you retype are sent.
          </p>
        </div>
      </section>
    </div>
  )
}
