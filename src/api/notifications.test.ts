import { describe, expect, it } from 'vitest'
import { parseNotificationFeed, parseNotificationItem } from './notifications'

function row(overrides: Record<string, unknown> = {}) {
  return {
    notificationId: 'ntf-1',
    eventId: 'evt-1',
    type: 'OrderPlaced',
    isRead: false,
    orderId: 'ord-1',
    orderNumber: 'ORD-2841',
    displayOrderNumber: '#2841',
    branchId: 'br-1',
    branchNameAr: 'فرع محطة الرمل',
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

describe('parseNotificationItem', () => {
  it('reads an inbox row', () => {
    const item = parseNotificationItem(row())
    expect(item.notificationId).toBe('ntf-1')
    expect(item.type).toBe('OrderPlaced')
    expect(item.fulfilmentType).toBe('Pickup')
    expect(item.total).toBe(148.5)
    expect(item.requiresPaymentProof).toBe(true)
    expect(item.createdAtUtc).toBe('2026-11-28T09:12:00Z')
  })

  it('normalises the three timestamps the two event kinds use', () => {
    const placed = parseNotificationItem(row({ createdAtUtc: undefined, placedAtUtc: '2026-11-28T10:00:00Z' }))
    const proof = parseNotificationItem(row({ createdAtUtc: undefined, submittedAtUtc: '2026-11-28T11:00:00Z' }))
    expect(placed.createdAtUtc).toBe('2026-11-28T10:00:00Z')
    expect(proof.createdAtUtc).toBe('2026-11-28T11:00:00Z')
    expect(parseNotificationItem(row({ createdAtUtc: undefined })).createdAtUtc).toBe('')
  })

  it('maps the hub proof event name onto the inbox type', () => {
    expect(parseNotificationItem(row({ type: 'OrderPaymentProofSubmitted' })).type).toBe('PaymentProofSubmitted')
    expect(parseNotificationItem(row({ type: 'PaymentProofSubmitted' })).type).toBe('PaymentProofSubmitted')
  })

  it('rejects an unknown type and missing ids', () => {
    expect(() => parseNotificationItem(row({ type: 'OrderRefunded' }))).toThrow()
    expect(() => parseNotificationItem(row({ notificationId: undefined }))).toThrow()
    expect(() => parseNotificationItem(row({ eventId: '' }))).toThrow()
    expect(() => parseNotificationItem(row({ orderId: undefined }))).toThrow()
    expect(() => parseNotificationItem(null)).toThrow()
  })

  it('falls back on optional fields instead of failing', () => {
    const item = parseNotificationItem({
      notificationId: 'n',
      eventId: 'e',
      type: 'OrderPlaced',
      orderId: 'o',
    })
    expect(item.orderNumber).toBe('')
    expect(item.total).toBe(0)
    expect(item.currency).toBe('EGP')
    expect(item.fulfilmentType).toBe('Delivery')
    expect(item.branchName).toBe('')
    expect(item.branchNameEn).toBe('')
    expect(item.isRead).toBe(false)
  })
})

describe('parseNotificationFeed', () => {
  it('reads the page and its cursor', () => {
    const feed = parseNotificationFeed({
      items: [row(), row({ notificationId: 'ntf-2', eventId: 'evt-2', isRead: true })],
      unreadCount: 1,
      nextCursor: 'cursor-2',
      hasMore: true,
      timeZoneId: 'Africa/Cairo',
    })
    expect(feed.items).toHaveLength(2)
    expect(feed.items[1].isRead).toBe(true)
    expect(feed.unreadCount).toBe(1)
    expect(feed.nextCursor).toBe('cursor-2')
    expect(feed.hasMore).toBe(true)
    expect(feed.timeZoneId).toBe('Africa/Cairo')
  })

  it('treats a missing list as an empty page', () => {
    const feed = parseNotificationFeed({})
    expect(feed.items).toEqual([])
    expect(feed.unreadCount).toBe(0)
    expect(feed.nextCursor).toBeNull()
    expect(feed.hasMore).toBe(false)
  })

  it('rejects a body whose items are not a list', () => {
    expect(() => parseNotificationFeed({ items: 'nope' })).toThrow()
    expect(() => parseNotificationFeed(undefined)).toThrow()
  })
})
