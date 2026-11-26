import { describe, expect, it, vi } from 'vitest'
import { createOrderPlacedSource, type OrderPlacedNotificationPayload } from './ordersHub'

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

describe('createOrderPlacedSource', () => {
  it('delivers emitted payloads to every subscriber', () => {
    const source = createOrderPlacedSource()
    const first = vi.fn()
    const second = vi.fn()
    source.subscribe(first)
    source.subscribe(second)

    source.emit(payload)

    expect(first).toHaveBeenCalledWith(payload)
    expect(second).toHaveBeenCalledWith(payload)
  })

  it('stops delivering after unsubscribe', () => {
    const source = createOrderPlacedSource()
    const handler = vi.fn()
    const unsubscribe = source.subscribe(handler)

    unsubscribe()
    source.emit(payload)

    expect(handler).not.toHaveBeenCalled()
  })
})
