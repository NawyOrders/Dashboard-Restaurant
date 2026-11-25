import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from './api/mockApi'
import { createOrderPlacedSource, type OrderPlacedNotificationPayload } from './realtime/ordersHub'
import { useLiveOrders } from './useOrders'

const payload: OrderPlacedNotificationPayload = {
  eventId: '0193a8b2-1c4d-7000-8000-000000000001',
  orderId: '0193a8b2-1c4d-7000-8000-000000000099',
  orderNumber: 'ORD-20261125-0042',
  branchId: '0193a8b0-0000-7000-8000-000000000010',
  customerName: 'Ahmed Hassan',
  fulfilmentType: 0,
  itemCount: 3,
  total: 285.5,
  placedAtUtc: '2026-11-25T10:15:30.123Z',
  status: 'New',
}

describe('useLiveOrders with a live source', () => {
  it('refetches the list and notifies when an order is placed', async () => {
    const api = createMockApi({ latencyMs: 0 })
    let listCalls = 0
    const original = api.listOrders.bind(api)
    api.listOrders = ((...args: Parameters<typeof original>) => {
      listCalls += 1
      return original(...args)
    }) as typeof original
    const source = createOrderPlacedSource()
    const onOrderPlaced = vi.fn()

    const { result } = renderHook(() => useLiveOrders(api, 'en', source, onOrderPlaced))
    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(listCalls).toBe(1)

    act(() => source.emit(payload))

    await waitFor(() => expect(listCalls).toBe(2))
    expect(onOrderPlaced).toHaveBeenCalledWith(payload)
    expect(result.current.state).toBe('ready')
  })

  it('stops refetching after unmount', async () => {
    const api = createMockApi({ latencyMs: 0 })
    let listCalls = 0
    const original = api.listOrders.bind(api)
    api.listOrders = ((...args: Parameters<typeof original>) => {
      listCalls += 1
      return original(...args)
    }) as typeof original
    const source = createOrderPlacedSource()

    const { result, unmount } = renderHook(() => useLiveOrders(api, 'en', source))
    await waitFor(() => expect(result.current.state).toBe('ready'))

    unmount()
    act(() => source.emit(payload))

    expect(listCalls).toBe(1)
  })
})
