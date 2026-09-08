import type { CodexCredentials } from './auth'
import { codexUsageSchema, type CodexUsageResponse } from './schema'

export const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage'
const REQUEST_TIMEOUT_MS = 15_000

export type CodexFetchFailure =
  'auth_expired' | 'forbidden' | 'rate_limited' | 'server' | 'network' | 'timeout' | 'invalid'

export type CodexFetchResult =
  { ok: true; data: CodexUsageResponse } | { ok: false; failure: CodexFetchFailure; detail: string }

export interface FetchCodexOptions {
  userAgent: string
  fetchImpl?: typeof fetch
}

/** Single GET against the usage endpoint. Classifies failures so the provider can pick a status. */
export async function fetchCodexUsage(
  credentials: CodexCredentials,
  options: FetchCodexOptions
): Promise<CodexFetchResult> {
  const doFetch = options.fetchImpl ?? fetch
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credentials.accessToken}`,
    Accept: 'application/json',
    'User-Agent': options.userAgent
  }
  if (credentials.accountId) headers['ChatGPT-Account-Id'] = credentials.accountId

  let response: Response
  try {
    response = await doFetch(CODEX_USAGE_URL, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    const name = (error as Error)?.name
    return {
      ok: false,
      failure: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
      detail: String(error)
    }
  }

  if (!response.ok) {
    const detail = `${response.status} ${response.statusText}`
    if (response.status === 401) return { ok: false, failure: 'auth_expired', detail }
    if (response.status === 403) return { ok: false, failure: 'forbidden', detail }
    if (response.status === 429) return { ok: false, failure: 'rate_limited', detail }
    return { ok: false, failure: 'server', detail }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (error) {
    return { ok: false, failure: 'invalid', detail: String(error) }
  }
  const parsed = codexUsageSchema.safeParse(json)
  if (!parsed.success) {
    return { ok: false, failure: 'invalid', detail: parsed.error.message }
  }
  return { ok: true, data: parsed.data }
}
