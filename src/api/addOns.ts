import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'

// Admin menu add-ons (reference section 13). All need menu.edit.
export type AddOn = {
  id: string
  menuItemId: string
  nameAr: string
  nameEn: string
  price: number
  sortOrder: number
  isActive: boolean
}

export type ListAddOnsQuery = { isActive?: boolean; pageNumber?: number; pageSize?: number }
export type CreateAddOnInput = { nameAr: string; nameEn: string; price: number }
// PATCH: at least one field must be supplied. sortOrder is a 0-based position.
export type UpdateAddOnInput = {
  nameAr?: string
  nameEn?: string
  price?: number
  isActive?: boolean
  sortOrder?: number
}

export function parseAddOn(value: unknown): AddOn {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  const price = numberOrNull(value.price)
  if (!id || price === null) throw new ApiError('invalidResponse')
  return {
    id,
    menuItemId: stringOrNull(value.menuItemId) ?? '',
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    price,
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
    isActive: value.isActive !== false,
  }
}

const badName = (name: string) => !name.trim() || name.length > 200
const badPrice = (price: number) => !Number.isFinite(price) || price < 0

export function validateCreateAddOn(input: CreateAddOnInput): void {
  if (badName(input.nameAr) || badName(input.nameEn) || badPrice(input.price)) throw new ApiError('validation')
}

export function validateUpdateAddOn(input: UpdateAddOnInput): void {
  const keys = (Object.keys(input) as (keyof UpdateAddOnInput)[]).filter((key) => input[key] !== undefined)
  if (keys.length === 0) throw new ApiError('validation')
  if (input.nameAr !== undefined && badName(input.nameAr)) throw new ApiError('validation')
  if (input.nameEn !== undefined && badName(input.nameEn)) throw new ApiError('validation')
  if (input.price !== undefined && badPrice(input.price)) throw new ApiError('validation')
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)) {
    throw new ApiError('validation')
  }
}
