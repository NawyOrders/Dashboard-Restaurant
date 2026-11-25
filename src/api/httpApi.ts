import type { Api } from './Api'
import {
  ApiError,
  isRecord,
  type AdminOrderDetails,
  type AdminOrderItem,
  type AdminOrderPayment,
  numberOrNull,
  stringOrNull,
  type AdminOrderListItem,
  type BestSeller,
  type BranchDetails,
  type BrandingFetchResult,
  type ListOrdersQuery,
  type MenuCategory,
  type MenuItem,
  type MenuItemBranchAvailability,
  type PagedResult,
  type PaymentBreakdown,
  type PaymentMethodKey,
  type PeakHourPoint,
  type ReportRange,
  type ReportsSummary,
  type RestaurantBranding,
  type RestaurantSettings,
} from './types'

const DEFAULT_TIMEOUT_MS = 15_000

export type HttpApiOptions = {
  baseUrl: string
  getAccessToken: () => string | null
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  query?: Record<string, string | number | undefined>
  body?: object
  etag?: string
  rawText?: boolean
  signal?: AbortSignal
}

type RawResponse = {
  status: number
  body: unknown
  etag: string | null
}

function statusToError(status: number): ApiError {
  if (status === 400 || status === 422) return new ApiError('validation')
  if (status === 401) return new ApiError('unauthorized')
  if (status === 403) return new ApiError('forbidden')
  if (status === 404) return new ApiError('notFound')
  if (status === 409) return new ApiError('conflict')
  if (status === 429) return new ApiError('rateLimited')
  return new ApiError('service')
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const base = baseUrl.replace(/\/+$/, '')
  if (!query) return `${base}${path}`
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `${base}${path}?${serialized}` : `${base}${path}`
}

function parsePagedOrders(data: unknown): PagedResult<AdminOrderListItem> {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  const rawItems = data.items
  if (rawItems != null && !Array.isArray(rawItems)) throw new ApiError('invalidResponse')
  const items = (rawItems ?? []).map(parseOrder)

  return {
    items,
    totalCount: numberOrNull(data.totalCount) ?? items.length,
    page: numberOrNull(data.page) ?? 1,
    pageSize: numberOrNull(data.pageSize) ?? items.length,
    totalPages: numberOrNull(data.totalPages) ?? 1,
    hasPreviousPage: data.hasPreviousPage === true,
    hasNextPage: data.hasNextPage === true,
  }
}

function parseOrder(value: unknown): AdminOrderListItem {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const orderId = stringOrNull(value.orderId)
  const status = numberOrNull(value.status)
  const total = numberOrNull(value.total)
  const createdAtUtc = stringOrNull(value.createdAtUtc)
  if (!orderId || status == null || total == null || createdAtUtc == null) {
    throw new ApiError('invalidResponse')
  }
  return {
    orderId,
    orderNumber: stringOrNull(value.orderNumber),
    status,
    fulfilmentType: numberOrNull(value.fulfilmentType) ?? 0,
    branchId: stringOrNull(value.branchId) ?? '',
    customerName: stringOrNull(value.customerName),
    total,
    vatAmount: numberOrNull(value.vatAmount),
    createdAtUtc,
    paymentMethod: numberOrNull(value.paymentMethod),
    paymentStatus: numberOrNull(value.paymentStatus),
  }
}

