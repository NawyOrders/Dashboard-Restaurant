import type { Api } from './Api'
import {
  ApiError,
  type AdminOrderDetails,
  type AdminOrderListItem,
  type BestSeller,
  type BranchDetails,
  type BrandingFetchResult,
  type ListOrdersQuery,
  type MenuCategory,
  type PagedResult,
  type PaymentBreakdown,
  type ReportRange,
  type ReportsSummary,
  type RestaurantBranding,
  type RestaurantSettings,
} from './types'

// OrderStatus codes from the API reference: 0=New, 1=Accepted, 2=Rejected,
// 3=Preparing, 4=Ready, 5=OutForDelivery, 6=Completed, 7=CancelledByRestaurant,
// 8=Closed. The mock covers every board column.
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
  order('00000000-0000-4000-8000-000000000101', 'ORD-2841', 'منى عبد الله', 148.5, 0, '2026-11-11T09:12:00Z'),
  order('00000000-0000-4000-8000-000000000102', 'ORD-2840', 'Ahmed Hassan', 92, 1, '2026-11-11T09:04:00Z'),
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

const MOCK_MENU: MenuCategory[] = [
  {
    id: 'grills',
    nameAr: 'المشويات',
    nameEn: 'Grills',
    count: 24,
    items: [
      item('m1', 'ريش غنم مشوية', 'Grilled Lamb Chops', 250, false, 'grills'),
      item('m2', 'مشاوي مشكل', 'Mixed Grill', 140, true, 'grills'),
      item('m3', 'شيش طاووق', 'Shish Tawook', 200, true, 'grills'),
      item('m4', 'كباب لحم مشوي', 'Grilled Beef Kebab', 150, true, 'grills'),
      item('m5', 'لحم مشوي بالخضار', 'Grilled Meat with Vegetables', 180, true, 'grills'),
      item('m6', 'شاورما دجاج سوري', 'Syrian Chicken Shawarma', 100, false, 'grills'),
      item('m7', 'دجاج مشوي', 'Grilled Chicken', 110, true, 'grills'),
      item('m8', 'كفتة مشوية', 'Grilled Kofta', 120, true, 'grills'),
    ],
  },
  {
    id: 'starters',
    nameAr: 'المقبلات',
    nameEn: 'Starters',
    count: 13,
    items: [
      item('s1', 'حمص بالطحينة', 'Hummus with Tahini', 45, true, 'starters'),
      item('s2', 'سلطة فتوش', 'Fattoush Salad', 60, false, 'starters'),
    ],
  },
  {
    id: 'drinks',
    nameAr: 'المشروبات',
    nameEn: 'Drinks',
    count: 11,
    items: [
      item('d1', 'عصير مانجو', 'Mango Juice', 40, false, 'drinks'),
      item('d2', 'مشروب غازي', 'Soda', 25, true, 'drinks'),
    ],
  },
]

function item(
  id: string,
  nameAr: string,
  nameEn: string,
  price: number,
  available: boolean,
  categoryId: string,
): MenuCategory['items'][number] {
  return { id, nameAr, nameEn, price, available, imageUrl: null, categoryId }
}

const BEST_SELLERS: BestSeller[] = [
  { id: 'b1', nameAr: 'برجر كلاسيك', nameEn: 'Classic Burger', units: 312, revenue: 9860, emoji: '🍔' },
  { id: 'b2', nameAr: 'بيتزا مارجريتا', nameEn: 'Margherita Pizza', units: 268, revenue: 8430, emoji: '🍕' },
  { id: 'b3', nameAr: 'بطاطس مقرمشة', nameEn: 'Crispy Fries', units: 241, revenue: 4820, emoji: '🍟' },
  { id: 'b4', nameAr: 'شاورما دجاج', nameEn: 'Chicken Shawarma', units: 196, revenue: 4230, emoji: '🌯' },
  { id: 'b5', nameAr: 'مشروب غازي', nameEn: 'Soda', units: 174, revenue: 2610, emoji: '🥤' },
]

const PEAK_HOURS = [
  { hour: 0, orders: 38 },
  { hour: 2, orders: 28 },
  { hour: 4, orders: 20 },
  { hour: 6, orders: 24 },
  { hour: 8, orders: 42 },
  { hour: 10, orders: 58 },
  { hour: 12, orders: 76 },
  { hour: 14, orders: 84 },
  { hour: 16, orders: 96 },
  { hour: 18, orders: 112 },
  { hour: 20, orders: 138 },
  { hour: 21, orders: 142 },
  { hour: 22, orders: 120 },
  { hour: 23, orders: 70 },
]

