'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSubmit } from '@/components/auth/AuthShell'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your"
        accent="email"
        standfirst="One click and your account is live."
      >
        <div className="border-l-2 border-vermilion pl-4 py-1">
          <p className="text-sm text-ink-soft leading-relaxed">
            A verification link is on its way to{' '}
            <span className="font-mono text-ink">{email}</span>. Open it to
            activate your account.
          </p>
        </div>
        <p className="field-label mt-6">
          Nothing after a minute? Check spam.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="New here"
      title="Create"
      accent="account"
      standfirst="Free to start. Bring your own API keys."
      footer={
        <div>
          Already registered?{' '}
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
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="At least 8 characters"
        />
        <AuthField
          id="confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="••••••••"
        />

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading} idle="Create account" busy="Creating" />
      </form>
    </AuthShell>
  )
}
