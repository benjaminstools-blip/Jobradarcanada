'use client'

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CVProfileCard } from '@/components/cv/CVProfileCard'
import { ApiKeysGate } from '@/components/ApiKeysGate'
import type { CVProfile } from '@/types'

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery<CVProfile | null>({
    queryKey: ['cv-profile'],
    queryFn: async () => {
      const res = await fetch('/api/cv/profile')
      if (!res.ok) throw new Error('Failed to load profile')
      const json = await res.json()
      return json.profile ?? null
    },
  })

  const apiKeys = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/settings/keys')
      const json = await res.json()
      return json.keys as { anthropic_set: boolean; apify_set: boolean }
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB.')
      return
    }

    setUploading(true)
    setUploadProgress(10)

    const formData = new FormData()
    formData.append('file', file)

    setUploadProgress(30)

    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', body: formData })
      setUploadProgress(80)
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? 'Upload failed. Please try again.')
        return
      }

      setUploadProgress(100)
      toast.success('CV uploaded and parsed successfully!')
      queryClient.invalidateQueries({ queryKey: ['cv-profile'] })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!apiKeys.isLoading && apiKeys.data && !apiKeys.data.anthropic_set) {
    return (
      <div className="stagger-in">
        <UploadMasthead />
        <div className="mt-10">
          <ApiKeysGate
            needsAnthropic
            needsApify={false}
            reason="Parsing your CV needs your Anthropic key."
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="stagger-in max-w-3xl">
        <UploadMasthead />

        {/* Dropzone as a ruled plate, not a dashed box. */}
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="group w-full mt-10 border border-rule-strong bg-paper-deep hover:bg-vermilion-wash hover:border-vermilion disabled:cursor-not-allowed transition-colors duration-150 text-left"
        >
          <div className="flex items-baseline justify-between gap-6 px-6 py-10">
            <div>
              <p className="font-display text-3xl text-ink leading-none">
                {profile ? 'Replace your CV' : 'Add your CV'}
              </p>
              <p className="text-ink-soft text-sm mt-3">
                Claude reads it and builds your profile — occupation, NOC code, skills.
              </p>
            </div>
            <span className="field-label group-hover:text-vermilion transition-colors duration-150 shrink-0">
              PDF · 5 MB max
            </span>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {uploading && (
          <div className="mt-5 animate-fade-in">
            <p className="font-mono text-xs text-ink-soft tabular-nums">
              Parsing with Claude — {uploadProgress}%
            </p>
            <div className="h-[2px] bg-rule mt-2 overflow-hidden">
              <div
                className="h-full bg-vermilion transition-[width] duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-16 max-w-3xl">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-2.5 w-20 bg-paper-deep animate-pulse" />
            <div className="h-10 w-2/3 bg-paper-deep animate-pulse" />
            <div className="h-24 w-full bg-paper-deep animate-pulse" />
          </div>
        ) : profile ? (
          <CVProfileCard profile={profile} />
        ) : (
          !uploading && (
            <p className="field-label text-center py-12">
              Nothing on file yet
            </p>
          )
        )}
      </div>
    </div>
  )
}

function UploadMasthead() {
  return (
    <header>
      <p className="field-label">Step one</p>
      <h1 className="display-title mt-3">
        Your <span className="italic text-vermilion">CV</span>
      </h1>
      <div className="title-rule mt-5" />
      <p className="text-ink-soft mt-4 max-w-xl text-[1.0625rem] leading-relaxed">
        Everything downstream — match scores, cover letters, tailored CVs — is
        built from this document and nothing else.
      </p>
    </header>
  )
}
