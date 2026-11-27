import { describe, expect, it } from 'vitest'
import type { AdminOrderDetails, AdminOrderListItem } from './api/types'
import {
  bucketDays,
  buildBestSellers,
  buildDailyRevenue,
  buildHomeOverview,
  percentChange,
  buildPayments,
  buildPeakHours,
  buildReportSummary,
  ordersInWindow,
  reportWindow,
} from './reportsFromOrders'

const NOW = new Date(2026, 10, 27, 15, 0, 0) // local 27 Nov 2026 15:00

function at(daysAgo: number, hour: number): string {
  return new Date(2026, 10, 27 - daysAgo, hour, 0, 0).toISOString()
}

let seq = 0
function order(over: Partial<AdminOrderListItem> = {}): AdminOrderListItem {
  seq += 1
  return {
    orderId: `o${seq}`,
    orderNumber: `N${seq}`,
    status: 6,
    fulfilmentType: 1,
    branchId: 'b',
    customerName: null,
    total: 100,
    vatAmount: 14,
    createdAtUtc: at(0, 10),
    paymentMethod: 0,
    paymentStatus: 3,
    ...over,
  }
}

function detail(items: Array<[string, string, number, number]>): AdminOrderDetails {
  return {
    items: items.map(([menuItemId, itemName, quantity, lineTotal], i) => ({
      orderItemId: `i${i}`,
      menuItemId,
      itemSizeId: null,
      itemName,
      sizeName: null,
      unitPrice: quantity ? lineTotal / quantity : 0,
      quantity,
      lineTotal,
    })),
  } as unknown as AdminOrderDetails
}

describe('reportWindow', () => {
  it('today starts at local midnight and previous window is the day before', () => {
    const w = reportWindow('today', NOW)
    expect(w.from).toEqual(new Date(2026, 10, 27))
    expect(w.previousFrom).toEqual(new Date(2026, 10, 26))
  })
  it('week covers 7 local days including today, month 30', () => {
    expect(reportWindow('week', NOW).from).toEqual(new Date(2026, 10, 21))
    expect(reportWindow('week', NOW).previousFrom).toEqual(new Date(2026, 10, 14))
    expect(reportWindow('month', NOW).from).toEqual(new Date(2026, 9, 29))
  })
  it('crosses month and year boundaries', () => {
    const w = reportWindow('week', new Date(2027, 0, 3, 9))
    expect(w.from).toEqual(new Date(2026, 11, 28))
  })
})

describe('ordersInWindow', () => {
  const w = reportWindow('today', NOW)
  it('keeps only counted statuses', () => {
    const kept = [1, 3, 4, 5, 6, 8].map((status) => order({ status }))
    const dropped = [0, 2, 7, 99, -1].map((status) => order({ status }))
    expect(ordersInWindow([...kept, ...dropped], w.from, w.to)).toHaveLength(6)
  })
  it('drops orders outside the window and on the exact boundary correctly', () => {
    const inside = order({ createdAtUtc: w.from.toISOString() })
    const justBefore = order({ createdAtUtc: new Date(w.from.getTime() - 1).toISOString() })
    const future = order({ createdAtUtc: new Date(NOW.getTime() + 1).toISOString() })
    expect(ordersInWindow([inside, justBefore, future], w.from, w.to)).toEqual([inside])
  })
  it('ignores bad dates, NaN or negative totals and duplicate ids', () => {
    const good = order()
    const dup = { ...good }
    const badDate = order({ createdAtUtc: 'not a date' })
    const nan = order({ total: Number.NaN })
    const negative = order({ total: -5 })
    expect(ordersInWindow([good, dup, badDate, nan, negative], w.from, w.to)).toEqual([good])
  })
  it('handles an empty list', () => {
    expect(ordersInWindow([], w.from, w.to)).toEqual([])
  })
})

