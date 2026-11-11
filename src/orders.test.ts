import { describe, expect, it } from 'vitest'
import type { AdminOrderListItem } from './api/types'
import {
  formatOrderTime,
  formatOrderTotal,
  mapAdminOrder,
  mapAdminOrders,
  mapOrderStatus,
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
    expect(mapOrderStatus(1)).toBe('new')
    expect(mapOrderStatus(2)).toBe('preparing')
    expect(mapOrderStatus(3)).toBe('done')
    expect(mapOrderStatus(4)).toBe('done')
    expect(mapOrderStatus(5)).toBe('done')
    expect(mapOrderStatus(6)).toBe('done')
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
    expect(row.status).toBe('preparing')
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
