'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthError, AuthSubmit } from '@/components/auth/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/upload')
    router.refresh()
  }

  return (
    <AuthShell
      eyebrow="Returning"
      title="Sign"
      accent="in"
      standfirst="Pick up where your search left off."
      footer={
        <>
          <div>
            <Link href="/forgot-password" className="link-underline">
              Forgotten your password?
            </Link>
          </div>
          <div>
            No account yet?{' '}
            <Link href="/signup" className="link-underline font-medium text-ink">
              Create one
            </Link>
          </div>
        </>
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
          placeholder="••••••••"
        />

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading} idle="Sign in" busy="Signing in" />
      </form>
    </AuthShell>
  )
}