describe('buildPayments', () => {
  it('returns zeros for no orders without dividing by zero', () => {
    expect(buildPayments([])).toEqual([
      { key: 'cash', count: 0, percentage: 0 },
      { key: 'instapay', count: 0, percentage: 0 },
      { key: 'wallet', count: 0, percentage: 0 },
    ])
  })
  it('maps 0 cash, 2 wallet and everything else (including null) to instapay', () => {
    const rows = buildPayments([
      order({ paymentMethod: 0 }),
      order({ paymentMethod: 2 }),
      order({ paymentMethod: 1 }),
      order({ paymentMethod: null }),
    ])
    expect(rows.map((r) => r.count)).toEqual([1, 2, 1])
    expect(rows.map((r) => r.percentage)).toEqual([25, 50, 25])
  })
})

describe('buildPeakHours', () => {
  it('always returns 24 hours and counts by local hour', () => {
    const hours = buildPeakHours([order({ createdAtUtc: at(0, 9) }), order({ createdAtUtc: at(0, 9) }), order({ createdAtUtc: at(0, 23) })])
    expect(hours).toHaveLength(24)
    expect(hours[9].orders).toBe(2)
    expect(hours[23].orders).toBe(1)
    expect(hours.reduce((s, h) => s + h.orders, 0)).toBe(3)
  })
  it('skips unparsable dates', () => {
    expect(buildPeakHours([order({ createdAtUtc: 'x' })]).every((h) => h.orders === 0)).toBe(true)
  })
})

describe('buildBestSellers', () => {
  it('merges the same item across orders, sorts by units then revenue and limits to 5', () => {
    const sellers = buildBestSellers([
      detail([['a', 'A', 2, 40], ['b', 'B', 2, 90]]),
      detail([['a', 'A', 1, 20], ['c', 'C', 1, 5], ['d', 'D', 1, 5], ['e', 'E', 1, 5], ['f', 'F', 1, 5]]),
    ])
    expect(sellers).toHaveLength(5)
    expect(sellers[0]).toMatchObject({ id: 'a', units: 3, revenue: 60 })
    expect(sellers[1]).toMatchObject({ id: 'b', units: 2 })
  })
  it('skips zero, negative and NaN quantities and tolerates NaN line totals', () => {
    const sellers = buildBestSellers([detail([['a', 'A', 0, 10], ['b', 'B', -2, 10], ['c', 'C', Number.NaN, 1], ['d', 'D', 1, Number.NaN]])])
    expect(sellers).toEqual([expect.objectContaining({ id: 'd', units: 1, revenue: 0 })])
  })
  it('returns an empty list with no details or no items', () => {
    expect(buildBestSellers([])).toEqual([])
    expect(buildBestSellers([detail([])])).toEqual([])
  })
  it('does not lose cents to float error', () => {
    const sellers = buildBestSellers([detail([['a', 'A', 1, 0.1]]), detail([['a', 'A', 1, 0.2]])])
    expect(sellers[0].revenue).toBe(0.3)
  })
})

