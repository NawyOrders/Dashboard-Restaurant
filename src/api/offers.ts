import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'
import { isUuid } from './shared'

// Promotional offers (reference section 14).
export type OfferKind = 'SingleItem' | 'Combo'
export type OfferStatus = 'Active' | 'Scheduled' | 'Expired' | 'Inactive'
export type OfferImageSource = 'ManualUpload' | 'AiGenerated'

export const OFFER_KINDS: readonly OfferKind[] = ['SingleItem', 'Combo']
export const OFFER_STATUSES: readonly OfferStatus[] = ['Active', 'Scheduled', 'Expired', 'Inactive']
export const OFFER_IMAGE_SOURCES: readonly OfferImageSource[] = ['ManualUpload', 'AiGenerated']
export const OFFER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const OFFER_IMAGE_MAX_BYTES = 5_242_880

export type OfferItemInput = { menuItemId: string; itemSizeId?: string | null; quantity: number }

export type OfferItem = {
  id: string
  menuItemId: string
  menuItemNameAr: string
  menuItemNameEn: string
  itemSizeId: string | null
  itemSizeNameAr: string | null
  itemSizeNameEn: string | null
  quantity: number
  unitPriceSnapshot: number
}

export type PromotionalOffer = {
  id: string
  kind: OfferKind
  status: OfferStatus
  titleAr: string
  titleEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  imageKey: string
  imageUrl: string | null
  imageSource: OfferImageSource
  originalPrice: number
  offerPrice: number
  savedAmount: number
  discountPercentage: number
  startsAtUtc: string
  endsAtUtc: string
  isActive: boolean
  branchIds: string[] | null
  items: OfferItem[]
  createdAtUtc: string | null
  modifiedAtUtc: string | null
}

export type ListOffersQuery = {
  kind?: OfferKind
  status?: OfferStatus
  pageNumber?: number
  pageSize?: number
}

export type CreateOfferInput = {
  kind: OfferKind
  titleAr: string
  titleEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  imageKey: string
  imageSource: OfferImageSource
  offerPrice: number
  startsAtUtc: string
  endsAtUtc: string
  isActive: boolean
  notifyCustomers: boolean
  branchIds?: string[] | null
  items: OfferItemInput[]
}

// PUT keeps the current banner when imageKey/imageSource are null.
export type UpdateOfferInput = Omit<CreateOfferInput, 'imageKey' | 'imageSource' | 'notifyCustomers'> & {
  imageKey?: string | null
  imageSource?: OfferImageSource | null
}

export type OfferStatusInput = { isActive: boolean; notifyCustomers?: boolean }

export type OfferImageUploadRequest = { fileName: string; contentType: string; sizeBytes: number }

export type OfferImageUploadUrl = {
  objectKey: string
  uploadUrl: string
  expiresAtUtc: string
  contentType: string
  maximumSizeBytes: number
}

function oneOf<T extends string>(list: readonly T[], value: unknown): T {
  if (typeof value !== 'string' || !(list as readonly string[]).includes(value)) throw new ApiError('invalidResponse')
  return value as T
}

function reqString(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError('invalidResponse')
  return value
}

function reqNumber(value: unknown): number {
  const n = numberOrNull(value)
  if (n === null) throw new ApiError('invalidResponse')
  return n
}

export function parseOfferItem(value: unknown): OfferItem {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  return {
    id: reqString(value.id),
    menuItemId: reqString(value.menuItemId),
    menuItemNameAr: stringOrNull(value.menuItemNameAr) ?? '',
    menuItemNameEn: stringOrNull(value.menuItemNameEn) ?? '',
    itemSizeId: stringOrNull(value.itemSizeId),
    itemSizeNameAr: stringOrNull(value.itemSizeNameAr),
    itemSizeNameEn: stringOrNull(value.itemSizeNameEn),
    quantity: reqNumber(value.quantity),
    unitPriceSnapshot: reqNumber(value.unitPriceSnapshot),
  }
}

