import { describe, expect, it } from 'vitest'
import type { NotificationFeed, NotificationItem } from '../api/notifications'
import {
  appendNotifications,
  emptyNotifications,
  hydrateNotifications,
  itemFromLiveEvent,
  markAllNotificationsRead,
  markNotificationRead,
  receiveNotifications,
  resolveOrderAlert,
} from './model'

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
    branchName: 'فرع محطة الرمل',
    branchNameEn: 'Mahattat El Raml',
    customerName: 'Mona',
    fulfilmentType: 'Pickup',
    distinctItemsCount: 2,
    totalItemsQuantity: 3,
    total: 148.5,
    currency: 'EGP',
    paymentMethod: 'InstaPay',
    requiresPaymentProof: true,
    createdAtUtc: '2026-11-28T09:12:00Z',
    createdAtLocal: '2026-11-28T11:12:00',
    ...overrides,
  }
}

function feed(items: NotificationItem[], overrides: Partial<NotificationFeed> = {}): NotificationFeed {
  return {
    items,
    unreadCount: items.filter((entry) => !entry.isRead).length,
    nextCursor: null,
    hasMore: false,
    timeZoneId: 'Africa/Cairo',
    ...overrides,
  }
}

describe('hydrateNotifications', () => {
  it('takes the server order, badge and cursor', () => {
    const state = hydrateNotifications(
      feed([item(), item({ notificationId: 'ntf-2', eventId: 'evt-2', createdAtUtc: '2026-11-28T10:12:00Z' })], {
        unreadCount: 7,
        nextCursor: 'c-2',
        hasMore: true,
      }),
    )
    expect(state.items.map((entry) => entry.notificationId)).toEqual(['ntf-2', 'ntf-1'])
    expect(state.unreadCount).toBe(7)
    expect(state.nextCursor).toBe('c-2')
    expect(state.hasMore).toBe(true)
    expect(state.lastSeenUtc).toBe('2026-11-28T10:12:00Z')
    expect(state.seenEventIds.has('evt-2')).toBe(true)
  })

  it('is empty for an empty page', () => {
    const state = hydrateNotifications(feed([]))
    expect(state.items).toEqual([])
    expect(state.lastSeenUtc).toBeNull()
  })
})

describe('receiveNotifications', () => {
  it('prepends a new live event and raises the badge', () => {
    const base = hydrateNotifications(feed([item()]))
    const { state, added } = receiveNotifications(base, [
      item({ notificationId: 'ntf-9', eventId: 'evt-9', orderId: 'ord-9', createdAtUtc: '2026-11-28T12:00:00Z' }),
    ])
    expect(added).toHaveLength(1)
    expect(state.items[0].notificationId).toBe('ntf-9')
    expect(state.unreadCount).toBe(2)
    expect(state.lastSeenUtc).toBe('2026-11-28T12:00:00Z')
  })

  it('drops an event the list already has, so a reconnect replay does not double count', () => {
    const base = hydrateNotifications(feed([item()]))
    const { state, added } = receiveNotifications(base, [item()])
    expect(added).toEqual([])
    expect(state).toBe(base)
  })

  it('does not raise the badge for an already read row', () => {
    const base = hydrateNotifications(feed([]))
    const { state } = receiveNotifications(base, [item({ isRead: true })])
    expect(state.unreadCount).toBe(0)
    expect(state.items).toHaveLength(1)
  })

  it('dedupes inside one batch', () => {
    const base = hydrateNotifications(feed([]))
    const { added } = receiveNotifications(base, [item(), item()])
    expect(added).toHaveLength(1)
  })
})

describe('appendNotifications', () => {
  it('appends an older page without duplicating a row', () => {
    const base = hydrateNotifications(feed([item()], { hasMore: true }))
    const state = appendNotifications(
      base,
      feed([item({ notificationId: 'ntf-0', eventId: 'evt-0', createdAtUtc: '2026-11-27T09:00:00Z' }), item()], {
        unreadCount: 4,
      }),
    )
    expect(state.items.map((entry) => entry.notificationId)).toEqual(['ntf-1', 'ntf-0'])
    expect(state.unreadCount).toBe(4)
    expect(state.lastSeenUtc).toBe('2026-11-28T09:12:00Z')
  })
})

