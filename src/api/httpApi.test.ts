import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'

const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const payload = status === 304 ? null : JSON.stringify(body)
  fetchMock.mockResolvedValueOnce(new Response(payload, { status, headers }))
}

function api(token: string | null = 'server-token') {
  return createHttpApi({
    baseUrl: 'https://api.test/',
    getAccessToken: () => token,
    fetchImpl: fetchMock,
    timeoutMs: 1_000,
  })
}

function headerOf(init: RequestInit | undefined, name: string) {
  return (init?.headers as Record<string, string> | undefined)?.[name]
}

const orderItem = {
  orderId: '00000000-0000-4000-8000-000000000101',
  orderNumber: 'ORD-2841',
  status: 2,
  fulfilmentType: 1,
  branchId: '00000000-0000-4000-8000-0000000000bb',
  customerName: 'Mona',
  total: 148.5,
  vatAmount: 20.79,
  createdAtUtc: '2026-11-11T09:12:00Z',
  paymentMethod: 1,
  paymentStatus: 1,
}

function paged(items: unknown[] = [orderItem]) {
  return {
    statusCode: 200,
    isSuccess: true,
    data: {
      items,
      totalCount: items.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  }
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('HTTP API adapter', () => {
  it('builds the admin orders query, sends the bearer token and parses the envelope', async () => {
    respond(paged())
    const result = await api().listOrders({ status: 2, pageNumber: 1, pageSize: 10 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ orderId: orderItem.orderId, status: 2, total: 148.5 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/orders?status=2&pageNumber=1&pageSize=10')
    expect(headerOf(init, 'Authorization')).toBe('Bearer server-token')
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
    expect(headerOf(init, 'Content-Type')).toBeUndefined()
  })

  it('refuses to call the server without an access token', async () => {
    await expect(api(null).listOrders()).rejects.toMatchObject({ code: 'unauthorized' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [400, 'validation'],
    [422, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [429, 'rateLimited'],
    [500, 'service'],
    [503, 'service'],
  ])('maps HTTP %s to %s without leaking the body', async (status, code) => {
    respond({ errors: { detail: 'internal secret' } }, status as number)
    await expect(api().listOrders()).rejects.toMatchObject({ code, message: code })
  })

  it('rejects malformed envelopes and malformed order rows', async () => {
    respond({ isSuccess: true, data: null })
    await expect(api().listOrders()).rejects.toMatchObject({ code: 'invalidResponse' })

    respond(paged([{ orderId: 'x' }]))
    await expect(api().listOrders()).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('reports network failure as a safe network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(api().listOrders()).rejects.toMatchObject({ code: 'network' })
  })

  it('posts a validated status transition with an encoded id', async () => {
    respond({ isSuccess: true, data: null })
    await api().transitionOrderStatus('abc/123', 3)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/orders/abc%2F123/transition-status')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init!.body as string)).toEqual({ targetStatus: 3 })
  })

  it('validates transition input before calling the server', async () => {
    await expect(api().transitionOrderStatus('', 3)).rejects.toMatchObject({ code: 'validation' })
    await expect(api().transitionOrderStatus('id', 3.5)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a not-modified result for a matching branding ETag', async () => {
    respond(null, 304, { ETag: '"v1"' })
    const result = await api().getBranding('"v1"')
    expect(result).toEqual({ notModified: true, etag: '"v1"' })
    const [, init] = fetchMock.mock.calls[0]
    expect(headerOf(init, 'If-None-Match')).toBe('"v1"')
  })

  it('parses branding and prefers the response ETag', async () => {
    respond(
      {
        isSuccess: true,
        data: {
          tenantId: '00000000-0000-4000-8000-0000000000aa',
          nameEn: 'Karam Al-Sham',
          primaryColor: '#A01F13',
          socialLinks: { instagram: 'https://instagram.com/example', bad: 5 },
          eTag: '"body-etag"',
        },
      },
      200,
      { ETag: '"header-etag"' },
    )
    const result = await api().getBranding()
    expect(result.notModified).toBe(false)
    if (!result.notModified) {
      expect(result.branding.nameEn).toBe('Karam Al-Sham')
      expect(result.branding.socialLinks).toEqual({ instagram: 'https://instagram.com/example' })
      expect(result.etag).toBe('"header-etag"')
    }
  })
})
