import type { AdminOrderListItem } from './api/types'
import type { Lang } from './i18n'
import type { OrderRow, OrderStatus } from './types'

export const ORDER_STATUSES: OrderStatus[] = ['new', 'preparing', 'done']

// The OpenAPI document exposes order status only as int32; the numeric codes
// follow the BRD state machine (Accepted → Preparing → Ready → OutForDelivery →
// Completed → Closed). Adjust this single map when the backend publishes an
// explicit enum.
export const ORDER_STATUS_BY_CODE: Record<number, OrderStatus> = {
  1: 'new',
  2: 'preparing',
  3: 'done',
  4: 'done',
  5: 'done',
  6: 'done',
}

export function mapOrderStatus(code: number): OrderStatus {
  return ORDER_STATUS_BY_CODE[code] ?? 'done'
}

export function formatOrderTotal(total: number, lang: Lang): string {
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US'
  const currency = lang === 'ar' ? 'ج.م' : 'EGP'
  return `${currency} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(total)}`
}

export function formatOrderTime(iso: string, lang: Lang): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
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
    status: mapOrderStatus(item.status),
    time: formatOrderTime(item.createdAtUtc, lang),
  }
}

export function mapAdminOrders(items: AdminOrderListItem[], lang: Lang): OrderRow[] {
  return items.map((item) => mapAdminOrder(item, lang))
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
