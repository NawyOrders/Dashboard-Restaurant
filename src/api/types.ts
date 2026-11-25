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

export type AdminOrderItem = {
  orderItemId: string
  menuItemId: string
  itemSizeId: string | null
  itemName: string
  sizeName: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type AdminOrderPayment = {
  paymentId: string
  paymentMethod: number | null
  paymentStatus: number | null
  accountIdentifier: string | null
  requiresVerificationProof: boolean
  proofUrl: string | null
  proofUrlExpiresAtUtc: string | null
}

export type AdminOrderDetails = {
  orderId: string
  orderNumber: string | null
  status: number
  fulfilmentType: number
  branchId: string
  branchNameAr: string | null
  branchNameEn: string | null
  areaId: string | null
  address: string | null
  customerName: string | null
  contactPhone: string | null
  customerNotes: string | null
  rejectionReason: string | null
  subTotal: number
  deliveryFee: number | null
  productDiscountAmount: number | null
  deliveryDiscountAmount: number | null
  vatRate: number | null
  vatBaseAmount: number | null
  vatAmount: number | null
  total: number
  createdAtUtc: string
  modifiedAtUtc: string | null
  items: AdminOrderItem[]
  payment: AdminOrderPayment | null
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

export type BranchDetails = {
  id: string
  nameAr: string
  nameEn: string
  address: string
  isActive: boolean
  isPrimary: boolean
  sortOrder: number
}

export type MenuItemBranchAvailability = {
  branchId: string
  isAvailable: boolean
}

export type MenuItem = {
  id: string
  nameAr: string
  nameEn: string
  price: number
  available: boolean
  imageUrl: string | null
  categoryId: string
  branchAvailabilities?: MenuItemBranchAvailability[]
}

export type MenuCategory = {
  id: string
  nameAr: string
  nameEn: string
  count: number
  items: MenuItem[]
}

export type ReportRange = 'today' | 'week' | 'month'

export type PaymentMethodKey = 'cash' | 'instapay' | 'wallet'

export type PaymentBreakdown = {
  key: PaymentMethodKey
  percentage: number
  count: number
}

export type PeakHourPoint = {
  hour: number
  orders: number
}

export type BestSeller = {
  id: string
  nameAr: string
  nameEn: string
  units: number
  revenue: number
  emoji: string
}

export type ReportsSummary = {
  range: ReportRange
  revenue: number
  deltaPercent: number
  orders: number
  averageOrder: number
  netProfit: number
  dateFrom: string
  dateTo: string
  payments: PaymentBreakdown[]
  peakHours: PeakHourPoint[]
  bestSellers: BestSeller[]
}

export type RestaurantNotificationSettings = {
  repeatSound: boolean
  autoPrint: boolean
  notifyOnDispatch: boolean
}

export type RestaurantPaymentSettings = {
  cash: boolean
  instapay: boolean
  instapayHandle: string
  wallets: boolean
  walletProviders: string
}

export type RestaurantWorkingHours = {
  autoClose: boolean
  weekdaysFrom: string
  weekdaysTo: string
  fridayFrom: string
  fridayTo: string
}

export type RestaurantSettings = {
  restaurantName: string
  branchPhone: string
  address: string
  deliveryFee: number
  minimumOrder: number
  prepTimeMinutes: number
  notifications: RestaurantNotificationSettings
  payments: RestaurantPaymentSettings
  workingHours: RestaurantWorkingHours
}

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
