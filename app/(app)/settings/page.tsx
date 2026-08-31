'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { maskKey } from '@/lib/utils'

type TestState = 'idle' | 'loading' | 'ok' | 'fail'

interface TestStatus {
  anthropic: TestState
  apify: TestState
}

// Module scope, not nested in SettingsPage — a component declared during render
// is a fresh type on every pass, so React unmounts and remounts it each time.
function TestIcon({ status }: { status: TestState }) {
  if (status === 'loading') return <Loader2 size={14} className="animate-spin text-slate-400" />
  if (status === 'ok') return <CheckCircle size={14} className="text-[#10B981]" />
  if (status === 'fail') return <XCircle size={14} className="text-red-400" />
  return null
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
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          JobRadar runs on your own API keys — both are required. They&apos;re free to get:{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[#34D399] hover:underline">Anthropic key</a>
          {' · '}
          <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="text-[#34D399] hover:underline">Apify key</a>.
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">API Keys</CardTitle>
          <CardDescription className="text-slate-400">
            Keys are stored per-user in Supabase and never exposed to other users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Anthropic */}
          <div className="space-y-2">
            <Label className="text-slate-300">Anthropic API Key</Label>
            {savedAnthropicPreview && (
              <p className="text-slate-500 text-xs font-mono">Current: {savedAnthropicPreview}</p>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showAnthropic ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowAnthropic(!showAnthropic)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showAnthropic ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testKey('anthropic')}
                disabled={testStatus.anthropic === 'loading'}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <TestIcon status={testStatus.anthropic} />
                <span className="ml-1">Test</span>
              </Button>
            </div>
          </div>

          {/* Apify */}
          <div className="space-y-2">
            <Label className="text-slate-300">Apify API Key</Label>
            {savedApifyPreview && (
              <p className="text-slate-500 text-xs font-mono">Current: {savedApifyPreview}</p>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApify ? 'text' : 'password'}
                  value={apifyKey}
                  onChange={(e) => setApifyKey(e.target.value)}
                  placeholder="apify_api_..."
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowApify(!showApify)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showApify ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testKey('apify')}
                disabled={testStatus.apify === 'loading'}
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <TestIcon status={testStatus.apify} />
                <span className="ml-1">Test</span>
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || (!anthropicKey && !apifyKey)}
            className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
          >
            {saving ? 'Saving…' : 'Save keys'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