describe('buildReportSummary', () => {
  it('is all zeros and safe with no orders', () => {
    const s = buildReportSummary('week', [], [], NOW)
    expect(s).toMatchObject({ revenue: 0, orders: 0, averageOrder: 0, netProfit: 0, deltaPercent: 0, bestSellers: [] })
    expect(s.dateFrom).toBe('2026-11-21')
    expect(s.dateTo).toBe('2026-11-27')
  })
  it('computes revenue, average, net of VAT and ignores uncounted orders', () => {
    const s = buildReportSummary(
      'today',
      [order({ total: 100, vatAmount: 14 }), order({ total: 50, vatAmount: null }), order({ status: 2, total: 999 }), order({ status: 0, total: 999 })],
      [],
      NOW,
    )
    expect(s.revenue).toBe(150)
    expect(s.orders).toBe(2)
    expect(s.averageOrder).toBe(75)
    expect(s.netProfit).toBe(136)
  })
  it('computes the change against the previous window and is 0 when there was no previous revenue', () => {
    const base = [order({ total: 150 }), order({ total: 50, createdAtUtc: at(1, 12) })]
    expect(buildReportSummary('today', base, [], NOW).deltaPercent).toBe(200)
    expect(buildReportSummary('today', [order({ total: 150 })], [], NOW).deltaPercent).toBe(0)
    const drop = [order({ total: 50 }), order({ total: 100, createdAtUtc: at(1, 12) })]
    expect(buildReportSummary('today', drop, [], NOW).deltaPercent).toBe(-50)
  })
  it('keeps the current window apart from the previous one', () => {
    const s = buildReportSummary('today', [order({ total: 10 }), order({ total: 70, createdAtUtc: at(1, 12) })], [], NOW)
    expect(s.revenue).toBe(10)
    expect(s.orders).toBe(1)
  })
  it('handles a large number of orders', () => {
    const many = Array.from({ length: 5000 }, () => order({ total: 1.1, vatAmount: 0 }))
    const s = buildReportSummary('today', many, [], NOW)
    expect(s.orders).toBe(5000)
    expect(s.revenue).toBe(5500)
  })
})

describe('home overview helpers', () => {
  it('buildDailyRevenue puts each order in its local day, oldest first', () => {
    const days = buildDailyRevenue([order({ total: 10 }), order({ total: 5, createdAtUtc: at(0, 8) }), order({ total: 7, createdAtUtc: at(2, 23) })], 3, NOW)
    expect(days.map((d) => d.revenue)).toEqual([7, 0, 15])
    expect(days[0].date).toEqual(new Date(2026, 10, 25))
  })
  it('buildDailyRevenue ignores orders outside the range and handles zero days', () => {
    expect(buildDailyRevenue([order({ createdAtUtc: at(9, 10) })], 3, NOW).every((d) => d.revenue === 0)).toBe(true)
    expect(buildDailyRevenue([order()], 0, NOW)).toEqual([])
  })
  it('percentChange is null without a usable previous value', () => {
    expect(percentChange(5, 0)).toBeNull()
    expect(percentChange(Number.NaN, 5)).toBeNull()
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
  })
  it('bucketDays sums weeks and keeps a short last bucket', () => {
    const days = Array.from({ length: 10 }, (_, i) => ({ date: new Date(2026, 10, 1 + i), revenue: 1 }))
    expect(bucketDays(days, 7).map((b) => b.revenue)).toEqual([7, 3])
    expect(bucketDays(days, 0)).toEqual([])
    expect(bucketDays([], 7)).toEqual([])
  })
  it('buildHomeOverview counts new orders separately and distinct customers case-insensitively', () => {
    const o = buildHomeOverview(
      [
        order({ customerName: 'Mona', total: 100 }),
        order({ customerName: ' mona ', total: 50 }),
        order({ customerName: null, total: 10 }),
        order({ status: 0, total: 999, customerName: 'New One' }),
        order({ status: 2, total: 999 }),
        order({ total: 40, createdAtUtc: at(1, 12), customerName: 'Ali' }),
      ],
      [detail([['a', 'Antara', 3, 30]])],
      NOW,
    )
    expect(o.salesToday).toBe(160)
    expect(o.ordersToday).toBe(3)
    expect(o.newOrders).toBe(1)
    expect(o.customersToday).toBe(1)
    expect(o.averageToday).toBe(53.33)
    expect(o.salesDelta).toBe(300)
    expect(o.topItems).toEqual([{ name: 'Antara', count: 3 }])
    expect(o.week).toHaveLength(7)
    expect(o.month).toHaveLength(28)
  })
  it('buildHomeOverview is safe with no orders', () => {
    const o = buildHomeOverview([], [], NOW)
    expect(o).toMatchObject({ salesToday: 0, ordersToday: 0, newOrders: 0, customersToday: 0, averageToday: 0, salesDelta: null, topItems: [] })
  })
})
