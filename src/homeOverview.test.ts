import { describe, expect, it, vi } from 'vitest'
import type { Api } from './api/Api'
import { loadHomeOverview } from './homeOverview'

const NOW = new Date(2026, 10, 27, 15)
const o = (id: string, daysAgo = 0) => ({
  orderId: id, orderNumber: id, status: 6, fulfilmentType: 1, branchId: 'b', customerName: id, total: 10, vatAmount: 0,
  createdAtUtc: new Date(2026, 10, 27 - daysAgo, 10).toISOString(), paymentMethod: 0, paymentStatus: 3,
})
const paged = (items: unknown[], page: number, next: boolean) => ({ items, totalCount: 0, page, pageSize: 100, totalPages: 0, hasPreviousPage: page > 1, hasNextPage: next })

describe('loadHomeOverview', () => {
  it('reads every page and builds the totals', async () => {
    const listOrders = vi.fn(async (q?: { pageNumber?: number }) => (q?.pageNumber === 2 ? paged([o('b', 1)], 2, false) : paged([o('a')], 1, true)))
    const getOrderDetails = vi.fn(async () => ({ items: [{ orderItemId: '1', menuItemId: 'm', itemName: 'Burger', quantity: 2, lineTotal: 20 }] }))
    const overview = await loadHomeOverview({ listOrders, getOrderDetails } as unknown as Api, NOW)
    expect(listOrders).toHaveBeenCalledTimes(2)
    expect(overview.salesToday).toBe(10)
    expect(overview.salesDelta).toBe(0)
    expect(overview.topItems).toEqual([{ name: 'Burger', count: 4 }])
  })
  it('stops at the page limit when the server never ends', async () => {
    const listOrders = vi.fn(async () => paged([o('x')], 1, true))
    const getOrderDetails = vi.fn(async () => ({ items: [] }))
    await loadHomeOverview({ listOrders, getOrderDetails } as unknown as Api, NOW)
    expect(listOrders.mock.calls.length).toBe(20)
  })
  it('stops on an empty page even if hasNextPage is true', async () => {
    const listOrders = vi.fn(async () => paged([], 1, true))
    await loadHomeOverview({ listOrders, getOrderDetails: vi.fn() } as unknown as Api, NOW)
    expect(listOrders).toHaveBeenCalledTimes(1)
  })
  it('propagates an orders failure (the page then keeps its placeholders)', async () => {
    const listOrders = vi.fn(async () => Promise.reject(new Error('forbidden')))
    await expect(loadHomeOverview({ listOrders } as unknown as Api, NOW)).rejects.toThrow('forbidden')
  })
  it('limits detail calls to 40 orders', async () => {
    const listOrders = vi.fn(async () => paged(Array.from({ length: 80 }, (_, i) => o(`o${i}`)), 1, false))
    const getOrderDetails = vi.fn(async () => ({ items: [] }))
    await loadHomeOverview({ listOrders, getOrderDetails } as unknown as Api, NOW)
    expect(getOrderDetails).toHaveBeenCalledTimes(40)
  })
})
