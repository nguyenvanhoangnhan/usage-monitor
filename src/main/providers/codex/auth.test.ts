import { describe, expect, it } from 'vitest'
import { codexAuthPath, decodeJwtPayload, extractAccountId, parseCodexAuth } from './auth'

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (s: string): string => Buffer.from(s).toString('base64url')
  return `${b64('{"alg":"none"}')}.${b64(JSON.stringify(payload))}.sig`
}

describe('codexAuthPath', () => {
  it('prefers CODEX_HOME', () => {
    expect(codexAuthPath({ CODEX_HOME: '/tmp/codex-home' })).toBe('/tmp/codex-home/auth.json')
  })
  it('falls back to ~/.codex', () => {
    expect(codexAuthPath({})).toMatch(/\/\.codex\/auth\.json$/)
  })
})

describe('parseCodexAuth', () => {
  it('reads access token and explicit account id', () => {
    const result = parseCodexAuth({
      tokens: { access_token: 'abc', account_id: 'acct_1' },
      last_refresh: '2026-09-08T00:00:00Z'
    })
    expect(result).toEqual({
      ok: true,
      credentials: { accessToken: 'abc', accountId: 'acct_1', lastRefresh: '2026-09-08T00:00:00Z' }
    })
  })

  it('derives the account id from the id token claim', () => {
    const idToken = fakeJwt({ 'https://api.openai.com/auth': { chatgpt_account_id: 'acct_jwt' } })
    const result = parseCodexAuth({ tokens: { access_token: 'abc', id_token: idToken } })
    expect(result.ok && result.credentials.accountId).toBe('acct_jwt')
  })

  it('reports missing credentials for API-key-only files', () => {
    expect(parseCodexAuth({ OPENAI_API_KEY: 'sk-x' })).toMatchObject({
      ok: false,
      errorKey: 'codex.authMissing'
    })
  })

  it('reports a missing account id', () => {
    expect(parseCodexAuth({ tokens: { access_token: 'abc' } })).toMatchObject({
      ok: false,
      errorKey: 'codex.accountMissing'
    })
  })
})

describe('jwt helpers', () => {
  it('decodes a payload without verifying', () => {
    expect(decodeJwtPayload(fakeJwt({ a: 1 }))).toEqual({ a: 1 })
  })
  it('returns null for garbage', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
    expect(extractAccountId({ id_token: 'x.y.z' })).toBeNull()
  })
})
