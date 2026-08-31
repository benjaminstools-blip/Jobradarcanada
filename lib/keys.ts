// Per-user API key resolution.
//
// Every user must supply their own Anthropic + Apify keys. The owner's shared
// env keys are used ONLY for allowlisted owner user IDs (owner-only fallback) —
// this is what stops a random user from draining the owner's credits.

export const OWNER_USER_IDS = (process.env.OWNER_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function isOwner(userId: string): boolean {
  return OWNER_USER_IDS.includes(userId)
}

// Returns a usable key, or null when the user has none and isn't an owner.
export function resolveAnthropicKey(userId: string, userKey?: string | null): string | null {
  if (userKey) return userKey
  if (isOwner(userId)) return process.env.ANTHROPIC_API_KEY ?? null
  return null
}

export function resolveApifyKey(userId: string, userKey?: string | null): string | null {
  if (userKey) return userKey
  if (isOwner(userId)) return process.env.APIFY_API_KEY ?? null
  return null
}

// Shared error payloads for routes to return with status 400.
export const NO_ANTHROPIC_KEY = {
  error: 'Add your Anthropic API key in Settings to use AI features.',
  code: 'NO_ANTHROPIC_KEY',
} as const

export const NO_APIFY_KEY = {
  error: 'Add your Apify API key in Settings to fetch jobs.',
  code: 'NO_APIFY_KEY',
} as const
