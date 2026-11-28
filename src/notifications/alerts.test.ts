import { describe, expect, it } from 'vitest'
import type { NotificationItem } from '../api/notifications'
import {
  acknowledgeOrder,
  dismissAlert,
  enqueueAlert,
  hiddenAlertCount,
  shouldShowSystemNotification,
  titleWithUnread,
  visibleAlerts,
} from './alerts'

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    notificationId: 'ntf-1',
    eventId: 'evt-1',
    type: 'OrderPlaced',
    isRead: false,
    readAtUtc: null,
    orderId: 'ord-1',
    orderNumber: 'ORD-2841',
    displayOrderNumber: '#2841',
    branchId: 'br-1',
    branchName: 'فرع',
    branchNameEn: 'Branch',
    customerName: 'Mona',
    fulfilmentType: 'Pickup',
    distinctItemsCount: 1,
    totalItemsQuantity: 1,
    total: 100,
    currency: 'EGP',
    paymentMethod: 'InstaPay',
    requiresPaymentProof: false,
    createdAtUtc: '2026-11-28T09:00:00Z',
    createdAtLocal: '',
    ...overrides,
  }
}

describe('enqueueAlert', () => {
  it('keeps every pending alert, newest last', () => {
    const queue = enqueueAlert(enqueueAlert([], item()), item({ notificationId: 'ntf-2', eventId: 'evt-2' }))
    expect(queue.map((entry) => entry.notificationId)).toEqual(['ntf-1', 'ntf-2'])
  })

  it('ignores the same event twice', () => {
    const queue = enqueueAlert([item()], item())
    expect(queue).toHaveLength(1)
  })
})

describe('alert stack', () => {
  const three = [item(), item({ notificationId: 'ntf-2', eventId: 'evt-2' }), item({ notificationId: 'ntf-3', eventId: 'evt-3' })]

  it('shows two and counts the rest', () => {
    expect(visibleAlerts(three).map((entry) => entry.notificationId)).toEqual(['ntf-1', 'ntf-2'])
    expect(hiddenAlertCount(three)).toBe(1)
    expect(hiddenAlertCount([])).toBe(0)
  })

  it('drops one alert by id', () => {
    expect(dismissAlert(three, 'ntf-2').map((entry) => entry.notificationId)).toEqual(['ntf-1', 'ntf-3'])
  })

  it('drops every alert for an order another terminal resolved', () => {
    const queue = [item(), item({ notificationId: 'ntf-2', eventId: 'evt-2', orderId: 'ord-2' })]
    expect(acknowledgeOrder(queue, 'ord-2').map((entry) => entry.notificationId)).toEqual(['ntf-1'])
    expect(acknowledgeOrder(queue, '')).toBe(queue)
  })
})

describe('titleWithUnread', () => {
  it('prefixes the count only when there is something unread', () => {
    expect(titleWithUnread(3, 'بابلو — لوحة الإدارة')).toBe('(3) بابلو — لوحة الإدارة')
    expect(titleWithUnread(0, 'بابلو — لوحة الإدارة')).toBe('بابلو — لوحة الإدارة')
  })
})

describe('shouldShowSystemNotification', () => {
  it('fires only when the dashboard cannot be seen', () => {
    expect(shouldShowSystemNotification('hidden', false)).toBe(true)
    expect(shouldShowSystemNotification('visible', false)).toBe(true)
    expect(shouldShowSystemNotification('visible', true)).toBe(false)
    expect(shouldShowSystemNotification('unknown', true)).toBe(false)
  })
})