function payments(cash: number, instapay: number, wallet: number): PaymentBreakdown[] {
  return [
    { key: 'cash', percentage: 48, count: cash },
    { key: 'instapay', percentage: 32, count: instapay },
    { key: 'wallet', percentage: 20, count: wallet },
  ]
}

function scaledSellers(factor: number, revenueFactor: number): BestSeller[] {
  return BEST_SELLERS.map((seller) => ({
    ...seller,
    units: Math.round(seller.units * factor),
    revenue: Math.round(seller.revenue * revenueFactor),
  }))
}

const MOCK_REPORTS: Record<ReportRange, ReportsSummary> = {
  today: {
    range: 'today',
    revenue: 12480,
    deltaPercent: 8.6,
    orders: 148,
    averageOrder: 84.3,
    netProfit: 3820,
    dateFrom: '2026-11-01',
    dateTo: '2026-11-01',
    payments: payments(71, 47, 30),
    peakHours: PEAK_HOURS,
    bestSellers: scaledSellers(0.13, 0.13),
  },
  week: {
    range: 'week',
    revenue: 48250,
    deltaPercent: 12.4,
    orders: 1284,
    averageOrder: 37.6,
    netProfit: 14820,
    dateFrom: '2026-10-06',
    dateTo: '2026-11-01',
    payments: payments(616, 411, 257),
    peakHours: PEAK_HOURS,
    bestSellers: scaledSellers(1, 1),
  },
  month: {
    range: 'month',
    revenue: 248250,
    deltaPercent: 18.2,
    orders: 6420,
    averageOrder: 38.7,
    netProfit: 76820,
    dateFrom: '2026-10-01',
    dateTo: '2026-11-01',
    payments: payments(3082, 2054, 1284),
    peakHours: PEAK_HOURS,
    bestSellers: scaledSellers(5, 5),
  },
}

const MOCK_SETTINGS: RestaurantSettings = {
  restaurantName: 'كرم الشام — فرع المهندسين',
  branchPhone: '01098765432',
  address: 'شارع جامعة الدول العربية، المهندسين، الجيزة (تغطية دائرة 10 كم)',
  deliveryFee: 25,
  minimumOrder: 70,
  prepTimeMinutes: 20,
  notifications: { repeatSound: true, autoPrint: true, notifyOnDispatch: true },
  payments: {
    cash: true,
    instapay: true,
    instapayHandle: 'instapay@01098765432',
    wallets: true,
    walletProviders: 'فودافون كاش / وي باي',
  },
  workingHours: {
    autoClose: true,
    weekdaysFrom: '11:00 ص',
    weekdaysTo: '03:00 ص',
    fridayFrom: '01:00 م',
    fridayTo: '04:00 ص',
  },
}

function cloneReport(summary: ReportsSummary): ReportsSummary {
  return {
    ...summary,
    payments: summary.payments.map((payment) => ({ ...payment })),
    peakHours: summary.peakHours.map((point) => ({ ...point })),
    bestSellers: summary.bestSellers.map((seller) => ({ ...seller })),
  }
}