function parseOrderDetails(data: unknown): AdminOrderDetails {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  const orderId = stringOrNull(data.orderId)
  const total = numberOrNull(data.total)
  const createdAtUtc = stringOrNull(data.createdAtUtc)
  if (!orderId || total == null || !createdAtUtc) throw new ApiError('invalidResponse')

  const rawItems = data.items
  const items: AdminOrderItem[] = (Array.isArray(rawItems) ? rawItems : []).flatMap((value) => {
    if (!isRecord(value)) return []
    const orderItemId = stringOrNull(value.orderItemId)
    const itemName = stringOrNull(value.itemName)
    const unitPrice = numberOrNull(value.unitPrice)
    const quantity = numberOrNull(value.quantity)
    const lineTotal = numberOrNull(value.lineTotal)
    if (!orderItemId || !itemName || unitPrice == null || quantity == null || lineTotal == null) return []
    return [{
      orderItemId,
      menuItemId: stringOrNull(value.menuItemId) ?? '',
      itemSizeId: stringOrNull(value.itemSizeId),
      itemName,
      sizeName: stringOrNull(value.sizeName),
      unitPrice,
      quantity,
      lineTotal,
    }]
  })

  let payment: AdminOrderPayment | null = null
  if (isRecord(data.payment)) {
    payment = {
      paymentId: stringOrNull(data.payment.paymentId) ?? '',
      paymentMethod: numberOrNull(data.payment.paymentMethod),
      paymentStatus: numberOrNull(data.payment.paymentStatus),
      accountIdentifier: stringOrNull(data.payment.accountIdentifier),
      requiresVerificationProof: data.payment.requiresVerificationProof === true,
      proofUrl: stringOrNull(data.payment.proofUrl),
      proofUrlExpiresAtUtc: stringOrNull(data.payment.proofUrlExpiresAtUtc),
    }
  }

  return {
    orderId,
    orderNumber: stringOrNull(data.orderNumber),
    status: numberOrNull(data.status) ?? 0,
    fulfilmentType: numberOrNull(data.fulfilmentType) ?? 0,
    branchId: stringOrNull(data.branchId) ?? '',
    branchNameAr: stringOrNull(data.branchNameAr),
    branchNameEn: stringOrNull(data.branchNameEn),
    areaId: stringOrNull(data.areaId),
    address: stringOrNull(data.address),
    customerName: stringOrNull(data.customerName),
    contactPhone: stringOrNull(data.contactPhone),
    customerNotes: stringOrNull(data.customerNotes),
    rejectionReason: stringOrNull(data.rejectionReason),
    subTotal: numberOrNull(data.subTotal) ?? 0,
    deliveryFee: numberOrNull(data.deliveryFee),
    productDiscountAmount: numberOrNull(data.productDiscountAmount),
    deliveryDiscountAmount: numberOrNull(data.deliveryDiscountAmount),
    vatRate: numberOrNull(data.vatRate),
    vatBaseAmount: numberOrNull(data.vatBaseAmount),
    vatAmount: numberOrNull(data.vatAmount),
    total,
    createdAtUtc,
    modifiedAtUtc: stringOrNull(data.modifiedAtUtc),
    items,
    payment,
  }
}

function parseBranding(data: unknown): RestaurantBranding {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  const tenantId = stringOrNull(data.tenantId)
  if (!tenantId) throw new ApiError('invalidResponse')

  let socialLinks: Record<string, string> | null = null
  if (isRecord(data.socialLinks)) {
    socialLinks = {}
    for (const [key, value] of Object.entries(data.socialLinks)) {
      if (typeof value === 'string') socialLinks[key] = value
    }
  }

  return {
    tenantId,
    nameAr: stringOrNull(data.nameAr),
    nameEn: stringOrNull(data.nameEn),
    logoUrl: stringOrNull(data.logoUrl),
    faviconUrl: stringOrNull(data.faviconUrl),
    primaryColor: stringOrNull(data.primaryColor),
    secondaryColor: stringOrNull(data.secondaryColor),
    accentColor: stringOrNull(data.accentColor),
    backgroundColor: stringOrNull(data.backgroundColor),
    surfaceColor: stringOrNull(data.surfaceColor),
    textOnPrimaryColor: stringOrNull(data.textOnPrimaryColor),
    contactPhone: stringOrNull(data.contactPhone),
    contactEmail: stringOrNull(data.contactEmail),
    whatsAppUrl: stringOrNull(data.whatsAppUrl),
    messengerUrl: stringOrNull(data.messengerUrl),
    socialLinks,
    eTag: stringOrNull(data.eTag),
  }
}

function parseBranch(value: unknown): BranchDetails | null {
  if (!isRecord(value)) return null
  const id = stringOrNull(value.id)
  if (!id) return null
  return {
    id,
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    address: stringOrNull(value.address) ?? '',
    isActive: value.isActive === true,
    isPrimary: value.isPrimary === true,
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
  }
}

