import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, clearLegacySession, login, REQUEST_TIMEOUT_MS, revokeSession } from './auth'
import { staffLoginResponse } from './test/fixtures'

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
