import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  refreshSession,
  API_BASE_URL_ERROR,
  clearLegacySession,
  login,
  REQUEST_TIMEOUT_MS,
  resolveApiOrigin,
  revokeSession,
} from './auth'
import { staffLoginResponse, staffRefreshResponse } from './test/fixtures'

const fetchMock = vi.fn<typeof fetch>()
function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('restaurant staff API adapter', () => {
  it.each(['Owner', 'BranchManager', 'Staff'])('uses server-returned %s identity and permissions', async (role) => {
    respond(staffLoginResponse(role))
    const result = await login(' staff@example.test ', ' original password ')
    expect(result.user.roles).toEqual([role])
    expect(result.user.permissions).toEqual(['Orders.Read'])
    expect(result.apiOrigin).toBe(API_BASE_URL)
    expect(result.user.name).toBe('Test operator')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/api/v1/auth/login`)
    expect(JSON.parse(init!.body as string)).toEqual({ email: 'staff@example.test', password: ' original password ' })
    expect(init).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' })
    expect(init!.headers).not.toHaveProperty('X-Tenant-Id')
    expect(init!.headers).not.toHaveProperty('Authorization')
  })

  it.each([[400, 'invalidCredentials'], [401, 'invalidCredentials'], [422, 'invalidCredentials'], [403, 'forbidden'], [429, 'rateLimited'], [500, 'service'], [503, 'service']])('maps HTTP %s to a safe error', async (status, code) => {
    respond({ errors: { detail: 'Sensitive server error not for display' } }, status as number)
    await expect(login('staff@example.test', 'test')).rejects.toMatchObject({ code, message: code })
  })

  it('does not expose an unknown tenant response', async () => {
    respond({
      title: 'Tenant Not Found',
      status: 404,
      detail: "The tenant identified by subdomain 'tenant' was not found.",
    }, 404)

    await expect(login('staff@example.test', 'test')).rejects.toMatchObject({
      code: 'service',
      message: 'service',
    })
  })

  it('does not call the server for missing credentials', async () => {
    await expect(login('', '')).rejects.toMatchObject({ code: 'invalidCredentials' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('handles network failure without leaking credentials', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(login('staff@example.test', 'private')).rejects.toMatchObject({ code: 'network' })
  })

  it.each([
    null,
    { isSuccess: false },
    { isSuccess: true, data: null },
    { isSuccess: true, data: { accessToken: 'incomplete' } },
  ])('rejects an invalid envelope', async (body) => {
    respond(body)
    await expect(login('staff@example.test', 'test')).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it.each([
    { userId: null }, { email: '' }, { accessToken: '' }, { accessToken: 'line\r\nbreak' },
    { tokenType: 'Basic' }, { expiresAtUtc: 'not-a-date' },
    { expiresAtUtc: '2000-01-01T00:00:00Z' }, { expiresIn: 0 },
    { roles: [null] }, { permissions: 'Admin' }, { refreshToken: 3 },
  ])('fails closed on malformed session data %j', async (patch) => {
    const body = staffLoginResponse()
    respond({ ...body, data: { ...body.data, ...patch } })
    await expect(login('staff@example.test', 'test')).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('allows documented nullable roles, permissions and name without invented privileges', async () => {
    const body = staffLoginResponse()
    respond({ ...body, data: { ...body.data, roles: null, permissions: null, fullName: null, refreshToken: null } })
    const result = await login('staff@example.test', 'test')
    expect(result.user).toMatchObject({ name: 'staff@example.test', roles: [], permissions: [] })
    expect(result.refreshToken).toBeNull()
  })

  it('rejects HTML success responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Proxy error</html>'))
    await expect(login('staff@example.test', 'test')).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('times out a hanging request', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const rejected = expect(login('staff@example.test', 'test')).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await rejected
  })

  it('also times out while reading the response body', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(async (_url, init) => ({
      status: 200, ok: true,
      json: () => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
    } as Response))
    const rejected = expect(login('staff@example.test', 'test')).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await rejected
  })

  it('propagates caller cancellation', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const pending = login('staff@example.test', 'test', controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('never persists passwords or tokens', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    respond(staffLoginResponse())
    await login('staff@example.test', 'private-password')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('revokes the actual refresh token on the same tenant server', async () => {
    respond(staffLoginResponse())
    const session = await login('staff@example.test', 'test')
    respond({ isSuccess: true, statusCode: 200, data: null })
    expect(await revokeSession(session)).toBe(true)
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe(`${API_BASE_URL}/api/v1/auth/revoke`)
    expect(JSON.parse(init!.body as string).refreshToken).toBe(session.refreshToken)
    expect(init!.headers).toHaveProperty('Authorization', `Bearer ${session.accessToken}`)
  })

  it('reports failed revocation without throwing', async () => {
    respond(staffLoginResponse())
    const session = await login('staff@example.test', 'test')
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    expect(await revokeSession(session)).toBe(false)
  })

  it('does not send tokens for a mismatched tenant origin', async () => {
    respond(staffLoginResponse())
    const session = await login('staff@example.test', 'test')
    expect(await revokeSession({ ...session, apiOrigin: 'https://other.example.test' })).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('removes only the obsolete demo session, tolerating blocked storage', () => {
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    clearLegacySession()
    expect(remove).toHaveBeenCalledWith('nawy_session')
    expect(remove).toHaveBeenCalledTimes(1)
    remove.mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    expect(clearLegacySession).not.toThrow()
  })
})

describe('tenant API origin resolution', () => {
  const slug = 'el-fahm-01a1c1ed11cf79ffbe51681899bb90fd'

  it('derives the tenant API origin from the admin hostname', () => {
    expect(resolveApiOrigin(`${slug}.admin.nawyorders.com`)).toEqual({
      ok: true,
      origin: `https://${slug}.api.nawyorders.com`,
    })
  })

  it('keeps the full slug, including its hash suffix, as one label', () => {
    const result = resolveApiOrigin(`  ${slug.toUpperCase()}.ADMIN.NAWYORDERS.COM  `)
    expect(result).toEqual({ ok: true, origin: `https://${slug}.api.nawyorders.com` })
  })

  it('ignores an explicit port', () => {
    expect(resolveApiOrigin(`${slug}.admin.nawyorders.com:5173`)).toEqual({
      ok: true,
      origin: `https://${slug}.api.nawyorders.com`,
    })
  })

  it.each([
    ['admin.nawyorders.com', 'missingTenant'],
    ['localhost', 'missingTenant'],
    ['localhost:5173', 'missingTenant'],
    ['127.0.0.1', 'missingTenant'],
    ['[::1]', 'missingTenant'],
    ['app.vercel.app', 'missingTenant'],
    ['nawyorders.com', 'missingTenant'],
    ['evil-admin.nawyorders.com', 'missingTenant'],
    [`${slug}.admin.nawyorders.com.evil.test`, 'missingTenant'],
    ['a.b.admin.nawyorders.com', 'invalidTenant'],
    ['.admin.nawyorders.com', 'invalidTenant'],
    ['bad_slug.admin.nawyorders.com', 'invalidTenant'],
  ])('refuses %s with %s instead of guessing a tenant', (hostname, reason) => {
    expect(resolveApiOrigin(hostname)).toEqual({ ok: false, reason })
  })

  it('prefers a valid HTTPS override and normalizes it', () => {
    expect(resolveApiOrigin(`${slug}.admin.nawyorders.com`, '  HTTPS://Tenant.Test:8443/  ')).toEqual({
      ok: true,
      origin: 'https://tenant.test',
    })
  })

  it('fails closed on an insecure or credentialed override', () => {
    expect(resolveApiOrigin(`${slug}.admin.nawyorders.com`, 'http://tenant.test')).toEqual({
      ok: false,
      reason: 'invalidOverride',
    })
    expect(resolveApiOrigin(`${slug}.admin.nawyorders.com`, 'https://user:secret@tenant.test')).toEqual({
      ok: false,
      reason: 'invalidOverride',
    })
    expect(resolveApiOrigin(`${slug}.admin.nawyorders.com`, 'not a url')).toEqual({
      ok: false,
      reason: 'invalidOverride',
    })
  })

  it('uses the explicit override in the Vitest environment', () => {
    expect(API_BASE_URL).toBe('https://tenant.test')
    expect(API_BASE_URL_ERROR).toBeNull()
  })
})