function parseBranches(data: unknown): BranchDetails[] {
  // The admin branches endpoint returns a paged envelope.
  if (!isRecord(data) || !Array.isArray(data.items)) throw new ApiError('invalidResponse')
  return data.items.flatMap((value) => {
    const branch = parseBranch(value)
    return branch ? [branch] : []
  })
}

function parsePublicMenuItem(value: unknown): MenuItem | null {
  if (!isRecord(value)) return null
  const id = stringOrNull(value.id)
  if (!id) return null
  // Public shape: price may arrive as basePrice (managed shape) or price.
  const price = numberOrNull(value.basePrice) ?? numberOrNull(value.price)
  const branchAvailabilities: MenuItemBranchAvailability[] = Array.isArray(value.branchAvailabilities)
    ? value.branchAvailabilities.flatMap((entry) => {
        if (!isRecord(entry)) return []
        const branchId = stringOrNull(entry.branchId)
        return branchId ? [{ branchId, isAvailable: entry.isAvailable === true }] : []
      })
    : []
  return {
    id,
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    price: price ?? 0,
    available: true,
    imageUrl: stringOrNull(value.imageUrl),
    categoryId: stringOrNull(value.categoryId) ?? '',
    branchAvailabilities,
  }
}

const PAYMENT_KEYS: PaymentMethodKey[] = ['cash', 'instapay', 'wallet']

function parsePayments(data: unknown): PaymentBreakdown[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((value) => {
    if (!isRecord(value)) return []
    const key = stringOrNull(value.key)
    if (!key || !PAYMENT_KEYS.includes(key as PaymentMethodKey)) return []
    return [{
      key: key as PaymentMethodKey,
      percentage: numberOrNull(value.percentage) ?? 0,
      count: numberOrNull(value.count) ?? 0,
    }]
  })
}

function parsePeakHours(data: unknown): PeakHourPoint[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((value) => {
    if (!isRecord(value)) return []
    const hour = numberOrNull(value.hour)
    const orders = numberOrNull(value.orders)
    return hour == null || orders == null ? [] : [{ hour, orders }]
  })
}

function parseBestSellers(data: unknown): BestSeller[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((value) => {
    if (!isRecord(value)) return []
    const id = stringOrNull(value.id)
    if (!id) return []
    return [{
      id,
      nameAr: stringOrNull(value.nameAr) ?? '',
      nameEn: stringOrNull(value.nameEn) ?? '',
      units: numberOrNull(value.units) ?? 0,
      revenue: numberOrNull(value.revenue) ?? 0,
      emoji: stringOrNull(value.emoji) ?? '🍽️',
    }]
  })
}

function parseReports(data: unknown, range: ReportRange): ReportsSummary {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  return {
    range,
    revenue: numberOrNull(data.revenue) ?? 0,
    deltaPercent: numberOrNull(data.deltaPercent) ?? 0,
    orders: numberOrNull(data.orders) ?? 0,
    averageOrder: numberOrNull(data.averageOrder) ?? 0,
    netProfit: numberOrNull(data.netProfit) ?? 0,
    dateFrom: stringOrNull(data.dateFrom) ?? '',
    dateTo: stringOrNull(data.dateTo) ?? '',
    payments: parsePayments(data.payments),
    peakHours: parsePeakHours(data.peakHours),
    bestSellers: parseBestSellers(data.bestSellers),
  }
}

function parseSettings(data: unknown): RestaurantSettings {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  const notifications = isRecord(data.notifications) ? data.notifications : {}
  const payments = isRecord(data.payments) ? data.payments : {}
  const workingHours = isRecord(data.workingHours) ? data.workingHours : {}
  return {
    restaurantName: stringOrNull(data.restaurantName) ?? '',
    branchPhone: stringOrNull(data.branchPhone) ?? '',
    address: stringOrNull(data.address) ?? '',
    deliveryFee: numberOrNull(data.deliveryFee) ?? 0,
    minimumOrder: numberOrNull(data.minimumOrder) ?? 0,
    prepTimeMinutes: numberOrNull(data.prepTimeMinutes) ?? 0,
    notifications: {
      repeatSound: notifications.repeatSound === true,
      autoPrint: notifications.autoPrint === true,
      notifyOnDispatch: notifications.notifyOnDispatch === true,
    },
    payments: {
      cash: payments.cash === true,
      instapay: payments.instapay === true,
      instapayHandle: stringOrNull(payments.instapayHandle) ?? '',
      wallets: payments.wallets === true,
      walletProviders: stringOrNull(payments.walletProviders) ?? '',
    },
    workingHours: {
      autoClose: workingHours.autoClose === true,
      weekdaysFrom: stringOrNull(workingHours.weekdaysFrom) ?? '',
      weekdaysTo: stringOrNull(workingHours.weekdaysTo) ?? '',
      fridayFrom: stringOrNull(workingHours.fridayFrom) ?? '',
      fridayTo: stringOrNull(workingHours.fridayTo) ?? '',
    },
  }
}

