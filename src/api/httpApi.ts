import type { Api } from './Api'
import { resolveItemImageUrl } from '../media'
import {
  ApiError,
  isRecord,
  type AdminOrderDetails,
  type AdminOrderItem,
  type AdminOrderPayment,
  numberOrNull,
  stringOrNull,
  type AdminOrderListItem,
  type BrandingFetchResult,
  type ListOrdersQuery,
  type MenuCategory,
  type MenuItem,
  type MenuItemBranchAvailability,
  type PagedResult,
  type ReportRange,
  type ReportsSummary,
  type RestaurantBranding,
  type RestaurantSettings,
  type PaymentMethodName,
  type UpdatePaymentMethodInput,
} from './types'
import {
  parseManagedMenuItem,
  parseMenuItemImageUploadUrl,
  validateMenuItemImageRequest,
  validateMenuItemInput,
  type CreateMenuItemInput,
  type MenuItemImageUploadRequest,
  type UpdateMenuItemInput,
} from './menuItems'
import {
  parseCategorySummary,
  parseManagedCategory,
  validateCreateCategory,
  validateReorder,
  validateUpdateCategory,
  type CreateCategoryInput,
  type ReorderCategoriesInput,
  type UpdateCategoryInput,
} from './categories'
import {
  parsePermission,
  parseRole,
  validateCreateRole,
  validatePermissionKeys,
  validateUpdateRole,
  type CreateRoleInput,
  type UpdateRoleInput,
} from './roles'
import {
  parseStaffUser,
  validateInviteStaff,
  validateStaffListQuery,
  type InviteStaffInput,
  type ListStaffQuery,
} from './staff'
import {
  parseBranch,
  parseDeliverySettings,
  validateCreateBranch,
  validateDeliverySettings,
  validateUpdateBranch,
  type CreateBranchInput,
  type DeliverySettings,
  type ListBranchesQuery,
  type UpdateBranchInput,
} from './branches'
import {
  parseOffer,
  parseOfferImageUploadUrl,
  validateCreateOffer,
  validateOfferImageRequest,
  validateOfferListQuery,
  validateUpdateOffer,
  type CreateOfferInput,
  type ListOffersQuery,
  type OfferImageUploadRequest,
  type OfferStatusInput,
  type UpdateOfferInput,
} from './offers'
import {
  parseAddOn,
  validateCreateAddOn,
  validateUpdateAddOn,
  type CreateAddOnInput,
  type ListAddOnsQuery,
  type UpdateAddOnInput,
} from './addOns'
import { buildReportSummary, ordersInWindow, reportWindow } from '../reportsFromOrders'
import { parsePaged, requireId, validatePaging } from './shared'
import { parseNotificationFeed, type NotificationListQuery } from './notifications'
import { parsePaymentMethod, validatePaymentMethodUpdate } from './paymentMethods'

const DEFAULT_TIMEOUT_MS = 15_000

const REPORT_PAGE_SIZE = 100
const REPORT_MAX_PAGES = 20
const REPORT_DETAIL_LIMIT = 40
const REPORT_DETAIL_BATCH = 5

