import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from './mockApi'

describe('mock API adapter', () => {
  it('returns seeded orders with pagination metadata', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const page = await api.listOrders()
    expect(page.totalCount).toBe(7)
    expect(page.items).toHaveLength(7)
    expect(page).toMatchObject({ page: 1, pageSize: 20, totalPages: 1, hasPreviousPage: false, hasNextPage: false })
  })

  it('filters by status and paginates', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const done = await api.listOrders({ status: 5 })
    expect(done.items.length).toBeGreaterThan(0)
    expect(done.items.every((item) => item.status === 5)).toBe(true)

    const paged = await api.listOrders({ pageSize: 3, pageNumber: 2 })
    expect(paged.items).toHaveLength(3)
    expect(paged).toMatchObject({ page: 2, pageSize: 3, totalCount: 7, totalPages: 3, hasPreviousPage: true, hasNextPage: true })
  })

  it('updates an order status and reports unknown ids', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const target = (await api.listOrders({ status: 6 })).items[0]
    await api.transitionOrderStatus(target.orderId, 2)
    const preparing = await api.listOrders({ status: 2 })
    expect(preparing.items.some((item) => item.orderId === target.orderId)).toBe(true)

    await expect(api.transitionOrderStatus('missing', 2)).rejects.toMatchObject({ code: 'notFound' })
    await expect(api.transitionOrderStatus('', 2)).rejects.toMatchObject({ code: 'validation' })
  })

  it('supports conditional branding requests', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const first = await api.getBranding()
    expect(first.notModified).toBe(false)
    if (first.notModified) return
    const again = await api.getBranding(first.etag ?? undefined)
    expect(again).toEqual({ notModified: true, etag: first.etag })
  })

  it('simulates a failing backend when enabled', async () => {
    const api = createMockApi({ latencyMs: 0, fail: true })
    await expect(api.listOrders()).rejects.toMatchObject({ code: 'service' })
    await expect(api.getBranding()).rejects.toMatchObject({ code: 'service' })
  })

  it('applies simulated latency', async () => {
    vi.useFakeTimers()
    const api = createMockApi({ latencyMs: 500 })
    let settled = false
    const pending = api.listOrders().then((value) => {
      settled = true
      return value
    })
    await vi.advanceTimersByTimeAsync(499)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(settled).toBe(true)
  })
})
