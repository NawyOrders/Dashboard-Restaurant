import type {
  AdminOrderListItem,
  BrandingFetchResult,
  ListOrdersQuery,
  PagedResult,
} from './types'

// Single interface describing the dashboard operations. Feature components
// depend on this contract, never on fetch directly, so the mock adapter and
// the real HTTP adapter are interchangeable. Every call is restaurant-scoped:
// the backend MUST enforce tenant isolation and permissions for each request.
export interface Api {
  listOrders(query?: ListOrdersQuery, signal?: AbortSignal): Promise<PagedResult<AdminOrderListItem>>
  transitionOrderStatus(id: string, targetStatus: number, signal?: AbortSignal): Promise<void>
  getBranding(etag?: string, signal?: AbortSignal): Promise<BrandingFetchResult>
}