export function parseOffer(value: unknown): PromotionalOffer {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  if (value.items != null && !Array.isArray(value.items)) throw new ApiError('invalidResponse')
  if (value.branchIds != null && !Array.isArray(value.branchIds)) throw new ApiError('invalidResponse')
  return {
    id: reqString(value.id),
    kind: oneOf(OFFER_KINDS, value.kind),
    status: oneOf(OFFER_STATUSES, value.status),
    titleAr: stringOrNull(value.titleAr) ?? '',
    titleEn: stringOrNull(value.titleEn) ?? '',
    descriptionAr: stringOrNull(value.descriptionAr),
    descriptionEn: stringOrNull(value.descriptionEn),
    imageKey: stringOrNull(value.imageKey) ?? '',
    imageUrl: stringOrNull(value.imageUrl),
    imageSource: oneOf(OFFER_IMAGE_SOURCES, value.imageSource),
    originalPrice: reqNumber(value.originalPrice),
    offerPrice: reqNumber(value.offerPrice),
    savedAmount: numberOrNull(value.savedAmount) ?? 0,
    discountPercentage: numberOrNull(value.discountPercentage) ?? 0,
    startsAtUtc: reqString(value.startsAtUtc),
    endsAtUtc: reqString(value.endsAtUtc),
    isActive: value.isActive === true,
    branchIds: value.branchIds == null ? null : (value.branchIds as unknown[]).filter((id): id is string => typeof id === 'string'),
    items: (value.items ?? ([] as unknown[])).map(parseOfferItem),
    createdAtUtc: stringOrNull(value.createdAtUtc),
    modifiedAtUtc: stringOrNull(value.modifiedAtUtc),
  }
}

export function parseOfferImageUploadUrl(value: unknown): OfferImageUploadUrl {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  return {
    objectKey: reqString(value.objectKey),
    uploadUrl: reqString(value.uploadUrl),
    expiresAtUtc: reqString(value.expiresAtUtc),
    contentType: reqString(value.contentType),
    maximumSizeBytes: reqNumber(value.maximumSizeBytes),
  }
}

export function validateOfferImageRequest(input: OfferImageUploadRequest): void {
  if (!input.fileName.trim() || input.fileName.length > 255) throw new ApiError('validation')
  if (!(OFFER_IMAGE_TYPES as readonly string[]).includes(input.contentType) || input.contentType.length > 100) {
    throw new ApiError('validation')
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > OFFER_IMAGE_MAX_BYTES) {
    throw new ApiError('validation')
  }
}

// Checks the rules the reference lists for the request body. The server still
// computes originalPrice and enforces offerPrice < originalPrice.
function validateCommon(input: UpdateOfferInput | CreateOfferInput): void {
  if (!OFFER_KINDS.includes(input.kind)) throw new ApiError('validation')
  for (const title of [input.titleAr, input.titleEn]) {
    if (!title.trim() || title.length > 200) throw new ApiError('validation')
  }
  for (const text of [input.descriptionAr, input.descriptionEn]) {
    if (text != null && text.length > 1000) throw new ApiError('validation')
  }
  if (!Number.isFinite(input.offerPrice) || input.offerPrice <= 0) throw new ApiError('validation')
  const start = Date.parse(input.startsAtUtc)
  const end = Date.parse(input.endsAtUtc)
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) throw new ApiError('validation')
  if (input.branchIds != null && (input.branchIds.length === 0 || !input.branchIds.every(isUuid))) {
    throw new ApiError('validation')
  }
  if (input.items.length === 0) throw new ApiError('validation')
  const seen = new Set<string>()
  let units = 0
  for (const item of input.items) {
    if (!isUuid(item.menuItemId) || (item.itemSizeId != null && !isUuid(item.itemSizeId))) {
      throw new ApiError('validation')
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new ApiError('validation')
    const key = `${item.menuItemId}:${item.itemSizeId ?? ''}`
    if (seen.has(key)) throw new ApiError('validation')
    seen.add(key)
    units += item.quantity
  }
  if (input.kind === 'SingleItem' && input.items.length !== 1) throw new ApiError('validation')
  if (input.kind === 'Combo' && units < 2) throw new ApiError('validation')
}

export function validateCreateOffer(input: CreateOfferInput): void {
  validateCommon(input)
  if (!input.imageKey || input.imageKey.length > 500) throw new ApiError('validation')
  if (!OFFER_IMAGE_SOURCES.includes(input.imageSource)) throw new ApiError('validation')
}

export function validateUpdateOffer(input: UpdateOfferInput): void {
  validateCommon(input)
  if (input.imageKey != null) {
    if (!input.imageKey || input.imageKey.length > 500) throw new ApiError('validation')
    if (input.imageSource == null || !OFFER_IMAGE_SOURCES.includes(input.imageSource)) throw new ApiError('validation')
  }
}

export function validateOfferListQuery(query: ListOffersQuery): void {
  if (query.kind !== undefined && !OFFER_KINDS.includes(query.kind)) throw new ApiError('validation')
  if (query.status !== undefined && !OFFER_STATUSES.includes(query.status)) throw new ApiError('validation')
}
