'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-700 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="text-4xl">📧</div>
            <h2 className="text-xl font-semibold text-white">Check your email</h2>
            <p className="text-slate-400">
              We sent a password reset link to <span className="text-white">{email}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">
            Job<span className="text-[#10B981]">Radar</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded p-2">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-slate-400">
            <Link href="/login" className="text-[#10B981] hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