function readEnvelopeData(body: unknown): unknown {
  if (!isRecord(body) || body.isSuccess !== true || !isRecord(body.data)) {
    throw new ApiError('invalidResponse')
  }
  return body.data
}

export function createHttpApi(options: HttpApiOptions): Api {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  async function request(path: string, requestOptions: RequestOptions = {}): Promise<RawResponse> {
    const accessToken = options.getAccessToken()
    if (!accessToken) throw new ApiError('unauthorized')

    const controller = new AbortController()
    const external = requestOptions.signal
    const abort = () => controller.abort()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    external?.addEventListener('abort', abort, { once: true })
    if (external?.aborted) controller.abort()

    try {
      const response = await fetchImpl(buildUrl(options.baseUrl, path, requestOptions.query), {
        method: requestOptions.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
          Authorization: `Bearer ${accessToken}`,
          ...(requestOptions.etag ? { 'If-None-Match': requestOptions.etag } : {}),
        },
        // Tokens travel in the Authorization header only; never send cookies,
        // never follow credentialed redirects, never leak the referrer.
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
        signal: controller.signal,
      })

      const etag = response.headers.get('ETag')
      if (response.status === 304) return { status: 304, body: null, etag }

      let payload: unknown = null
      if (response.ok) {
        try {
          payload = requestOptions.rawText ? await response.text() : await response.json()
        } catch {
          if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError')
          throw new ApiError('invalidResponse')
        }
      }
      if (!response.ok) throw statusToError(response.status)
      return { status: response.status, body: payload, etag }
    } catch (error) {
      if (external?.aborted) throw new DOMException('Request cancelled', 'AbortError')
      if (error instanceof ApiError) throw error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(timedOut ? 'timeout' : 'network')
      }
      throw new ApiError(timedOut ? 'timeout' : 'network')
    } finally {
      clearTimeout(timeout)
      external?.removeEventListener('abort', abort)
    }
  }

  return {
    async listOrders(query: ListOrdersQuery = {}, signal?: AbortSignal) {
      const response = await request('/api/v1/admin/orders', {
        query: {
          branchId: query.branchId,
          status: query.status,
          paymentMethod: query.paymentMethod,
          fromDate: query.fromDate,
          toDate: query.toDate,
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
        },
        signal,
      })
      return parsePagedOrders(readEnvelopeData(response.body))
    },

    async transitionOrderStatus(id: string, targetStatus: number, signal?: AbortSignal) {
      if (!id.trim() || !Number.isInteger(targetStatus)) throw new ApiError('validation')
      await request(`/api/v1/admin/orders/${encodeURIComponent(id)}/transition-status`, {
        method: 'POST',
        body: { targetStatus },
        signal,
      })
    },

    async getOrderDetails(id: string, signal?: AbortSignal): Promise<AdminOrderDetails> {
      if (!id.trim()) throw new ApiError('validation')
      const response = await request(`/api/v1/admin/orders/${encodeURIComponent(id)}`, { signal })
      return parseOrderDetails(readEnvelopeData(response.body))
    },

    // The receipt endpoint returns raw text/html on 200, not the JSON envelope.
    async getOrderReceiptHtml(id: string, signal?: AbortSignal): Promise<string> {
      if (!id.trim()) throw new ApiError('validation')
      const response = await request(`/api/v1/admin/orders/${encodeURIComponent(id)}/receipt`, {
        query: { format: 'html' },
        rawText: true,
        signal,
      })
      if (typeof response.body !== 'string') throw new ApiError('invalidResponse')
      return response.body
    },

    // Order review actions live under /api/v1/orders (no /admin prefix).
    async acceptOrder(id: string, signal?: AbortSignal) {
      if (!id.trim()) throw new ApiError('validation')
      await request(`/api/v1/orders/${encodeURIComponent(id)}/accept`, { method: 'POST', signal })
    },

    async rejectOrder(id: string, rejectionReason: string, signal?: AbortSignal) {
      if (!id.trim() || !rejectionReason.trim()) throw new ApiError('validation')
      await request(`/api/v1/orders/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: { rejectionReason: rejectionReason.trim() },
        signal,
      })
    },

    async getBranding(etag?: string, signal?: AbortSignal): Promise<BrandingFetchResult> {
      const response = await request('/api/v1/Branding', { etag, signal })
      if (response.status === 304) {
        return { notModified: true, etag: response.etag }
      }
      const branding = parseBranding(readEnvelopeData(response.body))
      return { notModified: false, branding, etag: response.etag ?? branding.eTag }
    },

    // Dashboard menu reads use the public endpoints: categories for the list,
    // items grouped client-side. Items hidden from customers (isVisibleToCustomers
    // false) are simply not returned by the public read.
    async listMenu(signal?: AbortSignal): Promise<MenuCategory[]> {
      const [categoriesResponse, itemsResponse] = await Promise.all([
        request('/api/v1/menu/categories', { signal }),
        request('/api/v1/menu/items', { signal }),
      ])
      const rawCategories = readEnvelopeData(categoriesResponse.body)
      if (!Array.isArray(rawCategories)) throw new ApiError('invalidResponse')
      const rawItems = readEnvelopeData(itemsResponse.body)
      const items = (Array.isArray(rawItems) ? rawItems : []).flatMap((value) => {
        const item = parsePublicMenuItem(value)
        return item ? [item] : []
      })
      return rawCategories.flatMap((value) => {
        if (!isRecord(value)) return []
        const id = stringOrNull(value.id)
        if (!id) return []
        const categoryItems = items.filter((item) => item.categoryId === id)
        return [{
          id,
          nameAr: stringOrNull(value.nameAr) ?? '',
          nameEn: stringOrNull(value.nameEn) ?? '',
          count: numberOrNull(value.itemCount) ?? categoryItems.length,
          items: categoryItems,
        }]
      })
    },

    async listBranches(signal?: AbortSignal): Promise<BranchDetails[]> {
      const response = await request('/api/v1/admin/branches', { signal })
      return parseBranches(readEnvelopeData(response.body))
    },

    // Availability is per branch: PATCH .../items/{itemId}/branches/{branchId}/availability.
    async updateMenuItemAvailability(itemId: string, branchId: string, available: boolean, signal?: AbortSignal): Promise<void> {
      if (!itemId.trim() || !branchId.trim()) throw new ApiError('validation')
      await request(`/api/v1/admin/menu/items/${encodeURIComponent(itemId)}/branches/${encodeURIComponent(branchId)}/availability`, {
        method: 'PATCH',
        body: { isAvailable: available },
        signal,
      })
    },

    async getReportsSummary(range: ReportRange, signal?: AbortSignal): Promise<ReportsSummary> {
      // TODO: confirm endpoint with backend
      const response = await request('/api/v1/admin/reports/summary', {
        query: { range },
        signal,
      })
      return parseReports(readEnvelopeData(response.body), range)
    },

    async getRestaurantSettings(signal?: AbortSignal): Promise<RestaurantSettings> {
      // TODO: confirm endpoint with backend
      const response = await request('/api/v1/admin/settings', { signal })
      return parseSettings(readEnvelopeData(response.body))
    },

    async updateRestaurantSettings(settings: RestaurantSettings, signal?: AbortSignal): Promise<void> {
      if (!settings.restaurantName.trim()) throw new ApiError('validation')
      // TODO: confirm endpoint with backend
      await request('/api/v1/admin/settings', {
        method: 'PUT',
        body: settings,
        signal,
      })
    },
  }
}
