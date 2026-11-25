import { describe, expect, it } from 'vitest'
import type { AdminOrderListItem } from './api/types'
import {
  formatOrderTime,
  formatOrderTotal,
  mapAdminOrder,
  mapAdminOrders,
  mapLiveOrder,
  mapLiveOrderStatus,
  mapOrderStatus,
  transitionCodeFor,
} from './orders'

const item: AdminOrderListItem = {
  orderId: 'a1b2c3d4-0000-4000-8000-000000000001',
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

describe('mapOrderStatus', () => {
  it('maps the backend state-machine codes onto dashboard buckets', () => {
    // OrderStatus codes: 0=New, 1=Accepted, 2=Rejected, 3=Preparing, 4=Ready,
    // 5=OutForDelivery, 6=Completed, 7=CancelledByRestaurant, 8=Closed.
    expect(mapOrderStatus(0)).toBe('new')
    expect(mapOrderStatus(1)).toBe('preparing')
    expect(mapOrderStatus(2)).toBe('done')
    expect(mapOrderStatus(3)).toBe('preparing')
    expect(mapOrderStatus(4)).toBe('done')
    expect(mapOrderStatus(5)).toBe('done')
    expect(mapOrderStatus(6)).toBe('done')
    expect(mapOrderStatus(7)).toBe('done')
    expect(mapOrderStatus(8)).toBe('done')
  })

  it('falls back to done for unknown codes', () => {
    expect(mapOrderStatus(99)).toBe('done')
  })
})

describe('formatOrderTotal', () => {
  it('formats EGP for English and ج.م for Arabic', () => {
    expect(formatOrderTotal(300, 'en')).toContain('EGP')
    expect(formatOrderTotal(300, 'ar')).toContain('ج.م')
  })
})

describe('formatOrderTime', () => {
  it('returns a dash for unparsable timestamps', () => {
    expect(formatOrderTime('not-a-date', 'en')).toBe('—')
  })

  it('formats a valid timestamp', () => {
    const formatted = formatOrderTime('2026-11-11T09:12:00Z', 'en')
    expect(formatted).not.toBe('—')
    expect(formatted.length).toBeGreaterThan(0)
  })
})

describe('mapAdminOrder', () => {
  it('maps an API order into the dashboard row shape', () => {
    const row = mapAdminOrder(item, 'en')
    expect(row.id).toBe('#ORD-2841')
    expect(row.customer).toBe('Mona')
    expect(row.items).toBe('—')
    expect(row.status).toBe('done')
    expect(row.total).toContain('EGP')
    expect(row.time).not.toBe('—')
  })

  it('falls back for missing order number and customer', () => {
    const row = mapAdminOrder({ ...item, orderNumber: null, customerName: null }, 'en')
    expect(row.id).toBe('#a1b2c3d4')
    expect(row.customer).toBe('Customer')
  })

  it('uses an Arabic customer fallback', () => {
    const row = mapAdminOrder({ ...item, customerName: '   ' }, 'ar')
    expect(row.customer).toBe('عميل')
  })

  it('maps a list of orders', () => {
    expect(mapAdminOrders([item, { ...item, orderNumber: 'ORD-2840' }], 'ar')).toHaveLength(2)
  })
})

describe('mapLiveOrderStatus', () => {
  it('maps codes onto board columns and hides terminal states', () => {
    expect(mapLiveOrderStatus(0)).toBe('new')
    expect(mapLiveOrderStatus(1)).toBe('preparing')
    expect(mapLiveOrderStatus(3)).toBe('preparing')
    expect(mapLiveOrderStatus(4)).toBe('ready')
    expect(mapLiveOrderStatus(5)).toBe('delivered')
    expect(mapLiveOrderStatus(6)).toBe('delivered')
    expect(mapLiveOrderStatus(2)).toBeNull()
    expect(mapLiveOrderStatus(7)).toBeNull()
    expect(mapLiveOrderStatus(8)).toBeNull()
  })
})

describe('transitionCodeFor', () => {
  it('follows the state machine: Accepted -> Preparing -> Ready -> OutForDelivery/Completed', () => {
    expect(transitionCodeFor(1, 'delivery')).toBe(3)
    expect(transitionCodeFor(3, 'delivery')).toBe(4)
    expect(transitionCodeFor(4, 'delivery')).toBe(5)
    expect(transitionCodeFor(4, 'pickup')).toBe(6)
    expect(transitionCodeFor(0, 'delivery')).toBeNull()
    expect(transitionCodeFor(2, 'pickup')).toBeNull()
    expect(transitionCodeFor(5, 'delivery')).toBeNull()
  })
})

describe('mapLiveOrder', () => {
  it('maps list items onto board cards', () => {
    const order = mapLiveOrder(item, 'en')
    expect(order.id).toBe('#ORD-2841')
    expect(order.orderId).toBe(item.orderId)
    expect(order.customer).toBe('Mona')
    expect(order.fulfilment).toBe('pickup')
    expect(order.payment).toBe('instapay')
    expect(order.paymentConfirmed).toBe(false)
    expect(order.statusCode).toBe(2)
  })

  it('maps cash payment and delivery fulfilment', () => {
    const order = mapLiveOrder({ ...item, fulfilmentType: 0, paymentMethod: 0, paymentStatus: 3 }, 'ar')
    expect(order.fulfilment).toBe('delivery')
    expect(order.payment).toBe('cash')
    expect(order.paymentConfirmed).toBe(true)
  })
})
