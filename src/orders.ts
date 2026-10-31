import type { OrderRow, OrderStatus } from './types'

export const ORDER_STATUSES: OrderStatus[] = ['new', 'preparing', 'done']

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