describe('session refresh', () => {
  const session = {
    apiOrigin: API_BASE_URL,
    user: { id: '1', name: 'n', email: 'e', roles: [], permissions: [] },
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    expiresAt: Date.now() - 1,
  }

  it('sends the current refresh token and returns the rotated pair', async () => {
    respond(staffRefreshResponse())
    const result = await refreshSession(session)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/api/v1/auth/refresh`)
    expect(JSON.parse(init!.body as string)).toEqual({ refreshToken: 'old-refresh' })
    expect(result).toMatchObject({
      accessToken: 'test-access-token-rotated',
      refreshToken: 'test-refresh-token-rotated',
    })
  })

  it('shares one in-flight request so the single-use token is never sent twice', async () => {
    respond(staffRefreshResponse())
    const [first, second] = await Promise.all([refreshSession(session), refreshSession(session)])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it.each([[401, 'forbidden'], [403, 'forbidden'], [429, 'rateLimited'], [500, 'service'], [503, 'service']])('maps refresh HTTP %s to a safe error', async (status, code) => {
    respond({ errors: { detail: 'Sensitive server error not for display' } }, status as number)
    await expect(refreshSession(session)).rejects.toMatchObject({ code, message: code })
  })

  it('does not call the server when the session has no refresh token', async () => {
    await expect(refreshSession({ ...session, refreshToken: null })).rejects.toMatchObject({ code: 'configuration' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects when the server omits the rotated refresh token', async () => {
    const body = staffRefreshResponse()
    // @ts-expect-error verifies runtime validation of the contract
    delete body.data.refreshToken
    respond(body)
    await expect(refreshSession(session)).rejects.toMatchObject({ code: 'invalidResponse' })
  })
})
