import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'

/**
 * Staff notifications (API reference: admin order & payment-proof
 * notifications). Two kinds arrive on the hub and both are persisted in the
 * same inbox, so one shape carries them to the UI.
 */
export type NotificationType = 'OrderPlaced' | 'PaymentProofSubmitted'

export type NotificationFulfilment = 'Delivery' | 'Pickup'

export type NotificationItem = {
  notificationId: string
  eventId: string
  type: NotificationType
  isRead: boolean
  readAtUtc: string | null
  orderId: string
  orderNumber: string
  displayOrderNumber: string
  branchId: string
  branchName: string
  branchNameEn: string
  customerName: string
  fulfilmentType: NotificationFulfilment
  distinctItemsCount: number
  totalItemsQuantity: number
  total: number
  currency: string
  paymentMethod: string
  requiresPaymentProof: boolean
  createdAtUtc: string
  createdAtLocal: string
}

export type NotificationFeed = {
  items: NotificationItem[]
  unreadCount: number
  nextCursor: string | null
  hasMore: boolean
  timeZoneId: string | null
}

export type NotificationListQuery = {
  cursor?: string
  pageSize?: number
  unreadOnly?: boolean
  branchId?: string
  sinceUtc?: string
}

function requiredString(value: unknown, field: string): string {
  const text = stringOrNull(value)
  if (text == null || !text.trim()) throw new ApiError('invalidResponse', { [field]: 'missing' })
  return text
}

function countOrZero(value: unknown): number {
  const number = numberOrNull(value)
  return number == null || number < 0 ? 0 : Math.trunc(number)
}

function fulfilment(value: unknown): NotificationFulfilment {
  return typeof value === 'string' && value.toLowerCase() === 'pickup' ? 'Pickup' : 'Delivery'
}

function notificationType(value: unknown): NotificationType {
  // The hub calls the second event OrderPaymentProofSubmitted; the inbox row
  // persists it as PaymentProofSubmitted. Both reach the same UI.
  const text = stringOrNull(value) ?? ''
  if (text === 'OrderPlaced') return 'OrderPlaced'
  if (text === 'PaymentProofSubmitted' || text === 'OrderPaymentProofSubmitted') return 'PaymentProofSubmitted'
  throw new ApiError('invalidResponse', { type: 'unknown' })
}

export function parseNotificationItem(value: unknown): NotificationItem {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const branchNameAr = stringOrNull(value.branchNameAr) ?? ''
  return {
    notificationId: requiredString(value.notificationId, 'notificationId'),
    eventId: requiredString(value.eventId, 'eventId'),
    type: notificationType(value.type),
    isRead: value.isRead === true,
    readAtUtc: stringOrNull(value.readAtUtc),
    orderId: requiredString(value.orderId, 'orderId'),
    orderNumber: stringOrNull(value.orderNumber) ?? '',
    displayOrderNumber: stringOrNull(value.displayOrderNumber) ?? '',
    branchId: stringOrNull(value.branchId) ?? '',
    branchName: branchNameAr,
    branchNameEn: stringOrNull(value.branchNameEn) ?? branchNameAr,
    customerName: stringOrNull(value.customerName) ?? '',
    fulfilmentType: fulfilment(value.fulfilmentType),
    distinctItemsCount: countOrZero(value.distinctItemsCount),
    totalItemsQuantity: countOrZero(value.totalItemsQuantity),
    total: numberOrNull(value.total) ?? 0,
    currency: stringOrNull(value.currency) ?? 'EGP',
    paymentMethod: stringOrNull(value.paymentMethod) ?? '',
    requiresPaymentProof: value.requiresPaymentProof === true,
    // OrderPlaced uses placedAtUtc, the proof event uses submittedAtUtc and the
    // inbox uses createdAtUtc. One field downstream, as the reference asks.
    createdAtUtc:
      stringOrNull(value.createdAtUtc) ??
      stringOrNull(value.placedAtUtc) ??
      stringOrNull(value.submittedAtUtc) ??
      '',
    createdAtLocal:
      stringOrNull(value.createdAtLocal) ??
      stringOrNull(value.placedAtLocal) ??
      stringOrNull(value.submittedAtLocal) ??
      '',
  }
}

export function parseNotificationFeed(data: unknown): NotificationFeed {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  const raw = data.items
  if (raw != null && !Array.isArray(raw)) throw new ApiError('invalidResponse')
  return {
    items: (raw ?? []).map(parseNotificationItem),
    unreadCount: countOrZero(data.unreadCount),
    nextCursor: stringOrNull(data.nextCursor),
    hasMore: data.hasMore === true,
    timeZoneId: stringOrNull(data.timeZoneId),
  }
}
