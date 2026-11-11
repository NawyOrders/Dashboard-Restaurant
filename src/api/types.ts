// Contract types derived from the Nawy Orders Tenant API OpenAPI document
// (swagger/v1/swagger.json). Optional fields mirror the nullable spec columns.

export type ApiEnvelope<T> = {
  statusCode?: number
  isSuccess?: boolean
  data?: T | null
  errors?: Record<string, string> | null
  timestamp?: string
}

export type PagedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type AdminOrderListItem = {
  orderId: string
  orderNumber: string | null
  status: number
  fulfilmentType: number
  branchId: string
  customerName: string | null
  total: number
  vatAmount: number | null
  createdAtUtc: string
  paymentMethod: number | null
  paymentStatus: number | null
}

export type ListOrdersQuery = {
  branchId?: string
  status?: number
  paymentMethod?: number
  fromDate?: string
  toDate?: string
  pageNumber?: number
  pageSize?: number
}

export type RestaurantBranding = {
  tenantId: string
  nameAr: string | null
  nameEn: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  backgroundColor: string | null
  surfaceColor: string | null
  textOnPrimaryColor: string | null
  contactPhone: string | null
  contactEmail: string | null
  whatsAppUrl: string | null
  messengerUrl: string | null
  socialLinks: Record<string, string> | null
  eTag: string | null
}

export type BrandingFetchResult =
  | { notModified: true; etag: string | null }
  | { notModified: false; branding: RestaurantBranding; etag: string | null }

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'rateLimited'
  | 'network'
  | 'timeout'
  | 'service'
  | 'invalidResponse'

// Errors carry a stable code only; server messages are never surfaced verbatim
// so sensitive backend detail cannot leak into the UI.
export class ApiError extends Error {
  constructor(public readonly code: ApiErrorCode) {
    super(code)
    this.name = 'ApiError'
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
