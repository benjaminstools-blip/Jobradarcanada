'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSubmit } from '@/components/auth/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow="Sent"
        title="Check your"
        accent="email"
        standfirst="A reset link is on its way."
        footer={
          <div>
            <Link href="/login" className="link-underline">
              Back to sign in
            </Link>
          </div>
        }
      >
        <div className="border-l-2 border-vermilion pl-4 py-1">
          <p className="text-sm text-ink-soft leading-relaxed">
            We sent a password reset link to{' '}
            <span className="font-mono text-ink">{email}</span>.
          </p>
        </div>
        <p className="field-label mt-6">Link expires in one hour.</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset"
      accent="password"
      standfirst="We will email you a link to set a new one."
      footer={
        <div>
          Remembered it?{' '}
          <Link href="/login" className="link-underline font-medium text-ink">
            Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading} idle="Send reset link" busy="Sending" />
      </form>
    </AuthShell>
  )
}