function cloneSettings(settings: RestaurantSettings): RestaurantSettings {
  return {
    ...settings,
    notifications: { ...settings.notifications },
    payments: { ...settings.payments },
    workingHours: { ...settings.workingHours },
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
  const liveStatuses = new Map<string, number>()
  const menu = MOCK_MENU.map((category) => ({
    ...category,
    items: category.items.map((entry) => ({ ...entry })),
  }))
  const reports: Record<ReportRange, ReportsSummary> = {
    today: cloneReport(MOCK_REPORTS.today),
    week: cloneReport(MOCK_REPORTS.week),
    month: cloneReport(MOCK_REPORTS.month),
  }
  let settings = cloneSettings(MOCK_SETTINGS)

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

    async getOrderDetails(id: string, signal?: AbortSignal): Promise<AdminOrderDetails> {
      await guard(signal)
      const target = orders.find((item) => item.orderId === id)
      if (!target) throw new ApiError('notFound')
      return {
        ...target,
        branchNameAr: 'فرع المعادي',
        branchNameEn: 'Maadi Branch',
        areaId: null,
        address: '15 Street 9, Maadi, Cairo',
        contactPhone: '+201001234567',
        customerNotes: null,
        rejectionReason: null,
        subTotal: Math.round((target.total - (target.vatAmount ?? 0)) * 100) / 100,
        deliveryFee: 25,
        productDiscountAmount: 0,
        deliveryDiscountAmount: 0,
        vatRate: 14,
        vatBaseAmount: target.total,
        modifiedAtUtc: null,
        items: [
          {
            orderItemId: `${target.orderId}-i1`,
            menuItemId: 'm1',
            itemSizeId: null,
            itemName: target.customerName ?? 'Order',
            sizeName: null,
            unitPrice: target.total,
            quantity: 1,
            lineTotal: target.total,
          },
        ],
        payment: {
          paymentId: `${target.orderId}-p1`,
          paymentMethod: target.paymentMethod,
          paymentStatus: target.paymentStatus,
          accountIdentifier: 'restaurant@instapay',
          requiresVerificationProof: (target.paymentMethod ?? 0) !== 0,
          proofUrl: null,
          proofUrlExpiresAtUtc: null,
        },
      }
    },

    async getOrderReceiptHtml(id: string, signal?: AbortSignal): Promise<string> {
      await guard(signal)
      const target = orders.find((item) => item.orderId === id)
      if (!target) throw new ApiError('notFound')
      const number = target.orderNumber ?? target.orderId
      return `<!DOCTYPE html><html><body><h1>Receipt ${number}</h1><p>Total: ${target.total}</p></body></html>`
    },

    async transitionOrderStatus(id: string, targetStatus: number, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!id.trim() || !Number.isInteger(targetStatus)) throw new ApiError('validation')
      const target = orders.find((item) => item.orderId === id)
      if (target) {
        target.status = targetStatus
        return
      }
      // Live-order IDs are page-seeded; keep their transition state inside the
      // mock adapter so a reload of the page can be wired later.
      if (/^#\d{3,}$/.test(id)) {
        liveStatuses.set(id, targetStatus)
        return
      }
      throw new ApiError('notFound')
    },

    async acceptOrder(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!id.trim()) throw new ApiError('validation')
      const target = orders.find((item) => item.orderId === id)
      if (!target || target.status !== 0) throw new ApiError(target ? 'validation' : 'notFound')
      target.status = 1
    },

    async rejectOrder(id: string, rejectionReason: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!id.trim() || !rejectionReason.trim()) throw new ApiError('validation')
      const target = orders.find((item) => item.orderId === id)
      if (!target || target.status !== 0) throw new ApiError(target ? 'validation' : 'notFound')
      target.status = 2
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

    async listMenu(signal?: AbortSignal): Promise<MenuCategory[]> {
      await guard(signal)
      return menu.map((category) => ({
        ...category,
        items: category.items.map((entry) => ({ ...entry })),
      }))
    },

    async listBranches(signal?: AbortSignal): Promise<BranchDetails[]> {
      await guard(signal)
      return [{
        id: '00000000-0000-4000-8000-0000000000bb',
        nameAr: 'فرع المعادي',
        nameEn: 'Maadi Branch',
        address: '15 Street 9, Maadi, Cairo',
        isActive: true,
        isPrimary: true,
        sortOrder: 0,
      }]
    },

    async updateMenuItemAvailability(itemId: string, branchId: string, available: boolean, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!itemId.trim() || !branchId.trim()) throw new ApiError('validation')
      for (const category of menu) {
        const target = category.items.find((entry) => entry.id === itemId)
        if (target) {
          target.available = available
          return
        }
      }
      throw new ApiError('notFound')
    },

    async getReportsSummary(range: ReportRange, signal?: AbortSignal): Promise<ReportsSummary> {
      await guard(signal)
      if (!(range in reports)) throw new ApiError('validation')
      return cloneReport(reports[range])
    },

    async getRestaurantSettings(signal?: AbortSignal): Promise<RestaurantSettings> {
      await guard(signal)
      return cloneSettings(settings)
    },

    async updateRestaurantSettings(next: RestaurantSettings, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!next.restaurantName.trim()) throw new ApiError('validation')
      settings = cloneSettings(next)
    },
  }
}
