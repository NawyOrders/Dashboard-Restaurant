import { resolveItemImageUrl } from '../media'
import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'
import { isUuid } from './shared'
import {
  parseOfferImageUploadUrl,
  validateOfferImageRequest,
  type OfferImageUploadRequest,
  type OfferImageUploadUrl,
} from './offers'

// Admin menu items and images (reference section 12). All need menu.edit.
// The branch availability PATCH lives with the menu availability PR (#21).
export type MenuItemImageUploadRequest = OfferImageUploadRequest
export type MenuItemImageUploadUrl = OfferImageUploadUrl
export const parseMenuItemImageUploadUrl = parseOfferImageUploadUrl
export const validateMenuItemImageRequest = validateOfferImageRequest

export type MenuItemSizeInput = {
  nameAr: string
  nameEn: string
  price: number
  sortOrder: number
  isDefault: boolean
}

export type MenuItemBranchAvailabilityInput = { branchId: string; isAvailable: boolean }

export type MenuItemSize = MenuItemSizeInput & { id: string }

export type MenuItemBranchAvailability = {
  branchId: string
  isAvailable: boolean
  updatedBy: string | null
  updatedAt: string | null
}

export type ManagedMenuItem = {
  id: string
  categoryId: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  imageKey: string | null
  imageUrl: string | null
  basePrice: number
  sortOrder: number
  isActive: boolean
  isVisibleToCustomers: boolean
  sizes: MenuItemSize[]
  branchAvailabilities: MenuItemBranchAvailability[]
}

export type CreateMenuItemInput = {
  categoryId: string
  nameAr: string
  nameEn: string
  basePrice: number
  sortOrder: number
  descriptionAr?: string | null
  descriptionEn?: string | null
  imageKey?: string | null
  isVisibleToCustomers?: boolean | null
  sizes?: MenuItemSizeInput[] | null
  branchAvailabilities?: MenuItemBranchAvailabilityInput[] | null
}

// PUT: imageKey null keeps the image; sizes null keeps sizes, [] clears them,
// a non-empty array replaces them all.
export type UpdateMenuItemInput = CreateMenuItemInput

function parseSize(value: unknown): MenuItemSize {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  const price = numberOrNull(value.price)
  if (!id || price === null) throw new ApiError('invalidResponse')
  return {
    id,
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    price,
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
    isDefault: value.isDefault === true,
  }
}

function parseAvailability(value: unknown): MenuItemBranchAvailability {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const branchId = stringOrNull(value.branchId)
  if (!branchId) throw new ApiError('invalidResponse')
  return {
    branchId,
    isAvailable: value.isAvailable === true,
    updatedBy: stringOrNull(value.updatedBy),
    updatedAt: stringOrNull(value.updatedAt),
  }
}

export function parseManagedMenuItem(value: unknown): ManagedMenuItem {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  if (!id) throw new ApiError('invalidResponse')
  if (value.sizes != null && !Array.isArray(value.sizes)) throw new ApiError('invalidResponse')
  if (value.branchAvailabilities != null && !Array.isArray(value.branchAvailabilities)) {
    throw new ApiError('invalidResponse')
  }
  return {
    id,
    categoryId: stringOrNull(value.categoryId) ?? '',
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    descriptionAr: stringOrNull(value.descriptionAr),
    descriptionEn: stringOrNull(value.descriptionEn),
    imageKey: stringOrNull(value.imageKey),
    imageUrl: resolveItemImageUrl(stringOrNull(value.imageKey), stringOrNull(value.imageUrl)),
    basePrice: numberOrNull(value.basePrice) ?? 0,
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
    isActive: value.isActive !== false,
    isVisibleToCustomers: value.isVisibleToCustomers !== false,
    sizes: ((value.sizes ?? []) as unknown[]).map(parseSize),
    branchAvailabilities: ((value.branchAvailabilities ?? []) as unknown[]).map(parseAvailability),
  }
}

function validateSizes(sizes: MenuItemSizeInput[]): void {
  const orders = new Set<number>()
  const names = new Set<string>()
  let defaults = 0
  for (const size of sizes) {
    for (const name of [size.nameAr, size.nameEn]) {
      if (!name.trim() || name.length > 200) throw new ApiError('validation')
    }
    if (!Number.isFinite(size.price) || size.price < 0) throw new ApiError('validation')
    if (!Number.isInteger(size.sortOrder) || size.sortOrder < 0) throw new ApiError('validation')
    const key = size.nameEn.trim().toLowerCase()
    if (orders.has(size.sortOrder) || names.has(key)) throw new ApiError('validation')
    orders.add(size.sortOrder)
    names.add(key)
    if (size.isDefault) defaults += 1
  }
  if (defaults > 1) throw new ApiError('validation')
}

export function validateMenuItemInput(input: CreateMenuItemInput): void {
  if (!isUuid(input.categoryId)) throw new ApiError('validation')
  for (const name of [input.nameAr, input.nameEn]) {
    if (!name.trim() || name.length > 200) throw new ApiError('validation')
  }
  if (!Number.isFinite(input.basePrice) || input.basePrice < 0) throw new ApiError('validation')
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new ApiError('validation')
  for (const text of [input.descriptionAr, input.descriptionEn]) {
    if (text != null && text.length > 1000) throw new ApiError('validation')
  }
  if (input.imageKey != null && input.imageKey.length > 500) throw new ApiError('validation')
  if (input.sizes != null) validateSizes(input.sizes)
  if (input.branchAvailabilities != null) {
    const seen = new Set<string>()
    for (const entry of input.branchAvailabilities) {
      if (!isUuid(entry.branchId) || seen.has(entry.branchId)) throw new ApiError('validation')
      seen.add(entry.branchId)
    }
  }
}