export type HttpApiOptions = {
  baseUrl: string
  getAccessToken: () => string | null
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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
    available: value.isAvailable !== false,
    imageUrl: resolveItemImageUrl(stringOrNull(value.imageKey), stringOrNull(value.imageUrl)),
    categoryId: stringOrNull(value.categoryId) ?? '',
    branchAvailabilities,
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

// Same envelope check for endpoints whose data is an array.
function readEnvelopeList(body: unknown): unknown[] {
  if (!isRecord(body) || body.isSuccess !== true || !Array.isArray(body.data)) {
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
      if (!response.ok) {
        // The API answers validation failures with an `errors` map. Keep it so a
        // form can point at the field instead of showing one generic failure.
        const fieldErrors: Record<string, string> = {}
        try {
          const failure: unknown = await response.json()
          if (isRecord(failure) && isRecord(failure.errors)) {
            for (const [key, value] of Object.entries(failure.errors)) {
              if (typeof value === 'string' && value.trim()) fieldErrors[key] = value
            }
          }
        } catch {
          // A body-less failure: the status code alone decides the error.
        }
        throw new ApiError(statusToError(response.status).code, fieldErrors)
      }
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

  const api: Api = {
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

    // Payment proof review: POST /api/v1/orders/{id}/confirm-payment (no body)
    // needs payments.proof.confirm; the reviewer comes from the JWT.
    async confirmPayment(id: string, signal?: AbortSignal) {
      if (!id.trim()) throw new ApiError('validation')
      await request(`/api/v1/orders/${encodeURIComponent(id)}/confirm-payment`, { method: 'POST', signal })
    },

    // POST /api/v1/orders/{id}/reject-proof needs payments.proof.reject and a
    // reason that is non-empty after trimming and at most 1000 characters.
    async rejectPaymentProof(id: string, rejectionReason: string, signal?: AbortSignal) {
      const reason = rejectionReason.trim()
      if (!id.trim() || !reason || reason.length > 1000) throw new ApiError('validation')
      await request(`/api/v1/orders/${encodeURIComponent(id)}/reject-proof`, {
        method: 'POST',
        body: { rejectionReason: reason },
        signal,
      })
    },

    // GET /api/v1/admin/payment-methods needs restaurant.settings.view.
    async listPaymentMethods(signal?: AbortSignal) {
      const response = await request('/api/v1/admin/payment-methods', { signal })
      return readEnvelopeList(response.body).map(parsePaymentMethod)
    },

    // PATCH /api/v1/admin/payment-methods/{paymentMethod} needs
    // restaurant.settings.manage. The route takes the method NAME, never a number.
    async updatePaymentMethod(method: PaymentMethodName, input: UpdatePaymentMethodInput, signal?: AbortSignal) {
      validatePaymentMethodUpdate(method, input)
      const response = await request(`/api/v1/admin/payment-methods/${method}`, {
        method: 'PATCH',
        body: input,
        signal,
      })
      return parsePaymentMethod(readEnvelopeData(response.body))
    },

    // Offers (reference section 14). offers.view reads, offers.manage writes.
    // POST /api/v1/admin/offers/image-upload-url returns a presigned PUT URL.
    async createOfferImageUploadUrl(input: OfferImageUploadRequest, signal?: AbortSignal) {
      validateOfferImageRequest(input)
      const response = await request('/api/v1/admin/offers/image-upload-url', { method: 'POST', body: input, signal })
      return parseOfferImageUploadUrl(readEnvelopeData(response.body))
    },

    async createOffer(input: CreateOfferInput, signal?: AbortSignal) {
      validateCreateOffer(input)
      const response = await request('/api/v1/admin/offers', { method: 'POST', body: input, signal })
      return parseOffer(readEnvelopeData(response.body))
    },

    async listOffers(query: ListOffersQuery = {}, signal?: AbortSignal) {
      validateOfferListQuery(query)
      validatePaging(query.pageNumber, query.pageSize)
      const response = await request('/api/v1/admin/offers', {
        query: { kind: query.kind, status: query.status, pageNumber: query.pageNumber, pageSize: query.pageSize },
        signal,
      })
      return parsePaged(readEnvelopeData(response.body), parseOffer)
    },

    async getOffer(id: string, signal?: AbortSignal) {
      const response = await request(`/api/v1/admin/offers/${requireId(id)}`, { signal })
      return parseOffer(readEnvelopeData(response.body))
    },

    async updateOffer(id: string, input: UpdateOfferInput, signal?: AbortSignal) {
      requireId(id)
      validateUpdateOffer(input)
      const response = await request(`/api/v1/admin/offers/${id}`, { method: 'PUT', body: input, signal })
      return parseOffer(readEnvelopeData(response.body))
    },

    async setOfferStatus(id: string, input: OfferStatusInput, signal?: AbortSignal) {
      requireId(id)
      const response = await request(`/api/v1/admin/offers/${id}/status`, { method: 'PATCH', body: input, signal })
      return parseOffer(readEnvelopeData(response.body))
    },

    async deleteOffer(id: string, signal?: AbortSignal) {
      await request(`/api/v1/admin/offers/${requireId(id)}`, { method: 'DELETE', signal })
    },

    // Admin menu items and images (reference section 12), all menu.edit.
    // Upload the bytes to uploadUrl with a plain PUT (no Authorization header),
    // then pass objectKey as imageKey on create or update.
    async createMenuItemImageUploadUrl(input: MenuItemImageUploadRequest, signal?: AbortSignal) {
      validateMenuItemImageRequest(input)
      const response = await request('/api/v1/admin/menu/items/image-upload-url', { method: 'POST', body: input, signal })
      return parseMenuItemImageUploadUrl(readEnvelopeData(response.body))
    },

    async createMenuItem(input: CreateMenuItemInput, signal?: AbortSignal) {
      validateMenuItemInput(input)
      const response = await request('/api/v1/admin/menu/items', { method: 'POST', body: input, signal })
      return parseManagedMenuItem(readEnvelopeData(response.body))
    },

    async updateMenuItem(id: string, input: UpdateMenuItemInput, signal?: AbortSignal) {
      requireId(id)
      validateMenuItemInput(input)
      const response = await request(`/api/v1/admin/menu/items/${id}`, { method: 'PUT', body: input, signal })
      return parseManagedMenuItem(readEnvelopeData(response.body))
    },

    async removeMenuItemImage(id: string, signal?: AbortSignal) {
      const response = await request(`/api/v1/admin/menu/items/${requireId(id)}/image`, { method: 'DELETE', signal })
      return parseManagedMenuItem(readEnvelopeData(response.body))
    },

    async deleteMenuItem(id: string, signal?: AbortSignal) {
      await request(`/api/v1/admin/menu/items/${requireId(id)}`, { method: 'DELETE', signal })
    },

    // Admin menu add-ons (reference section 13), all menu.edit.
    async listAddOns(query: ListAddOnsQuery = {}, signal?: AbortSignal) {
      validatePaging(query.pageNumber, query.pageSize)
      const response = await request('/api/v1/admin/menu/addons', {
        query: {
          isActive: query.isActive === undefined ? undefined : String(query.isActive),
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
        },
        signal,
      })
      return parsePaged(readEnvelopeData(response.body), parseAddOn)
    },

    async createAddOn(itemId: string, input: CreateAddOnInput, signal?: AbortSignal) {
      validateCreateAddOn(input)
      const response = await request(`/api/v1/admin/menu/items/${requireId(itemId)}/addons`, { method: 'POST', body: input, signal })
      return parseAddOn(readEnvelopeData(response.body))
    },

    async updateAddOn(itemId: string, addOnId: string, input: UpdateAddOnInput, signal?: AbortSignal) {
      requireId(itemId)
      requireId(addOnId)
      validateUpdateAddOn(input)
      const response = await request(`/api/v1/admin/menu/items/${itemId}/addons/${addOnId}`, { method: 'PATCH', body: input, signal })
      return parseAddOn(readEnvelopeData(response.body))
    },

    async deleteAddOn(itemId: string, addOnId: string, signal?: AbortSignal) {
      await request(`/api/v1/admin/menu/items/${requireId(itemId)}/addons/${requireId(addOnId)}`, { method: 'DELETE', signal })
    },

    // Menu categories (reference section 11). Writes need menu.edit and share
    // the /api/v1/menu/categories path with the public reads.
    async listRootCategories(signal?: AbortSignal) {
      const response = await request('/api/v1/menu/categories', { signal })
      return readEnvelopeList(response.body).map(parseCategorySummary)
    },

    async listSubcategories(categoryId: string, signal?: AbortSignal) {
      const response = await request(`/api/v1/menu/categories/${requireId(categoryId)}/subcategories`, { signal })
      return readEnvelopeList(response.body).map(parseCategorySummary)
    },

    async createCategory(input: CreateCategoryInput, signal?: AbortSignal) {
      validateCreateCategory(input)
      const response = await request('/api/v1/menu/categories', { method: 'POST', body: input, signal })
      return parseManagedCategory(readEnvelopeData(response.body))
    },

    async updateCategory(id: string, input: UpdateCategoryInput, signal?: AbortSignal) {
      requireId(id)
      validateUpdateCategory(input)
      const response = await request(`/api/v1/menu/categories/${id}`, { method: 'PUT', body: input, signal })
      return parseManagedCategory(readEnvelopeData(response.body))
    },

    // PUT /api/v1/menu/categories/reorder must list every active category at that level once.
    async reorderCategories(input: ReorderCategoriesInput, signal?: AbortSignal) {
      validateReorder(input)
      await request('/api/v1/menu/categories/reorder', { method: 'PUT', body: input, signal })
    },

    async deleteCategory(id: string, signal?: AbortSignal) {
      await request(`/api/v1/menu/categories/${requireId(id)}`, { method: 'DELETE', signal })
    },

    // Roles and permissions (reference section 18): Owner / RestaurantOwner only.
    async listPermissions(signal?: AbortSignal) {
      const response = await request('/api/v1/admin/permissions', { signal })
      return readEnvelopeList(response.body).map(parsePermission)
    },

    async listRoles(signal?: AbortSignal) {
      const response = await request('/api/v1/admin/roles', { signal })
      return readEnvelopeList(response.body).map(parseRole)
    },

    async getRole(id: string, signal?: AbortSignal) {
      const response = await request(`/api/v1/admin/roles/${requireId(id)}`, { signal })
      return parseRole(readEnvelopeData(response.body))
    },

    async createRole(input: CreateRoleInput, signal?: AbortSignal) {
      validateCreateRole(input)
      const response = await request('/api/v1/admin/roles', { method: 'POST', body: input, signal })
      return parseRole(readEnvelopeData(response.body))
    },

    async updateRole(id: string, input: UpdateRoleInput, signal?: AbortSignal) {
      requireId(id)
      validateUpdateRole(input)
      const response = await request(`/api/v1/admin/roles/${id}`, { method: 'PATCH', body: input, signal })
      return parseRole(readEnvelopeData(response.body))
    },

    async replaceRolePermissions(id: string, permissionKeys: string[], signal?: AbortSignal) {
      requireId(id)
      validatePermissionKeys(permissionKeys)
      await request(`/api/v1/admin/roles/${id}/permissions`, { method: 'PUT', body: { permissionKeys }, signal })
    },

    async deleteRole(id: string, signal?: AbortSignal) {
      await request(`/api/v1/admin/roles/${requireId(id)}`, { method: 'DELETE', signal })
    },

    // Staff (reference section 17): Owner / RestaurantOwner only, prefix /api/v1/staff.
    async listStaff(query: ListStaffQuery = {}, signal?: AbortSignal) {
      validateStaffListQuery(query)
      const response = await request('/api/v1/staff', {
        query: {
          branchId: query.branchId,
          role: query.role || undefined,
          search: query.search?.trim() || undefined,
          status: query.status,
          pageNumber: query.pageNumber,
          pageSize: query.pageSize,
        },
        signal,
      })
      return parsePaged(readEnvelopeData(response.body), parseStaffUser)
    },

    async inviteStaff(input: InviteStaffInput, signal?: AbortSignal) {
      validateInviteStaff(input)
      const response = await request('/api/v1/staff/invitations', { method: 'POST', body: input, signal })
      return parseStaffUser(readEnvelopeData(response.body))
    },

    async resendStaffInvitation(id: string, signal?: AbortSignal) {
      await request(`/api/v1/staff/${requireId(id)}/resend-invitation`, { method: 'POST', signal })
    },

    async changeStaffRole(id: string, roleId: string, signal?: AbortSignal) {
      requireId(id)
      requireId(roleId)
      await request(`/api/v1/staff/${id}/role`, { method: 'PUT', body: { roleId }, signal })
    },

    async deleteStaff(id: string, signal?: AbortSignal) {
      await request(`/api/v1/staff/${requireId(id)}`, { method: 'DELETE', signal })
    },

    // Branches and delivery settings (reference section 15).
    // branches.view reads, branches.manage writes.
    async listBranches(query: ListBranchesQuery = {}, signal?: AbortSignal) {
      validatePaging(query.pageNumber, query.pageSize)
      const response = await request('/api/v1/admin/branches', {
        query: { pageNumber: query.pageNumber, pageSize: query.pageSize },
        signal,
      })
      return parsePaged(readEnvelopeData(response.body), parseBranch)
    },

    async getBranch(id: string, signal?: AbortSignal) {
      const response = await request(`/api/v1/admin/branches/${requireId(id)}`, { signal })
      return parseBranch(readEnvelopeData(response.body))
    },

    async createBranch(input: CreateBranchInput, signal?: AbortSignal) {
      validateCreateBranch(input)
      const response = await request('/api/v1/admin/branches', { method: 'POST', body: input, signal })
      return parseBranch(readEnvelopeData(response.body))
    },

    async updateBranch(id: string, input: UpdateBranchInput, signal?: AbortSignal) {
      requireId(id)
      validateUpdateBranch(input)
      const response = await request(`/api/v1/admin/branches/${id}`, { method: 'PATCH', body: input, signal })
      return parseBranch(readEnvelopeData(response.body))
    },

    // GET/PUT /api/v1/admin/delivery-settings: view needs branches.view, PUT needs branches.manage.
    async getDeliverySettings(signal?: AbortSignal) {
      const response = await request('/api/v1/admin/delivery-settings', { signal })
      return parseDeliverySettings(readEnvelopeData(response.body))
    },

    async updateDeliverySettings(input: DeliverySettings, signal?: AbortSignal) {
      validateDeliverySettings(input)
      const response = await request('/api/v1/admin/delivery-settings', { method: 'PUT', body: input, signal })
      return parseDeliverySettings(readEnvelopeData(response.body))
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
      const categoriesResponse = await request('/api/v1/menu/categories', { signal })
      const rawCategories = readEnvelopeList(categoriesResponse.body)
      const categories = rawCategories.flatMap((value) => {
        if (!isRecord(value)) return []
        const id = stringOrNull(value.id)
        return id ? [{ id, value }] : []
      })
      // The public items read is paged ({ items, totalCount, ... }) and its items
      // carry no categoryId, so read each category's items on its own.
      return Promise.all(
        categories.map(async ({ id, value }) => {
          const itemsResponse = await request('/api/v1/menu/items', {
            query: { categoryId: id, pageSize: 100 },
            signal,
          })
          const data = readEnvelopeData(itemsResponse.body) as Record<string, unknown>
          const rawItems = Array.isArray(data.items) ? data.items : []
          const items = rawItems.flatMap((raw) => {
            const item = parsePublicMenuItem(raw)
            return item ? [{ ...item, categoryId: id }] : []
          })
          return {
            id,
            nameAr: stringOrNull(value.nameAr) ?? '',
            nameEn: stringOrNull(value.nameEn) ?? '',
            count: numberOrNull(value.itemCount) ?? items.length,
            items,
          }
        }),
      )
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

    // The backend has no reports endpoint, so the report is computed from the
    // real orders of the current and the previous window (see reportsFromOrders).
    async getReportsSummary(range: ReportRange, signal?: AbortSignal): Promise<ReportsSummary> {
      const now = new Date()
      const window = reportWindow(range, now)
      const orders: AdminOrderListItem[] = []
      for (let pageNumber = 1; pageNumber <= REPORT_MAX_PAGES; pageNumber += 1) {
        const page = await api.listOrders(
          { fromDate: window.previousFrom.toISOString(), toDate: now.toISOString(), pageNumber, pageSize: REPORT_PAGE_SIZE },
          signal,
        )
        orders.push(...page.items)
        if (!page.hasNextPage || page.items.length === 0) break
      }
      const counted = ordersInWindow(orders, window.from, window.to).slice(0, REPORT_DETAIL_LIMIT)
      const details: AdminOrderDetails[] = []
      for (let index = 0; index < counted.length; index += REPORT_DETAIL_BATCH) {
        const batch = counted.slice(index, index + REPORT_DETAIL_BATCH)
        const results = await Promise.allSettled(batch.map((order) => api.getOrderDetails(order.orderId, signal)))
        for (const result of results) if (result.status === 'fulfilled') details.push(result.value)
      }
      return buildReportSummary(range, orders, details, now)
    },

    async listNotifications(query: NotificationListQuery = {}, signal?: AbortSignal) {
      const response = await request('/api/v1/admin/notifications', {
        query: {
          cursor: query.cursor,
          pageSize: query.pageSize,
          unreadOnly: query.unreadOnly ? 'true' : undefined,
          branchId: query.branchId,
          sinceUtc: query.sinceUtc,
        },
        signal,
      })
      return parseNotificationFeed(readEnvelopeData(response.body))
    },

    async markNotificationRead(notificationId: string, signal?: AbortSignal) {
      if (!requireId(notificationId)) throw new ApiError('validation')
      await request(`/api/v1/admin/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'POST',
        signal,
      })
    },

    async markAllNotificationsRead(signal?: AbortSignal) {
      await request('/api/v1/admin/notifications/read-all', { method: 'POST', signal })
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
  return api
}
