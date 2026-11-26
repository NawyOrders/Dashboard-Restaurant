import type { Api } from './Api'
import {
  validateCreateAddOn,
  validateUpdateAddOn,
  type AddOn,
  type CreateAddOnInput,
  type ListAddOnsQuery,
  type UpdateAddOnInput,
} from './addOns'
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
  type PaymentMethodName,
  type RestaurantPaymentMethodConfig,
  type UpdatePaymentMethodInput,
} from './types'
import {
  validateMenuItemImageRequest,
  validateMenuItemInput,
  type CreateMenuItemInput,
  type ManagedMenuItem,
  type MenuItemImageUploadRequest,
  type MenuItemImageUploadUrl,
  type UpdateMenuItemInput,
} from './menuItems'
import {
  validateCreateCategory,
  validateReorder,
  validateUpdateCategory,
  type CategorySummary,
  type CreateCategoryInput,
  type ManagedCategory,
  type ReorderCategoriesInput,
  type UpdateCategoryInput,
} from './categories'
import {
  validateCreateRole,
  validatePermissionKeys,
  validateUpdateRole,
  type CreateRoleInput,
  type PermissionInfo,
  type RoleSummary,
  type UpdateRoleInput,
} from './roles'
import { PERMISSIONS } from '../authz'
import {
  validateInviteStaff,
  validateStaffListQuery,
  type InviteStaffInput,
  type ListStaffQuery,
  type StaffUser,
} from './staff'
import {
  DAYS_OF_WEEK,
  validateCreateBranch,
  validateDeliverySettings,
  validateUpdateBranch,
  type BranchDetails,
  type CreateBranchInput,
  type DeliverySettings,
  type ListBranchesQuery,
  type UpdateBranchInput,
} from './branches'
import {
  validateCreateOffer,
  validateOfferImageRequest,
  validateOfferListQuery,
  validateUpdateOffer,
  type CreateOfferInput,
  type ListOffersQuery,
  type OfferImageUploadRequest,
  type OfferImageUploadUrl,
  type OfferStatusInput,
  type PromotionalOffer,
  type UpdateOfferInput,
} from './offers'
import { requireId, validatePaging } from './shared'
import { validatePaymentMethodUpdate } from './paymentMethods'

// Role ids used by the mock staff directory. Real ids come from GET /api/v1/admin/roles.
const MOCK_ROLE_IDS = {
  owner: '00000000-0000-7000-8000-0000000000c1',
  orderStaff: '00000000-0000-7000-8000-0000000000c2',
}

