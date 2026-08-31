'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Sparkles, Download, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import type { Job, DocumentType } from '@/types'

interface Props {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
}

async function generateDoc(
  jobId: string,
  type: DocumentType,
  refresh = false
): Promise<string> {
  const res = await fetch(`/api/jobs/${jobId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, refresh }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Generation failed')
  return data.document as string
}

function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DocActions({
  content,
  filename,
  onRegenerate,
  regenerating,
}: {
  content: string
  filename: string
  onRegenerate: () => void
  regenerating: boolean
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 10, justifyContent: 'flex-end' }}>
      <Button
        size="sm"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#94A3B8',
          padding: '0 10px',
          height: 30,
          fontSize: 12,
        }}
        onClick={onRegenerate}
        disabled={regenerating}
      >
        <RefreshCw size={11} style={{ marginRight: 4, opacity: regenerating ? 0.5 : 1 }} />
        {regenerating ? 'Regenerating…' : 'Regenerate'}
      </Button>
      <Button
        size="sm"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#94A3B8',
          padding: '0 10px',
          height: 30,
          fontSize: 12,
        }}
        onClick={() => downloadTxt(content, filename)}
      >
        <Download size={11} style={{ marginRight: 4 }} />
        Download
      </Button>
      <Button
        size="sm"
        style={{
          background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
          color: copied ? '#10B981' : '#94A3B8',
          padding: '0 10px',
          height: 30,
          fontSize: 12,
          transition: 'all 0.2s',
        }}
        onClick={() => {
          navigator.clipboard.writeText(content)
          setCopied(true)
          toast.success('Copied to clipboard')
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        {copied ? <Check size={11} style={{ marginRight: 4 }} /> : <Copy size={11} style={{ marginRight: 4 }} />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '12px 0' }}>
      {[100, 88, 94, 72, 85].map((w, i) => (
        <Skeleton
          key={i}
          style={{
            height: 12,
            width: `${w}%`,
            background: 'rgba(255,255,255,0.06)',
            marginBottom: 10,
            borderRadius: 4,
          }}
        />
      ))}
      <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Generating with AI…</p>
    </div>
  )
}

function DocDisplay({ content }: { content: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid #1E2D3D',
        borderRadius: 8,
        padding: '20px 20px',
        maxHeight: 420,
        overflowY: 'auto',
        color: '#CBD5E1',
        fontSize: 13,
        lineHeight: 1.8,
      }}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 6, borderBottom: '1px solid #1E2D3D', paddingBottom: 4 }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 4 }}>{children}</h3>
          ),
          p: ({ children }) => (
            <p style={{ margin: '0 0 10px', color: '#CBD5E1' }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '4px 0 10px', paddingLeft: 18 }}>{children}</ul>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 3, color: '#94A3B8' }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ color: '#E2E8F0', fontWeight: 600 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: '#94A3B8' }}>{children}</em>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid #1E2D3D', margin: '12px 0' }} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function GenerateDocsModal({ job, open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<DocumentType>('cover_letter')
  const queryClient = useQueryClient()

  // `enabled` drives the lazy fetching that used to need an effect: the cover
  // letter starts when the dialog opens, the CV only once its tab is selected.
  // The route caches generated documents in `generated_documents` and replays
  // them, so staleTime: Infinity keeps a reopen from making a pointless call.
  const coverLetter = useQuery({
    queryKey: ['doc', job.id, 'cover_letter'],
    queryFn: () => generateDoc(job.id, 'cover_letter'),
    enabled: open,
    staleTime: Infinity,
    retry: false,
  })

  const tailoredCv = useQuery({
    queryKey: ['doc', job.id, 'tailored_cv'],
    queryFn: () => generateDoc(job.id, 'tailored_cv'),
    enabled: open && activeTab === 'tailored_cv',
    staleTime: Infinity,
    retry: false,
  })

  // Regeneration bypasses the server-side cache, so it is a mutation whose
  // result is written back over the cached query.
  const regenerate = useMutation({
    mutationFn: (type: DocumentType) => generateDoc(job.id, type, true),
    onSuccess: (document, type) => {
      queryClient.setQueryData(['doc', job.id, type], document)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Regeneration failed')
    },
  })

  const regenerating = (type: DocumentType) =>
    regenerate.isPending && regenerate.variables === type

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) setActiveTab('cover_letter')
    onOpenChange(isOpen)
  }

  const clFilename = `cover-letter-${job.company_name ?? job.job_title}.txt`.replace(/\s+/g, '-').toLowerCase()
  const cvFilename = `tailored-cv-${job.company_name ?? job.job_title}.txt`.replace(/\s+/g, '-').toLowerCase()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        style={{
          background: '#0D1424',
          border: '1px solid #1E2D3D',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              color: '#fff',
              fontFamily: 'Syne, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 16,
            }}
          >
            <Sparkles size={16} color="#10B981" />
            AI Documents
          </DialogTitle>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            {job.job_title}{job.company_name ? ` · ${job.company_name}` : ''}
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as DocumentType)}
          style={{ marginTop: 8 }}
        >
          <TabsList
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #1E2D3D',
              borderRadius: 8,
              padding: 3,
            }}
          >
            <TabsTrigger value="cover_letter" style={{ fontSize: 13, borderRadius: 6 }}>
              Cover Letter
            </TabsTrigger>
            <TabsTrigger value="tailored_cv" style={{ fontSize: 13, borderRadius: 6 }}>
              Tailored CV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover_letter" style={{ marginTop: 12 }}>
            {coverLetter.isPending && <LoadingSkeleton />}
            {coverLetter.isError && (
              <p style={{ color: '#EF4444', fontSize: 13 }}>{coverLetter.error.message}</p>
            )}
            {coverLetter.data && (
              <>
                <DocActions
                  content={coverLetter.data}
                  filename={clFilename}
                  onRegenerate={() => regenerate.mutate('cover_letter')}
                  regenerating={regenerating('cover_letter')}
                />
                <DocDisplay content={coverLetter.data} />
              </>
            )}
          </TabsContent>

          <TabsContent value="tailored_cv" style={{ marginTop: 12 }}>
            {tailoredCv.isPending && <LoadingSkeleton />}
            {tailoredCv.isError && (
              <p style={{ color: '#EF4444', fontSize: 13 }}>{tailoredCv.error.message}</p>
            )}
            {tailoredCv.data && (
              <>
                <DocActions
                  content={tailoredCv.data}
                  filename={cvFilename}
                  onRegenerate={() => regenerate.mutate('tailored_cv')}
                  regenerating={regenerating('tailored_cv')}
                />
                <DocDisplay content={tailoredCv.data} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
