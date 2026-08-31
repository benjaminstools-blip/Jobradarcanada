'use client'

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, RefreshCw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload CV</h1>
          <p className="text-slate-400 mt-1">Upload your CV as a PDF and we&apos;ll extract your profile automatically.</p>
        </div>
        <ApiKeysGate needsAnthropic needsApify={false} reason="Parsing your CV needs your Anthropic key." />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload CV</h1>
        <p className="text-slate-400 mt-1">Upload your CV as a PDF and we&apos;ll extract your profile automatically.</p>
      </div>

      <div
        className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center hover:border-[#10B981] transition-colors cursor-pointer group"
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-3 text-slate-500 group-hover:text-[#10B981] transition-colors" size={36} />
        <p className="text-slate-300 font-medium">Click to upload your CV</p>
        <p className="text-slate-500 text-sm mt-1">PDF only, max 5MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <RefreshCw size={14} className="animate-spin" />
            <span>Uploading and parsing your CV with AI…</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5 bg-slate-800" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40 bg-slate-800" />
          <Skeleton className="h-24 w-full bg-slate-800" />
          <Skeleton className="h-16 w-full bg-slate-800" />
        </div>
      ) : profile ? (
        <CVProfileCard profile={profile} />
      ) : (
        !uploading && (
          <p className="text-slate-500 text-sm text-center py-4">
            No CV uploaded yet. Upload a PDF above to get started.
          </p>
        )
      )}
    </div>
  )
}
