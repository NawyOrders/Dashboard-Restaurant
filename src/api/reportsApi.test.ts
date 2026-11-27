import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './types'
import { createHttpApi } from './httpApi'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 27, 15, 0, 0))
})
afterEach(() => vi.useRealTimers())

const earlier = () => new Date(2026, 10, 27, 10, 0, 0).toISOString()

function api() {
  return createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 't', fetchImpl: fetchMock, timeoutMs: 1000 })
}

function page(items: unknown[], pageNumber: number, totalPages: number) {
  return new Response(
    JSON.stringify({
      statusCode: 200,
      isSuccess: true,
      data: { items, totalCount: items.length, page: pageNumber, pageSize: 100, totalPages, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages },
    }),
    { status: 200 },
  )
}

function ord(id: string, total: number, createdAtUtc = earlier(), status = 6) {
  return { orderId: id, orderNumber: id, status, fulfilmentType: 1, branchId: 'b', customerName: null, total, vatAmount: 0, createdAtUtc, paymentMethod: 0, paymentStatus: 3 }
}

function detailBody(id: string) {
  return new Response(
    JSON.stringify({
      statusCode: 200,
      isSuccess: true,
      data: { orderId: id, status: 6, fulfilmentType: 1, branchId: 'b', subTotal: 1, total: 1, createdAtUtc: new Date().toISOString(), items: [{ orderItemId: 'x', menuItemId: 'm1', itemName: 'Burger', quantity: 2, unitPrice: 5, lineTotal: 10 }] },
    }),
    { status: 200 },
  )
}

describe('getReportsSummary from real orders', () => {
  it('walks every page of orders and sums them', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/admin/orders/')) return detailBody('d')
      return url.includes('pageNumber=2') ? page([ord('b', 30)], 2, 2) : page([ord('a', 20)], 1, 2)
    })
    const summary = await api().getReportsSummary('today')
    expect(summary.revenue).toBe(50)
    expect(summary.orders).toBe(2)
    expect(summary.bestSellers[0]).toMatchObject({ id: 'm1', units: 4 })
  })

  it('returns an empty report for an empty first page and makes no detail calls', async () => {
    fetchMock.mockImplementation(async () => page([], 1, 0))
    const summary = await api().getReportsSummary('week')
    expect(summary).toMatchObject({ revenue: 0, orders: 0, bestSellers: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('still reports totals when some order details fail', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/admin/orders/')) return new Response('', { status: 500 })
      return page([ord('a', 20)], 1, 1)
    })
    const summary = await api().getReportsSummary('today')
    expect(summary.revenue).toBe(20)
    expect(summary.bestSellers).toEqual([])
  })

  it('stops after a bounded number of pages even if the server keeps saying there is a next page', async () => {
    fetchMock.mockImplementation(async (input) => (String(input).includes('/admin/orders/') ? detailBody('d') : page([ord(`o${Math.random()}`, 1)], 1, 999)))
    await api().getReportsSummary('today')
    const listCalls = fetchMock.mock.calls.filter(([u]) => !String(u).match(/\/admin\/orders\/[^?]/)).length
    expect(listCalls).toBeLessThanOrEqual(20)
  })

  it('surfaces unauthorized and forbidden errors instead of an empty report', async () => {
    fetchMock.mockImplementationOnce(async () => new Response('', { status: 401 }))
    await expect(api().getReportsSummary('today')).rejects.toMatchObject({ code: 'unauthorized' })
    fetchMock.mockImplementationOnce(async () => new Response('', { status: 403 }))
    await expect(api().getReportsSummary('today')).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects a malformed orders response', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ isSuccess: false }), { status: 200 }))
    await expect(api().getReportsSummary('month')).rejects.toBeInstanceOf(ApiError)
  })
})
