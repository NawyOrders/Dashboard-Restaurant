import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'
import { isUuid } from './shared'

// Menu categories (reference section 11). Reads are anonymous / JWT; writes
// need menu.edit. Hierarchy is one level: root -> subcategory.
export type CategorySummary = {
  id: string
  nameAr: string
  nameEn: string
  imageKey: string | null
  sortOrder: number
  isActive: boolean
  itemCount: number
  // Only present on root categories.
  hasSubCategories: boolean | null
}

export type ManagedCategory = {
  id: string
  menuId: string
  parentId: string | null
  nameAr: string
  nameEn: string
  imageKey: string | null
  sortOrder: number
  isActive: boolean
}

export type CreateCategoryInput = {
  nameAr: string
  nameEn: string
  sortOrder: number
  parentId?: string | null
  imageKey?: string | null
}

export type UpdateCategoryInput = { nameAr: string; nameEn: string; imageKey?: string | null }

export type ReorderCategoriesInput = { parentId?: string | null; orderedCategoryIds: string[] }

export function parseCategorySummary(value: unknown): CategorySummary {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  if (!id) throw new ApiError('invalidResponse')
  return {
    id,
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    imageKey: stringOrNull(value.imageKey),
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
    isActive: value.isActive !== false,
    itemCount: numberOrNull(value.itemCount) ?? 0,
    hasSubCategories: typeof value.hasSubCategories === 'boolean' ? value.hasSubCategories : null,
  }
}

export function parseManagedCategory(value: unknown): ManagedCategory {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  if (!id) throw new ApiError('invalidResponse')
  return {
    id,
    menuId: stringOrNull(value.menuId) ?? '',
    parentId: stringOrNull(value.parentId),
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    imageKey: stringOrNull(value.imageKey),
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
    isActive: value.isActive !== false,
  }
}

function validateNames(nameAr: string, nameEn: string): void {
  for (const name of [nameAr, nameEn]) {
    if (!name.trim() || name.length > 200) throw new ApiError('validation')
  }
}

function validateImageKey(key: string | null | undefined): void {
  if (key != null && key.length > 500) throw new ApiError('validation')
}

export function validateCreateCategory(input: CreateCategoryInput): void {
  validateNames(input.nameAr, input.nameEn)
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new ApiError('validation')
  if (input.parentId != null && !isUuid(input.parentId)) throw new ApiError('validation')
  validateImageKey(input.imageKey)
}

export function validateUpdateCategory(input: UpdateCategoryInput): void {
  validateNames(input.nameAr, input.nameEn)
  validateImageKey(input.imageKey)
}

export function validateReorder(input: ReorderCategoriesInput): void {
  if (input.parentId != null && !isUuid(input.parentId)) throw new ApiError('validation')
  const ids = input.orderedCategoryIds
  if (ids.length === 0 || !ids.every(isUuid) || new Set(ids).size !== ids.length) throw new ApiError('validation')
}
