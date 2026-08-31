'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const GlowOrb = ({ style }: { style: React.CSSProperties }) => (
  <div aria-hidden style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', ...style }} />
)

const pageStyle = {
  background: 'linear-gradient(135deg, #080D1A 0%, #0D1F12 25%, #060B18 50%, #0A1628 75%, #080D1A 100%)',
  backgroundSize: '300% 300%',
}

const cardStyle = {
  background: 'rgba(13, 20, 36, 0.85)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(16,185,129,0.2)',
  borderRadius: 16,
  boxShadow: '0 0 40px rgba(16,185,129,0.08), 0 24px 64px rgba(0,0,0,0.5)',
  padding: '2.5rem',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
}

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
      <div className="min-h-screen flex items-center justify-center p-4 animate-gradient-shift" style={pageStyle}>
        <GlowOrb style={{ top: '15%', left: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }} />
        <div className="w-full max-w-md text-center animate-scale-in" style={cardStyle}>
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            Check your email
          </h2>
          <p className="text-slate-400">
            We sent a verification link to{' '}
            <span className="text-[#34D399] font-medium">{email}</span>.
            Click it to activate your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-gradient-shift" style={pageStyle}>
      <GlowOrb style={{ top: '15%', left: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }} />
      <GlowOrb style={{ bottom: '15%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md animate-scale-in" style={cardStyle}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            <span className="text-white">Job</span>
            <span style={{
              background: 'linear-gradient(135deg, #10B981, #34D399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Radar</span>
          </h1>
          <p className="text-slate-400 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300 text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="text-white placeholder:text-slate-600 border-0"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300 text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="text-white placeholder:text-slate-600 border-0"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-slate-300 text-sm font-medium">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className="text-white placeholder:text-slate-600 border-0"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg p-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full text-white font-semibold text-sm h-11 rounded-lg btn-glow animate-glow-pulse border-0"
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#34D399] hover:text-[#6EE7B7] transition-colors font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
