'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <div className="flex items-center gap-5 justify-end pb-3 mb-4 border-b border-rule">
      <button
        onClick={onRegenerate}
        disabled={regenerating}
        className="field-label hover:text-ink disabled:opacity-40 transition-colors duration-150"
      >
        {regenerating ? 'Regenerating' : 'Regenerate'}
      </button>
      <button
        onClick={() => downloadTxt(content, filename)}
        className="field-label hover:text-ink transition-colors duration-150"
      >
        Download
      </button>
      <button
        onClick={() => {
          navigator.clipboard.writeText(content)
          setCopied(true)
          toast.success('Copied to clipboard')
          setTimeout(() => setCopied(false), 2000)
        }}
        className="field-label transition-colors duration-150"
        style={{ color: copied ? 'var(--forest)' : undefined }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="py-4">
      {[100, 88, 94, 72, 85].map((w, i) => (
        <div
          key={i}
          className="h-3 bg-paper-deep animate-pulse mb-3"
          style={{ width: `${w}%` }}
        />
      ))}
      <p className="field-label mt-5">Writing with Claude</p>
    </div>
  )
}

function DocDisplay({ content }: { content: string }) {
  return (
    <div className="bg-paper-raised border border-rule px-8 py-8 max-h-[420px] overflow-y-auto text-ink-soft text-[0.9375rem] leading-[1.75]">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-3xl text-ink leading-tight mb-1 mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="field-label text-ink mt-7 mb-3 pb-2 border-b border-rule">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-ink font-semibold text-sm mt-5 mb-1.5">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3.5">{children}</p>,
          ul: ({ children }) => <ul className="my-2 mb-4 pl-5 list-disc marker:text-rule-strong">{children}</ul>,
          li: ({ children }) => <li className="mb-1.5">{children}</li>,
          strong: ({ children }) => <strong className="text-ink font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-ink-faint">{children}</em>,
          hr: () => <hr className="border-0 border-t border-rule my-5" />,
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
      <DialogContent className="bg-paper border border-ink max-w-3xl max-h-[90vh] overflow-y-auto rounded-none p-8">
        <DialogHeader className="space-y-0 text-left">
          <p className="field-label">Generated for</p>
          <DialogTitle className="font-display text-3xl text-ink leading-tight mt-2">
            {job.job_title}
          </DialogTitle>
          {job.company_name && (
            <p className="text-ink-soft text-sm mt-1">{job.company_name}</p>
          )}
          <div className="title-rule mt-5" />
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as DocumentType)}
          className="mt-6"
        >
          <TabsList className="bg-transparent border-0 rounded-none p-0 h-auto gap-6 justify-start">
            <TabsTrigger
              value="cover_letter"
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-vermilion data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2 text-xs uppercase tracking-widest font-medium text-ink-faint data-[state=active]:text-ink"
            >
              Cover letter
            </TabsTrigger>
            <TabsTrigger
              value="tailored_cv"
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-vermilion data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2 text-xs uppercase tracking-widest font-medium text-ink-faint data-[state=active]:text-ink"
            >
              Tailored CV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover_letter" className="mt-6">
            {coverLetter.isPending && <LoadingSkeleton />}
            {coverLetter.isError && (
              <p className="border-l-2 border-clay pl-3 py-1 text-sm text-clay">
                {coverLetter.error.message}
              </p>
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

          <TabsContent value="tailored_cv" className="mt-6">
            {tailoredCv.isPending && <LoadingSkeleton />}
            {tailoredCv.isError && (
              <p className="border-l-2 border-clay pl-3 py-1 text-sm text-clay">
                {tailoredCv.error.message}
              </p>
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
