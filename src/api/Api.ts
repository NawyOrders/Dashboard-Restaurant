import type {
  AdminOrderDetails,
  AdminOrderListItem,
  BrandingFetchResult,
  ListOrdersQuery,
  MenuCategory,
  PagedResult,
  ReportRange,
  ReportsSummary,
  RestaurantSettings,
} from './types'

// Single interface describing the dashboard operations. Feature components
// depend on this contract, never on fetch directly, so the mock adapter and
// the real HTTP adapter are interchangeable. Every call is restaurant-scoped:
// the backend MUST enforce tenant isolation and permissions for each request.
export interface Api {
  listOrders(query?: ListOrdersQuery, signal?: AbortSignal): Promise<PagedResult<AdminOrderListItem>>
  transitionOrderStatus(id: string, targetStatus: number, signal?: AbortSignal): Promise<void>
  getOrderDetails(id: string, signal?: AbortSignal): Promise<AdminOrderDetails>
  getOrderReceiptHtml(id: string, signal?: AbortSignal): Promise<string>
  acceptOrder(id: string, signal?: AbortSignal): Promise<void>
  rejectOrder(id: string, rejectionReason: string, signal?: AbortSignal): Promise<void>
  getBranding(etag?: string, signal?: AbortSignal): Promise<BrandingFetchResult>
  listMenu(signal?: AbortSignal): Promise<MenuCategory[]>
  updateMenuItemAvailability(itemId: string, available: boolean, signal?: AbortSignal): Promise<void>
  getReportsSummary(range: ReportRange, signal?: AbortSignal): Promise<ReportsSummary>
  getRestaurantSettings(signal?: AbortSignal): Promise<RestaurantSettings>
  updateRestaurantSettings(settings: RestaurantSettings, signal?: AbortSignal): Promise<void>
}
