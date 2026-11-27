import type { Api } from './api/Api'
import type { AdminOrderDetails, AdminOrderListItem } from './api/types'
import { buildHomeOverview, ordersInWindow, type HomeOverview } from './reportsFromOrders'

const PAGE_SIZE = 100
const MAX_PAGES = 20
const DETAIL_LIMIT = 40
const DETAIL_BATCH = 5

// Loads the real orders of the last 29 days (28 for the chart, plus yesterday's
// comparison) and builds everything the Home page shows. Detail calls only feed
// the top items; if they fail the rest of the page still loads.
export async function loadHomeOverview(api: Api, now: Date, signal?: AbortSignal): Promise<HomeOverview> {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28)
  const orders: AdminOrderListItem[] = []
  for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
    const page = await api.listOrders({ fromDate: from.toISOString(), toDate: now.toISOString(), pageNumber, pageSize: PAGE_SIZE }, signal)
    orders.push(...page.items)
    if (!page.hasNextPage || page.items.length === 0) break
  }
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  const recent = ordersInWindow(orders, weekStart, now).slice(0, DETAIL_LIMIT)
  const details: AdminOrderDetails[] = []
  for (let index = 0; index < recent.length; index += DETAIL_BATCH) {
    const results = await Promise.allSettled(recent.slice(index, index + DETAIL_BATCH).map((o) => api.getOrderDetails(o.orderId, signal)))
    for (const result of results) if (result.status === 'fulfilled') details.push(result.value)
  }
  return buildHomeOverview(orders, details, now)
}
