import type {
  CreateMenuItemInput,
  ManagedMenuItem,
  MenuItemImageUploadRequest,
  MenuItemImageUploadUrl,
  UpdateMenuItemInput,
} from './menuItems'
import type {
  CategorySummary,
  CreateCategoryInput,
  ManagedCategory,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from './categories'
import type { CreateRoleInput, PermissionInfo, RoleSummary, UpdateRoleInput } from './roles'
import type { InviteStaffInput, ListStaffQuery, StaffUser } from './staff'
import type {
  BranchDetails,
  CreateBranchInput,
  DeliverySettings,
  ListBranchesQuery,
  UpdateBranchInput,
} from './branches'
import type {
  CreateOfferInput,
  ListOffersQuery,
  OfferImageUploadRequest,
  OfferImageUploadUrl,
  OfferStatusInput,
  PromotionalOffer,
  UpdateOfferInput,
} from './offers'
import type {
  AdminOrderListItem,
  PaymentMethodName,
  RestaurantPaymentMethodConfig,
  UpdatePaymentMethodInput,
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
  acceptOrder(id: string, signal?: AbortSignal): Promise<void>
  rejectOrder(id: string, rejectionReason: string, signal?: AbortSignal): Promise<void>
  confirmPayment(id: string, signal?: AbortSignal): Promise<void>
  rejectPaymentProof(id: string, rejectionReason: string, signal?: AbortSignal): Promise<void>
  listPaymentMethods(signal?: AbortSignal): Promise<RestaurantPaymentMethodConfig[]>
  updatePaymentMethod(
    method: PaymentMethodName,
    input: UpdatePaymentMethodInput,
    signal?: AbortSignal,
  ): Promise<RestaurantPaymentMethodConfig>
  createOfferImageUploadUrl(input: OfferImageUploadRequest, signal?: AbortSignal): Promise<OfferImageUploadUrl>
  createOffer(input: CreateOfferInput, signal?: AbortSignal): Promise<PromotionalOffer>
  listOffers(query?: ListOffersQuery, signal?: AbortSignal): Promise<PagedResult<PromotionalOffer>>
  getOffer(id: string, signal?: AbortSignal): Promise<PromotionalOffer>
  updateOffer(id: string, input: UpdateOfferInput, signal?: AbortSignal): Promise<PromotionalOffer>
  setOfferStatus(id: string, input: OfferStatusInput, signal?: AbortSignal): Promise<PromotionalOffer>
  deleteOffer(id: string, signal?: AbortSignal): Promise<void>
  listBranches(query?: ListBranchesQuery, signal?: AbortSignal): Promise<PagedResult<BranchDetails>>
  getBranch(id: string, signal?: AbortSignal): Promise<BranchDetails>
  createBranch(input: CreateBranchInput, signal?: AbortSignal): Promise<BranchDetails>
  updateBranch(id: string, input: UpdateBranchInput, signal?: AbortSignal): Promise<BranchDetails>
  createMenuItemImageUploadUrl(input: MenuItemImageUploadRequest, signal?: AbortSignal): Promise<MenuItemImageUploadUrl>
  createMenuItem(input: CreateMenuItemInput, signal?: AbortSignal): Promise<ManagedMenuItem>
  updateMenuItem(id: string, input: UpdateMenuItemInput, signal?: AbortSignal): Promise<ManagedMenuItem>
  removeMenuItemImage(id: string, signal?: AbortSignal): Promise<ManagedMenuItem>
  deleteMenuItem(id: string, signal?: AbortSignal): Promise<void>
  listRootCategories(signal?: AbortSignal): Promise<CategorySummary[]>
  listSubcategories(categoryId: string, signal?: AbortSignal): Promise<CategorySummary[]>
  createCategory(input: CreateCategoryInput, signal?: AbortSignal): Promise<ManagedCategory>
  updateCategory(id: string, input: UpdateCategoryInput, signal?: AbortSignal): Promise<ManagedCategory>
  reorderCategories(input: ReorderCategoriesInput, signal?: AbortSignal): Promise<void>
  deleteCategory(id: string, signal?: AbortSignal): Promise<void>
  listPermissions(signal?: AbortSignal): Promise<PermissionInfo[]>
  listRoles(signal?: AbortSignal): Promise<RoleSummary[]>
  getRole(id: string, signal?: AbortSignal): Promise<RoleSummary>
  createRole(input: CreateRoleInput, signal?: AbortSignal): Promise<RoleSummary>
  updateRole(id: string, input: UpdateRoleInput, signal?: AbortSignal): Promise<RoleSummary>
  replaceRolePermissions(id: string, permissionKeys: string[], signal?: AbortSignal): Promise<void>
  deleteRole(id: string, signal?: AbortSignal): Promise<void>
  listStaff(query?: ListStaffQuery, signal?: AbortSignal): Promise<PagedResult<StaffUser>>
  inviteStaff(input: InviteStaffInput, signal?: AbortSignal): Promise<StaffUser>
  resendStaffInvitation(id: string, signal?: AbortSignal): Promise<void>
  changeStaffRole(id: string, roleId: string, signal?: AbortSignal): Promise<void>
  deleteStaff(id: string, signal?: AbortSignal): Promise<void>
  getDeliverySettings(signal?: AbortSignal): Promise<DeliverySettings>
  updateDeliverySettings(input: DeliverySettings, signal?: AbortSignal): Promise<DeliverySettings>
  getBranding(etag?: string, signal?: AbortSignal): Promise<BrandingFetchResult>
  listMenu(signal?: AbortSignal): Promise<MenuCategory[]>
  updateMenuItemAvailability(itemId: string, available: boolean, signal?: AbortSignal): Promise<void>
  getReportsSummary(range: ReportRange, signal?: AbortSignal): Promise<ReportsSummary>
  getRestaurantSettings(signal?: AbortSignal): Promise<RestaurantSettings>
  updateRestaurantSettings(settings: RestaurantSettings, signal?: AbortSignal): Promise<void>
}
