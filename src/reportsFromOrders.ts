import type {
  AdminOrderDetails,
  AdminOrderListItem,
  BestSeller,
  PaymentBreakdown,
  PeakHourPoint,
  ReportRange,
  ReportsSummary,
} from './api/types'

// Orders that count as sales: accepted and later. New (0, not yet accepted),
// rejected (2) and cancelled by the restaurant (7) are left out.
const COUNTED_STATUSES = new Set([1, 3, 4, 5, 6, 8])

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_DAYS: Record<ReportRange, number> = { today: 1, week: 7, month: 30 }

export type ReportWindow = { from: Date; to: Date; previousFrom: Date }

// "today" starts at local midnight; week and month are the last 7 / 30 local
// days including today. The previous window has the same length right before.
export function reportWindow(range: ReportRange, now: Date): ReportWindow {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = RANGE_DAYS[range]
  const from = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - (days - 1))
  const previousFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days)
  return { from, to: now, previousFrom }
}

function timeOf(order: AdminOrderListItem): number {
  const time = Date.parse(order.createdAtUtc)
  return Number.isFinite(time) ? time : Number.NaN
}

export function isCounted(order: AdminOrderListItem): boolean {
  return COUNTED_STATUSES.has(order.status) && Number.isFinite(order.total) && order.total >= 0
}

export function ordersInWindow(orders: AdminOrderListItem[], from: Date, to: Date): AdminOrderListItem[] {
  const seen = new Set<string>()
  return orders.filter((order) => {
    const time = timeOf(order)
    if (Number.isNaN(time) || time < from.getTime() || time > to.getTime()) return false
    if (seen.has(order.orderId)) return false
    seen.add(order.orderId)
    return isCounted(order)
  })
}

const round2 = (value: number) => Math.round(value * 100) / 100

// 0 = cash, 2 = wallet, anything else = InstaPay (same mapping as the orders page).
export function buildPayments(orders: AdminOrderListItem[]): PaymentBreakdown[] {
  const counts = { cash: 0, instapay: 0, wallet: 0 }
  for (const order of orders) {
    if (order.paymentMethod === 0) counts.cash += 1
    else if (order.paymentMethod === 2) counts.wallet += 1
    else counts.instapay += 1
  }
  const total = orders.length
  return (['cash', 'instapay', 'wallet'] as const).map((key) => ({
    key,
    count: counts[key],
    percentage: total === 0 ? 0 : Math.round((counts[key] / total) * 100),
  }))
}

export function buildPeakHours(orders: AdminOrderListItem[]): PeakHourPoint[] {
  const perHour = new Array<number>(24).fill(0)
  for (const order of orders) {
    const time = timeOf(order)
    if (!Number.isNaN(time)) perHour[new Date(time).getHours()] += 1
  }
  return perHour.map((count, hour) => ({ hour, orders: count }))
}

export function buildBestSellers(details: AdminOrderDetails[], limit = 5): BestSeller[] {
  const byItem = new Map<string, BestSeller>()
  for (const detail of details) {
    for (const item of detail.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) continue
      const entry = byItem.get(item.menuItemId) ?? {
        id: item.menuItemId,
        nameAr: item.itemName,
        nameEn: item.itemName,
        units: 0,
        revenue: 0,
        emoji: '🍽️',
      }
      entry.units += item.quantity
      entry.revenue = round2(entry.revenue + (Number.isFinite(item.lineTotal) ? item.lineTotal : 0))
      byItem.set(item.menuItemId, entry)
    }
  }
  return [...byItem.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, limit)
}

function ymd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Builds the dashboard report from real orders because the backend has no
// reports endpoint. Net profit is revenue without VAT (no cost data exists).
export function buildReportSummary(
  range: ReportRange,
  allOrders: AdminOrderListItem[],
  details: AdminOrderDetails[],
  now: Date,
): ReportsSummary {
  const window = reportWindow(range, now)
  const current = ordersInWindow(allOrders, window.from, window.to)
  const previous = ordersInWindow(allOrders, window.previousFrom, new Date(window.from.getTime() - 1))
  const revenue = round2(current.reduce((sum, order) => sum + order.total, 0))
  const previousRevenue = previous.reduce((sum, order) => sum + order.total, 0)
  const vat = current.reduce((sum, order) => sum + (order.vatAmount ?? 0), 0)
  const deltaPercent = previousRevenue > 0 ? round2(((revenue - previousRevenue) / previousRevenue) * 100) : 0
  return {
    range,
    revenue,
    deltaPercent,
    orders: current.length,
    averageOrder: current.length === 0 ? 0 : round2(revenue / current.length),
    netProfit: round2(revenue - vat),
    dateFrom: ymd(window.from),
    dateTo: ymd(window.to),
    payments: buildPayments(current),
    peakHours: buildPeakHours(current),
    bestSellers: buildBestSellers(details),
  }
}

export const REPORT_DAY_MS = DAY_MS
