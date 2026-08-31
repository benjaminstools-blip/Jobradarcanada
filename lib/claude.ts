import Anthropic from '@anthropic-ai/sdk'

// Requires a resolved key — no env fallback here. Callers resolve the key via
// lib/keys.ts (resolveAnthropicKey) so the owner-only fallback lives in one place.
export function createClaudeClient(apiKey: string) {
  if (!apiKey) {
    throw new Error('No Anthropic API key provided.')
  }
  return new Anthropic({ apiKey })
}

// Pinned exact model string — never an alias. Stored on every evaluation row
// alongside PROMPT_VERSION so a scoring change is traceable after the fact.
export const SCORING_MODEL = 'claude-opus-5'
export const CV_PARSE_MODEL = 'claude-opus-5'
export const GENERATION_MODEL = 'claude-opus-5'

export const PROMPT_VERSION = 'v1'

// Extracts the concatenated text of a response. Content is a discriminated
// union — thinking blocks come before text blocks, so filtering by type is
// required rather than reading content[0].
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}