const MOCK_PAYMENT_METHODS: RestaurantPaymentMethodConfig[] = [
  { paymentMethod: 'Cash', nameAr: 'الدفع عند الاستلام', nameEn: 'Cash on Delivery', accountIdentifier: null, isEnabled: true, requiresVerificationProof: false, instructionsAr: 'يرجى تجهيز المبلغ نقداً', instructionsEn: 'Please prepare exact cash upon delivery' },
  { paymentMethod: 'InstaPay', nameAr: 'إنستا باي', nameEn: 'InstaPay', accountIdentifier: 'demo@instapay', isEnabled: true, requiresVerificationProof: true, instructionsAr: 'حول المبلغ وارفع صورة الإيصال', instructionsEn: 'Transfer the total and upload the receipt screenshot' },
  { paymentMethod: 'MobileWallet', nameAr: 'محفظة إلكترونية', nameEn: 'Mobile Wallet', accountIdentifier: '01001234567', isEnabled: false, requiresVerificationProof: true, instructionsAr: null, instructionsEn: null },
]

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
  order('00000000-0000-4000-8000-000000000101', 'ORD-2841', 'منى عبد الله', 148.5, 0, '2026-11-11T09:12:00Z', 2),
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
  paymentStatus = 1,
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
    paymentStatus,
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
  let branches: BranchDetails[] = [
    {
      id: '00000000-0000-7000-8000-0000000000b1',
      nameAr: 'الفرع الرئيسي',
      nameEn: 'Main Branch',
      address: '15 Street 9, Maadi, Cairo',
      latitude: 29.9602,
      longitude: 31.2569,
      phone: '+20223581234',
      status: 'Open',
      isActive: true,
      isPrimary: true,
      sortOrder: 0,
      workingHours: DAYS_OF_WEEK.map((dayOfWeek) => ({
        dayOfWeek,
        isClosed: false,
        openTime: '10:00:00',
        closeTime: '02:00:00',
        closesNextDay: true,
      })),
    },
  ]
  let staff: StaffUser[] = [
    {
      id: '00000000-0000-7000-8000-0000000000a1',
      fullName: 'Demo Owner',
      email: 'owner@mock.local',
      phone: null,
      roleId: MOCK_ROLE_IDS.owner,
      role: 'Owner',
      branchIds: ['00000000-0000-7000-8000-0000000000b1'],
      isActive: true,
      status: 'Active',
      mustSetInitialPassword: false,
      activationTokenExpiresAtUtc: null,
      lastLoginAt: null,
    },
  ]
  let roles: RoleSummary[] = [
    {
      id: MOCK_ROLE_IDS.owner,
      name: 'Owner',
      description: 'Full restaurant owner access',
      kind: 'Owner',
      isProtected: true,
      canBeDeleted: false,
      staffCount: 1,
      permissionKeys: Object.values(PERMISSIONS),
    },
    {
      id: MOCK_ROLE_IDS.orderStaff,
      name: 'OrderStaff',
      description: 'Handles incoming orders',
      kind: 'Seeded',
      isProtected: false,
      canBeDeleted: false,
      staffCount: 0,
      permissionKeys: [PERMISSIONS.ordersView, PERMISSIONS.ordersAccept, PERMISSIONS.ordersReject],
    },
  ]
  let categories: ManagedCategory[] = []
  let managedItems: ManagedMenuItem[] = []
  let itemSeq = 0
  let addOns: AddOn[] = []
  let addOnSeq = 0
  let categorySeq = 0
  let roleSeq = 2
  let staffSeq = 1
  let branchSeq = 1
  let deliverySettings: DeliverySettings = { baseDeliveryFee: 20, deliveryFeePerKm: 4.5, maxDeliveryRadiusKm: 15 }
  let offers: PromotionalOffer[] = []
  let offerSeq = 0
  let paymentMethods = MOCK_PAYMENT_METHODS.map((item) => ({ ...item }))

  async function guard(signal?: AbortSignal): Promise<void> {
    await wait(latencyMs, signal)
    if (fail) throw new ApiError('service')
  }

  // The real server prices items from the menu; the mock uses a flat unit price.
  const MOCK_UNIT_PRICE = 100

  function offerStatus(offer: Pick<PromotionalOffer, 'isActive' | 'startsAtUtc' | 'endsAtUtc'>): PromotionalOffer['status'] {
    if (!offer.isActive) return 'Inactive'
    const now = Date.now()
    if (Date.parse(offer.endsAtUtc) <= now) return 'Expired'
    if (Date.parse(offer.startsAtUtc) > now) return 'Scheduled'
    return 'Active'
  }

  function buildOffer(id: string, input: CreateOfferInput | UpdateOfferInput, previous?: PromotionalOffer): PromotionalOffer {
    const items = input.items.map((item, index) => ({
      id: `${id}-item-${index + 1}`,
      menuItemId: item.menuItemId,
      menuItemNameAr: '',
      menuItemNameEn: '',
      itemSizeId: item.itemSizeId ?? null,
      itemSizeNameAr: null,
      itemSizeNameEn: null,
      quantity: item.quantity,
      unitPriceSnapshot: MOCK_UNIT_PRICE,
    }))
    const originalPrice = items.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0)
    if (input.offerPrice >= originalPrice) throw new ApiError('validation')
    const saved = originalPrice - input.offerPrice
    const keepImage = input.imageKey == null && previous
    const imageKey = keepImage ? previous.imageKey : (input.imageKey ?? '')
    const next: PromotionalOffer = {
      id,
      kind: input.kind,
      status: 'Inactive',
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr ?? null,
      descriptionEn: input.descriptionEn ?? null,
      imageKey,
      // The preview has no CDN; screens show a placeholder instead of a dead URL.
      imageUrl: null,
      imageSource: keepImage ? previous.imageSource : (input.imageSource ?? 'ManualUpload'),
      originalPrice,
      offerPrice: input.offerPrice,
      savedAmount: saved,
      discountPercentage: Math.round((saved / originalPrice) * 1000) / 10,
      startsAtUtc: input.startsAtUtc,
      endsAtUtc: input.endsAtUtc,
      isActive: input.isActive,
      branchIds: input.branchIds ?? null,
      items,
      createdAtUtc: previous?.createdAtUtc ?? new Date().toISOString(),
      modifiedAtUtc: previous ? new Date().toISOString() : null,
    }
    next.status = offerStatus(next)
    return next
  }

  function findOffer(id: string): PromotionalOffer {
    requireId(id)
    const offer = offers.find((item) => item.id === id)
    if (!offer) throw new ApiError('notFound')
    return offer
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

    // Mirrors the reference: non-cash needs ProofSubmitted (2), cash needs CashDue (0).
    async confirmPayment(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      if (!id.trim()) throw new ApiError('validation')
      const target = orders.find((item) => item.orderId === id)
      if (!target) throw new ApiError('notFound')
      const expected = target.paymentMethod === 0 ? 0 : 2
      if (target.paymentStatus !== expected) throw new ApiError('validation')
      target.paymentStatus = 3
    },

    async rejectPaymentProof(id: string, rejectionReason: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      const reason = rejectionReason.trim()
      if (!id.trim() || !reason || reason.length > 1000) throw new ApiError('validation')
      const target = orders.find((item) => item.orderId === id)
      if (!target) throw new ApiError('notFound')
      if (target.paymentStatus !== 2) throw new ApiError('validation')
      target.paymentStatus = 4
    },

    async listPaymentMethods(signal?: AbortSignal): Promise<RestaurantPaymentMethodConfig[]> {
      await guard(signal)
      return paymentMethods.map((item) => ({ ...item }))
    },

    async updatePaymentMethod(
      method: PaymentMethodName,
      input: UpdatePaymentMethodInput,
      signal?: AbortSignal,
    ): Promise<RestaurantPaymentMethodConfig> {
      await guard(signal)
      validatePaymentMethodUpdate(method, input)
      const target = paymentMethods.find((item) => item.paymentMethod === method)
      if (!target) throw new ApiError('notFound')
      const next = { ...target }
      if (input.nameAr != null) next.nameAr = input.nameAr
      if (input.nameEn != null) next.nameEn = input.nameEn
      if (input.accountIdentifier != null) next.accountIdentifier = input.accountIdentifier || null
      if (input.isEnabled != null) next.isEnabled = input.isEnabled
      if (input.requiresVerificationProof != null) next.requiresVerificationProof = input.requiresVerificationProof
      if (input.instructionsAr != null) next.instructionsAr = input.instructionsAr || null
      if (input.instructionsEn != null) next.instructionsEn = input.instructionsEn || null
      // Non-cash methods that are enabled need an account identifier.
      if (method !== 'Cash' && next.isEnabled && !next.accountIdentifier) throw new ApiError('validation')
      paymentMethods = paymentMethods.map((item) => (item.paymentMethod === method ? next : item))
      return { ...next }
    },

    async createOfferImageUploadUrl(input: OfferImageUploadRequest, signal?: AbortSignal): Promise<OfferImageUploadUrl> {
      await guard(signal)
      validateOfferImageRequest(input)
      const extension = input.contentType.split('/')[1]
      const objectKey = `tenants/mock/offers/manual/${Date.now()}.${extension}`
      return {
        objectKey,
        uploadUrl: `https://uploads.example.test/${objectKey}`,
        expiresAtUtc: new Date(Date.now() + 15 * 60_000).toISOString(),
        contentType: input.contentType,
        maximumSizeBytes: 5_242_880,
      }
    },

    async createOffer(input: CreateOfferInput, signal?: AbortSignal): Promise<PromotionalOffer> {
      await guard(signal)
      validateCreateOffer(input)
      offerSeq += 1
      const created = buildOffer(`00000000-0000-7000-8000-${String(offerSeq).padStart(12, '0')}`, input)
      offers = [created, ...offers]
      return structuredClone(created)
    },

    async listOffers(query: ListOffersQuery = {}, signal?: AbortSignal): Promise<PagedResult<PromotionalOffer>> {
      await guard(signal)
      validateOfferListQuery(query)
      validatePaging(query.pageNumber, query.pageSize)
      const page = query.pageNumber ?? 1
      const pageSize = query.pageSize ?? 20
      const filtered = offers
        .map((offer) => ({ ...offer, status: offerStatus(offer) }))
        .filter((offer) => (!query.kind || offer.kind === query.kind) && (!query.status || offer.status === query.status))
      const totalPages = Math.ceil(filtered.length / pageSize)
      return {
        items: structuredClone(filtered.slice((page - 1) * pageSize, page * pageSize)),
        totalCount: filtered.length,
        page,
        pageSize,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }
    },

    async getOffer(id: string, signal?: AbortSignal): Promise<PromotionalOffer> {
      await guard(signal)
      const offer = findOffer(id)
      return structuredClone({ ...offer, status: offerStatus(offer) })
    },

    async updateOffer(id: string, input: UpdateOfferInput, signal?: AbortSignal): Promise<PromotionalOffer> {
      await guard(signal)
      const previous = findOffer(id)
      validateUpdateOffer(input)
      const next = buildOffer(id, input, previous)
      offers = offers.map((offer) => (offer.id === id ? next : offer))
      return structuredClone(next)
    },

    async setOfferStatus(id: string, input: OfferStatusInput, signal?: AbortSignal): Promise<PromotionalOffer> {
      await guard(signal)
      const previous = findOffer(id)
      const next = { ...previous, isActive: input.isActive, modifiedAtUtc: new Date().toISOString() }
      next.status = offerStatus(next)
      offers = offers.map((offer) => (offer.id === id ? next : offer))
      return structuredClone(next)
    },

    async deleteOffer(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      findOffer(id)
      offers = offers.filter((offer) => offer.id !== id)
    },

    async createMenuItemImageUploadUrl(input: MenuItemImageUploadRequest, signal?: AbortSignal): Promise<MenuItemImageUploadUrl> {
      await guard(signal)
      validateMenuItemImageRequest(input)
      const objectKey = `tenants/mock/menu/items/${Date.now()}.${input.contentType.split('/')[1]}`
      return {
        objectKey,
        uploadUrl: `https://uploads.example.test/${objectKey}`,
        expiresAtUtc: new Date(Date.now() + 15 * 60_000).toISOString(),
        contentType: input.contentType,
        maximumSizeBytes: 5_242_880,
      }
    },

    async createMenuItem(input: CreateMenuItemInput, signal?: AbortSignal): Promise<ManagedMenuItem> {
      await guard(signal)
      validateMenuItemInput(input)
      if (!categories.some((item) => item.id === input.categoryId && item.isActive)) throw new ApiError('notFound')
      itemSeq += 1
      const id = `00000000-0000-7000-8000-e${String(itemSeq).padStart(11, '0')}`
      const created: ManagedMenuItem = {
        id,
        categoryId: input.categoryId,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        descriptionAr: input.descriptionAr ?? null,
        descriptionEn: input.descriptionEn ?? null,
        imageKey: input.imageKey ?? null,
        imageUrl: input.imageKey ? `https://cdn.example.test/${input.imageKey}` : null,
        basePrice: input.basePrice,
        sortOrder: input.sortOrder,
        isActive: true,
        isVisibleToCustomers: input.isVisibleToCustomers ?? true,
        sizes: (input.sizes ?? []).map((size, index) => ({ ...size, id: `${id}-size-${index + 1}` })),
        branchAvailabilities: (input.branchAvailabilities ?? []).map((entry) => ({
          ...entry,
          updatedBy: null,
          updatedAt: new Date().toISOString(),
        })),
      }
      managedItems = [...managedItems, created]
      return structuredClone(created)
    },

    async updateMenuItem(id: string, input: UpdateMenuItemInput, signal?: AbortSignal): Promise<ManagedMenuItem> {
      await guard(signal)
      requireId(id)
      validateMenuItemInput(input)
      const current = managedItems.find((item) => item.id === id && item.isActive)
      if (!current) throw new ApiError('notFound')
      if (!categories.some((item) => item.id === input.categoryId && item.isActive)) throw new ApiError('notFound')
      const imageKey = input.imageKey ?? current.imageKey
      const next: ManagedMenuItem = {
        ...current,
        categoryId: input.categoryId,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        descriptionAr: input.descriptionAr ?? null,
        descriptionEn: input.descriptionEn ?? null,
        imageKey,
        imageUrl: imageKey ? `https://cdn.example.test/${imageKey}` : null,
        basePrice: input.basePrice,
        sortOrder: input.sortOrder,
        isVisibleToCustomers: input.isVisibleToCustomers ?? current.isVisibleToCustomers,
        sizes:
          input.sizes == null ? current.sizes : input.sizes.map((size, index) => ({ ...size, id: `${id}-size-${index + 1}` })),
      }
      for (const entry of input.branchAvailabilities ?? []) {
        const existing = next.branchAvailabilities.find((item) => item.branchId === entry.branchId)
        const stamped = { ...entry, updatedBy: null, updatedAt: new Date().toISOString() }
        next.branchAvailabilities = existing
          ? next.branchAvailabilities.map((item) => (item.branchId === entry.branchId ? stamped : item))
          : [...next.branchAvailabilities, stamped]
      }
      managedItems = managedItems.map((item) => (item.id === id ? next : item))
      return structuredClone(next)
    },

    async removeMenuItemImage(id: string, signal?: AbortSignal): Promise<ManagedMenuItem> {
      await guard(signal)
      requireId(id)
      const current = managedItems.find((item) => item.id === id && item.isActive)
      if (!current) throw new ApiError('notFound')
      const next = { ...current, imageKey: null, imageUrl: null }
      managedItems = managedItems.map((item) => (item.id === id ? next : item))
      return structuredClone(next)
    },

    async deleteMenuItem(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      if (!managedItems.some((item) => item.id === id && item.isActive)) throw new ApiError('notFound')
      managedItems = managedItems.filter((item) => item.id !== id)
    },

    async listAddOns(query: ListAddOnsQuery = {}, signal?: AbortSignal): Promise<PagedResult<AddOn>> {
      await guard(signal)
      validatePaging(query.pageNumber, query.pageSize)
      const page = query.pageNumber ?? 1
      const pageSize = query.pageSize ?? 20
      const filtered = addOns.filter((item) => query.isActive === undefined || item.isActive === query.isActive)
      const totalPages = Math.ceil(filtered.length / pageSize)
      return {
        items: structuredClone(filtered.slice((page - 1) * pageSize, page * pageSize)),
        totalCount: filtered.length,
        page,
        pageSize,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }
    },

    async createAddOn(itemId: string, input: CreateAddOnInput, signal?: AbortSignal): Promise<AddOn> {
      await guard(signal)
      requireId(itemId)
      validateCreateAddOn(input)
      if (!managedItems.some((item) => item.id === itemId && item.isActive)) throw new ApiError('notFound')
      addOnSeq += 1
      const created: AddOn = {
        id: `00000000-0000-7000-8000-a${String(addOnSeq).padStart(11, '0')}`,
        menuItemId: itemId,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        price: input.price,
        sortOrder: addOns.filter((item) => item.menuItemId === itemId).length,
        isActive: true,
      }
      addOns = [...addOns, created]
      return structuredClone(created)
    },

    async updateAddOn(itemId: string, addOnId: string, input: UpdateAddOnInput, signal?: AbortSignal): Promise<AddOn> {
      await guard(signal)
      requireId(itemId)
      requireId(addOnId)
      validateUpdateAddOn(input)
      if (!managedItems.some((item) => item.id === itemId && item.isActive)) throw new ApiError('notFound')
      const current = addOns.find((item) => item.id === addOnId && item.menuItemId === itemId)
      if (!current) throw new ApiError('notFound')
      const { sortOrder, ...fields } = input
      const patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
      const updated: AddOn = { ...current, ...patch }
      if (typeof patch.nameAr === 'string') updated.nameAr = patch.nameAr.trim()
      if (typeof patch.nameEn === 'string') updated.nameEn = patch.nameEn.trim()
      const siblings = addOns.filter((item) => item.menuItemId === itemId).sort((a, b) => a.sortOrder - b.sortOrder)
      const ordered = siblings.filter((item) => item.id !== addOnId)
      ordered.splice(Math.min(sortOrder ?? current.sortOrder, ordered.length), 0, updated)
      const positions = new Map(ordered.map((item, index) => [item.id, { ...item, sortOrder: index }]))
      addOns = addOns.map((item) => positions.get(item.id) ?? item)
      return structuredClone(positions.get(addOnId) as AddOn)
    },

    async deleteAddOn(itemId: string, addOnId: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(itemId)
      requireId(addOnId)
      if (!addOns.some((item) => item.id === addOnId && item.menuItemId === itemId)) throw new ApiError('notFound')
      addOns = addOns.filter((item) => item.id !== addOnId)
    },

    async listRootCategories(signal?: AbortSignal): Promise<CategorySummary[]> {
      await guard(signal)
      return categories
        .filter((item) => item.parentId === null && item.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          imageKey: item.imageKey,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          itemCount: 0,
          hasSubCategories: categories.some((child) => child.parentId === item.id && child.isActive),
        }))
    },

    async listSubcategories(categoryId: string, signal?: AbortSignal): Promise<CategorySummary[]> {
      await guard(signal)
      requireId(categoryId)
      return categories
        .filter((item) => item.parentId === categoryId && item.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          imageKey: item.imageKey,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          itemCount: 0,
          hasSubCategories: null,
        }))
    },

    async createCategory(input: CreateCategoryInput, signal?: AbortSignal): Promise<ManagedCategory> {
      await guard(signal)
      validateCreateCategory(input)
      if (input.parentId) {
        const parent = categories.find((item) => item.id === input.parentId && item.isActive)
        if (!parent) throw new ApiError('notFound')
        if (parent.parentId !== null) throw new ApiError('validation')
      }
      categorySeq += 1
      const created: ManagedCategory = {
        id: `00000000-0000-7000-8000-d${String(categorySeq).padStart(11, '0')}`,
        menuId: '00000000-0000-7000-8000-0000000000e1',
        parentId: input.parentId ?? null,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        imageKey: input.imageKey ?? null,
        sortOrder: input.sortOrder,
        isActive: true,
      }
      categories = [...categories, created]
      return { ...created }
    },

    async updateCategory(id: string, input: UpdateCategoryInput, signal?: AbortSignal): Promise<ManagedCategory> {
      await guard(signal)
      requireId(id)
      validateUpdateCategory(input)
      const current = categories.find((item) => item.id === id && item.isActive)
      if (!current) throw new ApiError('notFound')
      const next = { ...current, nameAr: input.nameAr.trim(), nameEn: input.nameEn.trim(), imageKey: input.imageKey ?? null }
      categories = categories.map((item) => (item.id === id ? next : item))
      return { ...next }
    },

    async reorderCategories(input: ReorderCategoriesInput, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      validateReorder(input)
      const parentId = input.parentId ?? null
      if (parentId && !categories.some((item) => item.id === parentId && item.isActive)) throw new ApiError('notFound')
      const level = categories.filter((item) => item.parentId === parentId && item.isActive)
      const sameSet =
        level.length === input.orderedCategoryIds.length && level.every((item) => input.orderedCategoryIds.includes(item.id))
      if (!sameSet) throw new ApiError('validation')
      categories = categories.map((item) => {
        const index = input.orderedCategoryIds.indexOf(item.id)
        return index === -1 ? item : { ...item, sortOrder: index }
      })
    },

    async deleteCategory(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      const current = categories.find((item) => item.id === id && item.isActive)
      if (!current) throw new ApiError('notFound')
      if (categories.some((item) => item.parentId === id && item.isActive)) throw new ApiError('conflict')
      categories = categories.filter((item) => item.id !== id)
    },

    async listPermissions(signal?: AbortSignal): Promise<PermissionInfo[]> {
      await guard(signal)
      return Object.values(PERMISSIONS).map((key) => ({ key, module: key.split('.')[0], description: key }))
    },

    async listRoles(signal?: AbortSignal): Promise<RoleSummary[]> {
      await guard(signal)
      return structuredClone(roles)
    },

    async getRole(id: string, signal?: AbortSignal): Promise<RoleSummary> {
      await guard(signal)
      requireId(id)
      const role = roles.find((item) => item.id === id)
      if (!role) throw new ApiError('notFound')
      return structuredClone(role)
    },

    async createRole(input: CreateRoleInput, signal?: AbortSignal): Promise<RoleSummary> {
      await guard(signal)
      validateCreateRole(input)
      const known: string[] = Object.values(PERMISSIONS)
      if (!input.permissionKeys.every((key) => known.includes(key))) throw new ApiError('validation')
      if (roles.some((role) => role.name.toLowerCase() === input.name.trim().toLowerCase())) throw new ApiError('conflict')
      roleSeq += 1
      const created: RoleSummary = {
        id: `00000000-0000-7000-8000-c${String(roleSeq).padStart(11, '0')}`,
        name: input.name.trim(),
        description: input.description ?? null,
        kind: 'Custom',
        isProtected: false,
        canBeDeleted: true,
        staffCount: 0,
        permissionKeys: [...input.permissionKeys],
      }
      roles = [...roles, created]
      return structuredClone(created)
    },

    async updateRole(id: string, input: UpdateRoleInput, signal?: AbortSignal): Promise<RoleSummary> {
      await guard(signal)
      requireId(id)
      validateUpdateRole(input)
      const role = roles.find((item) => item.id === id)
      if (!role) throw new ApiError('notFound')
      if (role.kind === 'Owner') throw new ApiError('conflict')
      if (role.kind === 'Seeded' && input.name !== role.name) throw new ApiError('conflict')
      if (roles.some((item) => item.id !== id && item.name.toLowerCase() === input.name.trim().toLowerCase())) {
        throw new ApiError('conflict')
      }
      role.name = input.name.trim()
      role.description = input.description ?? null
      return structuredClone(role)
    },

    async replaceRolePermissions(id: string, permissionKeys: string[], signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      validatePermissionKeys(permissionKeys)
      const role = roles.find((item) => item.id === id)
      if (!role) throw new ApiError('notFound')
      if (role.kind === 'Owner') throw new ApiError('conflict')
      const known: string[] = Object.values(PERMISSIONS)
      if (!permissionKeys.every((key) => known.includes(key))) throw new ApiError('validation')
      role.permissionKeys = [...permissionKeys]
    },

    async deleteRole(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      const role = roles.find((item) => item.id === id)
      if (!role) throw new ApiError('notFound')
      if (role.kind !== 'Custom' || role.staffCount > 0) throw new ApiError('conflict')
      roles = roles.filter((item) => item.id !== id)
    },

    async listStaff(query: ListStaffQuery = {}, signal?: AbortSignal): Promise<PagedResult<StaffUser>> {
      await guard(signal)
      validateStaffListQuery(query)
      const search = query.search?.trim().toLowerCase()
      const filtered = staff.filter(
        (user) =>
          (!query.branchId || user.branchIds.includes(query.branchId)) &&
          (!query.role || user.role === query.role) &&
          (!query.status || user.status === query.status) &&
          (!search || user.fullName.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)),
      )
      const page = query.pageNumber ?? 1
      const pageSize = query.pageSize ?? 20
      const totalPages = Math.ceil(filtered.length / pageSize)
      return {
        items: structuredClone(filtered.slice((page - 1) * pageSize, page * pageSize)),
        totalCount: filtered.length,
        page,
        pageSize,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }
    },

    async inviteStaff(input: InviteStaffInput, signal?: AbortSignal): Promise<StaffUser> {
      await guard(signal)
      validateInviteStaff(input)
      if (input.roleId === MOCK_ROLE_IDS.owner) throw new ApiError('conflict')
      if (staff.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw new ApiError('conflict')
      staffSeq += 1
      const created: StaffUser = {
        id: `00000000-0000-7000-8000-a${String(staffSeq).padStart(11, '0')}`,
        fullName: input.fullName.trim(),
        email: input.email,
        phone: input.phone || null,
        roleId: input.roleId,
        role: 'OrderStaff',
        branchIds: [...input.branchIds],
        isActive: false,
        status: 'PendingInvitation',
        mustSetInitialPassword: true,
        activationTokenExpiresAtUtc: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        lastLoginAt: null,
      }
      staff = [...staff, created]
      return structuredClone(created)
    },

    async resendStaffInvitation(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      const user = staff.find((item) => item.id === id)
      if (!user) throw new ApiError('notFound')
      if (user.status !== 'PendingInvitation') throw new ApiError('conflict')
      user.activationTokenExpiresAtUtc = new Date(Date.now() + 3 * 86_400_000).toISOString()
    },

    async changeStaffRole(id: string, roleId: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      requireId(roleId)
      const user = staff.find((item) => item.id === id)
      if (!user) throw new ApiError('notFound')
      if (roleId === MOCK_ROLE_IDS.owner) throw new ApiError('conflict')
      user.roleId = roleId
    },

    async deleteStaff(id: string, signal?: AbortSignal): Promise<void> {
      await guard(signal)
      requireId(id)
      const user = staff.find((item) => item.id === id)
      if (!user) throw new ApiError('notFound')
      if (user.role === 'Owner') throw new ApiError('conflict')
      staff = staff.filter((item) => item.id !== id)
    },

    async listBranches(query: ListBranchesQuery = {}, signal?: AbortSignal): Promise<PagedResult<BranchDetails>> {
      await guard(signal)
      validatePaging(query.pageNumber, query.pageSize)
      const page = query.pageNumber ?? 1
      const pageSize = query.pageSize ?? 20
      const sorted = [...branches].sort((a, b) => a.sortOrder - b.sortOrder)
      const totalPages = Math.ceil(sorted.length / pageSize)
      return {
        items: structuredClone(sorted.slice((page - 1) * pageSize, page * pageSize)),
        totalCount: sorted.length,
        page,
        pageSize,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      }
    },

    async getBranch(id: string, signal?: AbortSignal): Promise<BranchDetails> {
      await guard(signal)
      requireId(id)
      const branch = branches.find((item) => item.id === id)
      if (!branch) throw new ApiError('notFound')
      return structuredClone(branch)
    },

    async createBranch(input: CreateBranchInput, signal?: AbortSignal): Promise<BranchDetails> {
      await guard(signal)
      validateCreateBranch(input)
      branchSeq += 1
      const created: BranchDetails = {
        id: `00000000-0000-7000-8000-b${String(branchSeq).padStart(11, '0')}`,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        address: input.address,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        phone: input.phone ?? null,
        status: input.status ?? 'Open',
        isActive: input.isActive ?? true,
        isPrimary: input.isPrimary ?? false,
        sortOrder: input.sortOrder ?? 0,
        workingHours: structuredClone(input.workingHours),
      }
      branches = [...branches, created]
      return structuredClone(created)
    },

    async updateBranch(id: string, input: UpdateBranchInput, signal?: AbortSignal): Promise<BranchDetails> {
      await guard(signal)
      requireId(id)
      validateUpdateBranch(input)
      const current = branches.find((item) => item.id === id)
      if (!current) throw new ApiError('notFound')
      const next: BranchDetails = { ...current, workingHours: structuredClone(current.workingHours) }
      if (input.nameAr != null) next.nameAr = input.nameAr
      if (input.nameEn != null) next.nameEn = input.nameEn
      if (input.address != null) next.address = input.address
      if (input.latitude !== undefined) next.latitude = input.latitude
      if (input.longitude !== undefined) next.longitude = input.longitude
      if (input.phone !== undefined) next.phone = input.phone
      if (input.status != null) next.status = input.status
      if (input.isActive != null) next.isActive = input.isActive
      if (input.isPrimary != null) next.isPrimary = input.isPrimary
      if (input.sortOrder != null) next.sortOrder = input.sortOrder
      for (const hour of input.workingHours ?? []) {
        next.workingHours = next.workingHours.map((existing) => (existing.dayOfWeek === hour.dayOfWeek ? { ...hour } : existing))
      }
      branches = branches.map((item) => (item.id === id ? next : item))
      return structuredClone(next)
    },

    async getDeliverySettings(signal?: AbortSignal): Promise<DeliverySettings> {
      await guard(signal)
      return { ...deliverySettings }
    },

    async updateDeliverySettings(input: DeliverySettings, signal?: AbortSignal): Promise<DeliverySettings> {
      await guard(signal)
      validateDeliverySettings(input)
      deliverySettings = { ...input }
      return { ...deliverySettings }
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
      const base = menu.map((category) => ({
        ...category,
        items: category.items.map((entry) => ({ ...entry })),
      }))
      // Items created through the admin endpoints show up under their category.
      const added = categories
        .filter((category) => category.isActive && managedItems.some((item) => item.isActive && item.categoryId === category.id))
        .map((category) => {
          const items = managedItems
            .filter((item) => item.isActive && item.categoryId === category.id)
            .map((item) => ({
              id: item.id,
              nameAr: item.nameAr,
              nameEn: item.nameEn,
              price: item.basePrice,
              available: item.isVisibleToCustomers,
              imageUrl: item.imageUrl,
              categoryId: item.categoryId,
            }))
          return { id: category.id, nameAr: category.nameAr, nameEn: category.nameEn, count: items.length, items }
        })
      return [...base, ...added]
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
