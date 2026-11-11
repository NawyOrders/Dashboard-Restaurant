import type { Api } from './Api'
import {
  ApiError,
  type AdminOrderListItem,
  type BrandingFetchResult,
  type ListOrdersQuery,
  type PagedResult,
  type RestaurantBranding,
} from './types'

// Numeric status values are backend-defined; the OpenAPI document exposes them
// only as int32. The mock uses the BRD state-machine order as a stable stand-in.
const MOCK_BRANDING: RestaurantBranding = {
  tenantId: '00000000-0000-4000-8000-0000000000aa',
  nameAr: 'كرم الشام',
  nameEn: 'Karam Al-Sham',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#A01F13',
  secondaryColor: '#C2281A',
  accentColor: '#D9B45A',
  backgroundColor: '#FDF8F1',
  surfaceColor: '#FFFFFF',
  textOnPrimaryColor: '#FFFFFF',
  contactPhone: '+20 100 000 0000',
  contactEmail: 'hello@example.test',
  whatsAppUrl: null,
  messengerUrl: null,
  socialLinks: { instagram: 'https://instagram.com/example' },
  eTag: '"mock-branding-v1"',
}

const MOCK_ORDERS: AdminOrderListItem[] = [
  order('00000000-0000-4000-8000-000000000101', 'ORD-2841', 'منى عبد الله', 148.5, 1, '2026-11-11T09:12:00Z'),
  order('00000000-0000-4000-8000-000000000102', 'ORD-2840', 'Ahmed Hassan', 92, 2, '2026-11-11T09:04:00Z'),
  order('00000000-0000-4000-8000-000000000103', 'ORD-2839', 'سارة محمود', 214.25, 1, '2026-11-11T08:57:00Z'),
  order('00000000-0000-4000-8000-000000000104', 'ORD-2838', 'Youssef Ali', 64, 3, '2026-11-11T08:41:00Z'),
  order('00000000-0000-4000-8000-000000000105', 'ORD-2837', 'نور خالد', 310.75, 5, '2026-11-11T08:20:00Z'),
  order('00000000-0000-4000-8000-000000000106', 'ORD-2836', 'Mariam Samir', 128, 5, '2026-11-11T08:02:00Z'),
  order('00000000-0000-4000-8000-000000000107', 'ORD-2835', 'عمر فتحي', 76.5, 6, '2026-11-11T07:45:00Z'),
]

function order(
  orderId: string,
  orderNumber: string,
  customerName: string,
  total: number,
  status: number,
  createdAtUtc: string,
): AdminOrderListItem {
  return {
    orderId,
    orderNumber,
    status,
    fulfilmentType: 1,
    branchId: '00000000-0000-4000-8000-0000000000bb',
    customerName,
    total,
    vatAmount: Math.round(total * 0.14 * 100) / 100,
    createdAtUtc,
    paymentMethod: 1,
    paymentStatus: 1,
  }
}

export type MockApiOptions = {
  latencyMs?: number
  fail?: boolean
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('Request cancelled', 'AbortError'))
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Request cancelled', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function withinRange(createdAtUtc: string, fromDate?: string, toDate?: string): boolean {
  const created = Date.parse(createdAtUtc)
  if (!Number.isFinite(created)) return false
  if (fromDate && created < Date.parse(fromDate)) return false
  if (toDate && created > Date.parse(toDate)) return false
  return true
}

export function createMockApi(options: MockApiOptions = {}): Api {
  const latencyMs = options.latencyMs ?? 350
  const fail = options.fail ?? false
  const orders = MOCK_ORDERS.map((item) => ({ ...item }))

  async function guard(signal?: AbortSignal): Promise<void> {
    await wait(latencyMs, signal)
    if (fail) throw new ApiError('service')
  }

  return {
    async listOrders(query: ListOrdersQuery = {}, signal?: AbortSignal): Promise<PagedResult<AdminOrderListItem>> {
      await guard(signal)
      const filtered = orders.filter((item) => {
        if (query.branchId && item.branchId !== query.branchId) return false
        if (query.status != null && item.status !== query.status) return false
        if (query.paymentMethod != null && item.paymentMethod !== query.paymentMethod) return false
        return withinRange(item.createdAtUtc, query.fromDate, query.toDate)
      })

      const pageSize = Math.max(1, query.pageSize ?? 20)
      const page = Math.max(1, query.pageNumber ?? 1)
      const totalCount = filtered.length
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const start = (page - 1) * pageSize

      return {
        items: filtered.slice(start, start + pageSize).map((item) => ({ ...item })),
        totalCount,
        page,
        pageSize,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }
    },

    async transitionOrderStatus(id: string, targetStatus: number, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!id.trim() || !Number.isInteger(targetStatus)) throw new ApiError('validation')
      const target = orders.find((item) => item.orderId === id)
      if (!target) throw new ApiError('notFound')
      target.status = targetStatus
    },

    async getBranding(etag?: string, signal?: AbortSignal): Promise<BrandingFetchResult> {
      await guard(signal)
      if (etag && etag === MOCK_BRANDING.eTag) {
        return { notModified: true, etag: MOCK_BRANDING.eTag }
      }
      return {
        notModified: false,
        branding: { ...MOCK_BRANDING, socialLinks: MOCK_BRANDING.socialLinks ? { ...MOCK_BRANDING.socialLinks } : null },
        etag: MOCK_BRANDING.eTag,
      }
    },
  }
}