describe('resolveOrderAlert', () => {
  it('marks the matching order read and leaves the rest alone', () => {
    const base = hydrateNotifications(feed([item(), item({ notificationId: 'ntf-2', eventId: 'evt-2', orderId: 'ord-2' })]))
    const state = resolveOrderAlert(base, 'ord-2')
    expect(state.items.find((entry) => entry.orderId === 'ord-2')?.isRead).toBe(true)
    expect(state.items.find((entry) => entry.orderId === 'ord-1')?.isRead).toBe(false)
  })

  it('ignores an empty order id', () => {
    const base = hydrateNotifications(feed([item()]))
    expect(resolveOrderAlert(base, '')).toBe(base)
  })
})

describe('read receipts', () => {
  it('marks one row read and lowers the badge once', () => {
    const base = hydrateNotifications(feed([item(), item({ notificationId: 'ntf-2', eventId: 'evt-2' })]))
    const state = markNotificationRead(base, 'ntf-2')
    expect(state.unreadCount).toBe(1)
    expect(markNotificationRead(state, 'ntf-2')).toBe(state)
    expect(markNotificationRead(base, 'missing')).toBe(base)
  })

  it('marks everything read and clears the badge', () => {
    const base = hydrateNotifications(feed([item(), item({ notificationId: 'ntf-2', eventId: 'evt-2' })]))
    const state = markAllNotificationsRead(base)
    expect(state.unreadCount).toBe(0)
    expect(state.items.every((entry) => entry.isRead)).toBe(true)
    expect(markAllNotificationsRead(state)).toBe(state)
  })
})

describe('itemFromLiveEvent', () => {
  it('shapes an order-placed event like an inbox row', () => {
    const entry = itemFromLiveEvent(
      {
        eventId: 'evt-live',
        orderId: 'ord-live',
        orderNumber: 'ORD-2900',
        branchNameAr: 'فرع سموحة',
        customerName: 'Ali',
        fulfilmentType: 1,
        itemCount: 3,
        total: 210,
        placedAtUtc: '2026-11-28T12:30:00Z',
      },
      'OrderPlaced',
    )
    expect(entry).not.toBeNull()
    expect(entry!.notificationId).toBe('evt-live')
    expect(entry!.fulfilmentType).toBe('Pickup')
    expect(entry!.distinctItemsCount).toBe(3)
    expect(entry!.totalItemsQuantity).toBe(3)
    expect(entry!.createdAtUtc).toBe('2026-11-28T12:30:00Z')
    expect(entry!.isRead).toBe(false)
    expect(entry!.currency).toBe('EGP')
  })

  it('keeps the persisted notification id when the hub sends one', () => {
    const entry = itemFromLiveEvent(
      { notificationId: 'ntf-live', eventId: 'evt-live', orderId: 'ord-live', submittedAtUtc: '2026-11-28T12:30:00Z' },
      'PaymentProofSubmitted',
    )
    expect(entry!.notificationId).toBe('ntf-live')
    expect(entry!.type).toBe('PaymentProofSubmitted')
  })

  it('reads a string fulfilment and an older numeric one', () => {
    expect(itemFromLiveEvent({ eventId: 'e', orderId: 'o', fulfilmentType: 'Pickup' }, 'OrderPlaced')!.fulfilmentType).toBe('Pickup')
    expect(itemFromLiveEvent({ eventId: 'e', orderId: 'o', fulfilmentType: 2 }, 'OrderPlaced')!.fulfilmentType).toBe('Delivery')
    expect(itemFromLiveEvent({ eventId: 'e', orderId: 'o' }, 'OrderPlaced')!.fulfilmentType).toBe('Delivery')
  })

  it('drops an event with no ids', () => {
    expect(itemFromLiveEvent({ eventId: '', orderId: 'o' }, 'OrderPlaced')).toBeNull()
    expect(itemFromLiveEvent({ eventId: 'e' } as never, 'OrderPlaced')).toBeNull()
    expect(itemFromLiveEvent(undefined as never, 'OrderPlaced')).toBeNull()
  })

  it('starts from an empty inbox', () => {
    expect(emptyNotifications().items).toEqual([])
    expect(emptyNotifications().unreadCount).toBe(0)
  })
})
