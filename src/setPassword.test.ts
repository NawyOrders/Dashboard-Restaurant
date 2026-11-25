import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './auth'
import { isStrongPassword, setInitialPassword } from './setPassword'

const fetchMock = vi.fn<typeof fetch>()
const input = {
  email: 'manager@demo-restaurant.com',
  token: 'inv_tok_8c2f9e1a',
  newPassword: 'NewPassword@2026',
  confirmPassword: 'NewPassword@2026',
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const ok = () =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: 200, isSuccess: true, data: null, errors: null }), { status: 200 }))

describe('set initial password', () => {
  it('posts the four fields anonymously to the tenant origin', async () => {
    ok()
    await setInitialPassword({ ...input, email: ` ${input.email} `, token: ` ${input.token} ` })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${API_BASE_URL}/api/v1/auth/set-initial-password`)
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' })
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(JSON.parse(init?.body as string)).toEqual(input)
  })

  it.each([
    ['short', 'Ab1!'],
    ['no uppercase', 'password@2026'],
    ['no lowercase', 'PASSWORD@2026'],
    ['no digit', 'Password@abcd'],
    ['no special', 'Password2026'],
  ])('rejects a weak password: %s', async (_name, password) => {
    expect(isStrongPassword(password)).toBe(false)
    await expect(setInitialPassword({ ...input, newPassword: password, confirmPassword: password })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts underscore as the special character', () => {
    expect(isStrongPassword('Passw0rd_ok')).toBe(true)
  })

  it('rejects mismatch, bad email and empty token before calling', async () => {
    await expect(setInitialPassword({ ...input, confirmPassword: 'Other@2026x' })).rejects.toMatchObject({ code: 'validation' })
    await expect(setInitialPassword({ ...input, email: 'nope' })).rejects.toMatchObject({ code: 'validation' })
    await expect(setInitialPassword({ ...input, token: '  ' })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rateLimited'],
    [500, 'service'],
  ])('maps HTTP %i to %s', async (status, code) => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status }))
    await expect(setInitialPassword(input)).rejects.toMatchObject({ code })
  })

  it('maps network failures and bad success bodies', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(setInitialPassword(input)).rejects.toMatchObject({ code: 'network' })
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 200 }))
    await expect(setInitialPassword(input)).rejects.toMatchObject({ code: 'invalidResponse' })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: false }), { status: 200 }))
    await expect(setInitialPassword(input)).rejects.toMatchObject({ code: 'invalidResponse' })
  })
})
