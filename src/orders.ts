import type { AdminOrderListItem } from './api/types'
import type { Lang } from './i18n'
import type { LiveOrder, LiveOrderStatus, OrderRow, OrderStatus } from './types'

export const ORDER_STATUSES: OrderStatus[] = ['new', 'preparing', 'done']

// OrderStatus codes from the API reference: 0=New, 1=Accepted, 2=Rejected,
// 3=Preparing, 4=Ready, 5=OutForDelivery, 6=Completed, 7=CancelledByRestaurant,
// 8=Closed. Accept/reject have their own endpoints; transition-status only
// advances 3/4/5 (delivery) / 6 (pickup) / 8, so board columns map like this.
export const LIVE_STATUS_BY_CODE: Record<number, LiveOrderStatus> = {
  0: 'new',
  1: 'preparing',
  3: 'preparing',
  4: 'ready',
  5: 'delivered',
  6: 'delivered',
}

// Rejected (2), cancelled (7) and closed (8) orders leave the board.
export function mapLiveOrderStatus(code: number): LiveOrderStatus | null {
  return LIVE_STATUS_BY_CODE[code] ?? null
}

// Next transition-status target: Accepted -> Preparing -> Ready ->
// OutForDelivery (delivery) or Completed (pickup). Anything else is invalid.
export function transitionCodeFor(currentCode: number, fulfilment: 'delivery' | 'pickup'): number | null {
  if (currentCode === 1) return 3
  if (currentCode === 3) return 4
  if (currentCode === 4) return fulfilment === 'pickup' ? 6 : 5
  return null
}

// Arabic UI keeps Latin digits to match the product design.
export function numberLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US'
}

// OrderStatus codes from the API reference: 0=New, 1=Accepted, 2=Rejected,
// 3=Preparing, 4=Ready, 5=OutForDelivery, 6=Completed, 7=CancelledByRestaurant,
// 8=Closed. The table view groups them into new / preparing / done.
export const ORDER_STATUS_BY_CODE: Record<number, OrderStatus> = {
  0: 'new',
  1: 'preparing',
  2: 'done',
  3: 'preparing',
  4: 'done',
  5: 'done',
  6: 'done',
  7: 'done',
  8: 'done',
}

export function mapOrderStatus(code: number): OrderStatus {
  return ORDER_STATUS_BY_CODE[code] ?? 'done'
}

export function formatOrderTotal(total: number, lang: Lang): string {
  const currency = lang === 'ar' ? 'ج.م' : 'EGP'
  return `${currency} ${new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits: 2 }).format(total)}`
}

export function formatNumber(value: number, lang: Lang, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits }).format(value)
}

export function orderTotalValue(row: OrderRow): number {
  if (typeof row.totalValue === 'number' && Number.isFinite(row.totalValue)) return row.totalValue
  const normalized = row.total.replace(/[^\d.,-]/g, '').replace(/,/g, '')
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : 0
}

export function formatOrderTime(iso: string, lang: Lang): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(numberLocale(lang), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

// The admin list endpoint does not return line items, so the mapped row shows a
// neutral placeholder until the order-detail endpoint is wired.
export function mapAdminOrder(item: AdminOrderListItem, lang: Lang): OrderRow {
  return {
    id: item.orderNumber ? `#${item.orderNumber}` : `#${item.orderId.slice(0, 8)}`,
    customer: item.customerName?.trim() || (lang === 'ar' ? 'عميل' : 'Customer'),
    items: '—',
    total: formatOrderTotal(item.total, lang),
    totalValue: item.total,
    status: mapOrderStatus(item.status),
    time: formatOrderTime(item.createdAtUtc, lang),
  }
}

export function mapAdminOrders(items: AdminOrderListItem[], lang: Lang): OrderRow[] {
  return items.map((item) => mapAdminOrder(item, lang))
}

// The admin list endpoint does not return line items or the customer phone, so
// board cards show item counts/lines once the order-detail endpoint is wired.
export function mapLiveOrder(item: AdminOrderListItem, lang: Lang): LiveOrder {
  const created = Date.parse(item.createdAtUtc)
  const minutes = Number.isFinite(created) ? Math.max(0, Math.round((Date.now() - created) / 60_000)) : 0
  return {
    id: item.orderNumber ? `#${item.orderNumber}` : `#${item.orderId.slice(0, 8)}`,
    orderId: item.orderId,
    statusCode: item.status,
    customer: item.customerName?.trim() || (lang === 'ar' ? 'عميل' : 'Customer'),
    itemCount: 0,
    fulfilment: item.fulfilmentType === 1 ? 'pickup' : 'delivery',
    minutes,
    total: item.total,
    status: mapLiveOrderStatus(item.status) ?? 'delivered',
    payment: item.paymentMethod === 0 ? 'cash' : item.paymentMethod === 2 ? 'wallet' : 'instapay',
    paymentConfirmed: item.paymentStatus === 3,
    lines: [],
  }
}

export function statusOf(row: OrderRow, statuses: Record<string, OrderStatus>): OrderStatus {
  return statuses[row.id] ?? (row.status as OrderStatus)
}

export function parseItems(items: string): string[] {
  return items
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function matchesQuery(row: OrderRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [row.id, row.customer, row.items, row.total].join(' ').toLowerCase().includes(needle)
}

export function filterOrders(
  rows: OrderRow[],
  statuses: Record<string, OrderStatus>,
  query: string,
  status: OrderStatus | 'all' = 'all',
): OrderRow[] {
  return rows.filter((row) => {
    if (status !== 'all' && statusOf(row, statuses) !== status) return false
    return matchesQuery(row, query)
  })
}
