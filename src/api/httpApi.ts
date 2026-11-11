import type { Api } from './Api'
import {
  ApiError,
  isRecord,
  numberOrNull,
  stringOrNull,
  type AdminOrderListItem,
  type BrandingFetchResult,
  type ListOrdersQuery,
  type PagedResult,
  type RestaurantBranding,
} from './types'

const DEFAULT_TIMEOUT_MS = 15_000

export type HttpApiOptions = {
  baseUrl: string
  getAccessToken: () => string | null
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  query?: Record<string, string | number | undefined>
  body?: object
  etag?: string
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
          payload = await response.json()
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

    async getBranding(etag?: string, signal?: AbortSignal): Promise<BrandingFetchResult> {
      const response = await request('/api/v1/Branding', { etag, signal })
      if (response.status === 304) {
        return { notModified: true, etag: response.etag }
      }
      const branding = parseBranding(readEnvelopeData(response.body))
      return { notModified: false, branding, etag: response.etag ?? branding.eTag }
    },
  }
}
