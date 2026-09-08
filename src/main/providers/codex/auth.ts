import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface CodexCredentials {
  accessToken: string
  accountId: string | null
  lastRefresh: string | null
}

export type CodexAuthErrorKey = 'codex.authMissing' | 'codex.authInvalid' | 'codex.accountMissing'

export type CodexAuthResult =
  | { ok: true; credentials: CodexCredentials }
  | { ok: false; errorKey: CodexAuthErrorKey; detail?: string }

/** `$CODEX_HOME/auth.json`, else `~/.codex/auth.json`, matching the CLI. */
export function codexAuthPath(env: NodeJS.ProcessEnv = process.env): string {
  const home = env.CODEX_HOME?.trim()
  return join(home && home.length > 0 ? home : join(homedir(), '.codex'), 'auth.json')
}

/** Reads the CLI credential file. Never logs or returns anything beyond what the API call needs. */
export async function readCodexAuth(path: string): Promise<CodexAuthResult> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    return code === 'ENOENT'
      ? { ok: false, errorKey: 'codex.authMissing' }
      : { ok: false, errorKey: 'codex.authInvalid', detail: String(error) }
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    return { ok: false, errorKey: 'codex.authInvalid', detail: String(error) }
  }
  return parseCodexAuth(json)
}

export function parseCodexAuth(json: unknown): CodexAuthResult {
  if (typeof json !== 'object' || json === null) {
    return { ok: false, errorKey: 'codex.authInvalid' }
  }
  const root = json as Record<string, unknown>
  const tokens = root.tokens
  if (typeof tokens !== 'object' || tokens === null) {
    return { ok: false, errorKey: 'codex.authMissing', detail: 'no ChatGPT tokens in auth file' }
  }
  const t = tokens as Record<string, unknown>
  const accessToken = typeof t.access_token === 'string' ? t.access_token : ''
  if (!accessToken) {
    return { ok: false, errorKey: 'codex.authMissing', detail: 'access_token empty' }
  }
  const accountId = extractAccountId(t)
  if (!accountId) {
    return { ok: false, errorKey: 'codex.accountMissing' }
  }
  return {
    ok: true,
    credentials: {
      accessToken,
      accountId,
      lastRefresh: typeof root.last_refresh === 'string' ? root.last_refresh : null
    }
  }
}

/** Prefers the explicit `account_id`; falls back to the ChatGPT claim in the id token. */
export function extractAccountId(tokens: Record<string, unknown>): string | null {
  if (typeof tokens.account_id === 'string' && tokens.account_id) return tokens.account_id
  const idToken = typeof tokens.id_token === 'string' ? tokens.id_token : null
  const payload = idToken ? decodeJwtPayload(idToken) : null
  const claim = payload?.['https://api.openai.com/auth']
  if (typeof claim === 'object' && claim !== null) {
    const id = (claim as Record<string, unknown>).chatgpt_account_id
    if (typeof id === 'string' && id) return id
  }
  return null
}

/** Decodes the JWT payload without verifying the signature; we only read claims. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    const parsed = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}
