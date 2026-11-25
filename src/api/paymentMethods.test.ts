import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'

const fetchMock = vi.fn<typeof fetch>()

function http() {
  return createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })
}

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const instapay = {
  paymentMethod: 'InstaPay',
  nameAr: 'إنستا باي',
  nameEn: 'InstaPay',
  accountIdentifier: 'shop@instapay',
  isEnabled: true,
  requiresVerificationProof: true,
  instructionsAr: null,
  instructionsEn: 'Upload the receipt',
}

beforeEach(() => fetchMock.mockReset())

describe('payment methods HTTP adapter', () => {
  it('lists configurations with GET /api/v1/admin/payment-methods', async () => {
    respond([instapay])
    const result = await http().listPaymentMethods()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/payment-methods')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(result).toEqual([{ ...instapay, instructionsAr: null }])
  })

  it('rejects malformed rows', async () => {
    respond([{ paymentMethod: 'Bitcoin', isEnabled: true, requiresVerificationProof: false }])
    await expect(http().listPaymentMethods()).rejects.toMatchObject({ code: 'invalidResponse' })
    respond({ not: 'an array' })
    await expect(http().listPaymentMethods()).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('patches by method name and sends only the supplied fields', async () => {
    respond(instapay)
    await http().updatePaymentMethod('InstaPay', { accountIdentifier: 'shop@instapay', instructionsAr: '' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/payment-methods/InstaPay')
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(init?.body as string)).toEqual({ accountIdentifier: 'shop@instapay', instructionsAr: '' })
  })

  it.each([
    ['Cash', { isEnabled: false }],
    ['Cash', { requiresVerificationProof: true }],
    ['Cash', { accountIdentifier: '0100' }],
    ['InstaPay', { requiresVerificationProof: false }],
    ['InstaPay', { nameEn: '   ' }],
    ['InstaPay', { nameAr: 'x'.repeat(201) }],
    ['InstaPay', { accountIdentifier: 'x'.repeat(101) }],
    ['MobileWallet', { instructionsEn: 'x'.repeat(501) }],
  ] as const)('refuses %s %j before any request', async (method, input) => {
    await expect(http().updatePaymentMethod(method, input)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows clearing the account identifier on Cash with an empty string', async () => {
    respond({ ...instapay, paymentMethod: 'Cash', accountIdentifier: null, requiresVerificationProof: false })
    await http().updatePaymentMethod('Cash', { accountIdentifier: '' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    [403, 'forbidden'],
    [404, 'notFound'],
    [422, 'validation'],
  ])('maps HTTP %s to %s', async (status, code) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ errors: { detail: 'x' } }), { status }))
    await expect(http().listPaymentMethods()).rejects.toMatchObject({ code })
  })
})

describe('mock payment methods', () => {
  it('keeps unspecified fields, clears with an empty string and persists', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const updated = await api.updatePaymentMethod('InstaPay', { instructionsEn: '' })
    expect(updated.instructionsEn).toBeNull()
    expect(updated.accountIdentifier).toBe('demo@instapay')
    const list = await api.listPaymentMethods()
    expect(list.find((item) => item.paymentMethod === 'InstaPay')?.instructionsEn).toBeNull()
  })

  it('enforces the Cash invariants and account identifier rule', async () => {
    const api = createMockApi({ latencyMs: 0 })
    await expect(api.updatePaymentMethod('Cash', { isEnabled: false })).rejects.toMatchObject({ code: 'validation' })
    await expect(api.updatePaymentMethod('MobileWallet', { isEnabled: true, accountIdentifier: '' })).rejects.toMatchObject({ code: 'validation' })
    const wallet = await api.updatePaymentMethod('MobileWallet', { isEnabled: true })
    expect(wallet.isEnabled).toBe(true)
  })
})
