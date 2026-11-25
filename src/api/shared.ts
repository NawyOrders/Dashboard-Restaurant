import { ApiError, isRecord, numberOrNull, type PagedResult } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

// Parses the PagedResult<T> envelope data shared by every list endpoint.
export function parsePaged<T>(data: unknown, parseItem: (value: unknown) => T): PagedResult<T> {
  if (!isRecord(data)) throw new ApiError('invalidResponse')
  const raw = data.items
  if (raw != null && !Array.isArray(raw)) throw new ApiError('invalidResponse')
  const items = (raw ?? []).map(parseItem)
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

export function validatePaging(pageNumber?: number, pageSize?: number): void {
  if (pageNumber !== undefined && (!Number.isInteger(pageNumber) || pageNumber < 1)) throw new ApiError('validation')
  if (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)) {
    throw new ApiError('validation')
  }
}

export function requireId(id: string): string {
  if (!isUuid(id)) throw new ApiError('validation')
  return id
}
