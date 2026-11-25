import { ApiError, isRecord, stringOrNull } from './types'
import { isUuid } from './shared'

// Staff management (reference section 17). Owner / RestaurantOwner only; the
// route prefix is /api/v1/staff (no /admin).
export type StaffStatus = 'Active' | 'Inactive' | 'PendingInvitation'
export const STAFF_STATUSES: readonly StaffStatus[] = ['Active', 'Inactive', 'PendingInvitation']

export type StaffUser = {
  id: string
  fullName: string
  email: string
  phone: string | null
  roleId: string | null
  role: string
  branchIds: string[]
  isActive: boolean | null
  status: StaffStatus | null
  mustSetInitialPassword: boolean
  activationTokenExpiresAtUtc: string | null
  lastLoginAt: string | null
}

export type ListStaffQuery = {
  branchId?: string
  role?: string
  search?: string
  status?: StaffStatus
  pageNumber?: number
  pageSize?: number
}

export type InviteStaffInput = {
  fullName: string
  email: string
  phone?: string | null
  roleId: string
  branchIds: string[]
}

const PHONE = /^\+?[0-9\s\-()]{7,20}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseStaffUser(value: unknown): StaffUser {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  const email = stringOrNull(value.email)
  if (!id || !email) throw new ApiError('invalidResponse')
  if (value.branchIds != null && !Array.isArray(value.branchIds)) throw new ApiError('invalidResponse')
  const status = value.status
  if (status != null && (typeof status !== 'string' || !(STAFF_STATUSES as readonly string[]).includes(status))) {
    throw new ApiError('invalidResponse')
  }
  return {
    id,
    fullName: stringOrNull(value.fullName) ?? '',
    email,
    phone: stringOrNull(value.phone),
    roleId: stringOrNull(value.roleId),
    role: stringOrNull(value.role) ?? '',
    branchIds: ((value.branchIds ?? []) as unknown[]).filter((item): item is string => typeof item === 'string'),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : null,
    status: (status as StaffStatus | null | undefined) ?? null,
    mustSetInitialPassword: value.mustSetInitialPassword === true,
    activationTokenExpiresAtUtc: stringOrNull(value.activationTokenExpiresAtUtc),
    lastLoginAt: stringOrNull(value.lastLoginAt),
  }
}

export function validateStaffListQuery(query: ListStaffQuery): void {
  if (query.branchId !== undefined && !isUuid(query.branchId)) throw new ApiError('validation')
  if (query.status !== undefined && !STAFF_STATUSES.includes(query.status)) throw new ApiError('validation')
  if (query.pageNumber !== undefined && (!Number.isInteger(query.pageNumber) || query.pageNumber < 1)) {
    throw new ApiError('validation')
  }
  if (query.pageSize !== undefined && (!Number.isInteger(query.pageSize) || query.pageSize < 1)) {
    throw new ApiError('validation')
  }
}

export function validateInviteStaff(input: InviteStaffInput): void {
  const name = input.fullName.trim()
  if (name.length < 2 || input.fullName.length > 200) throw new ApiError('validation')
  if (!EMAIL.test(input.email) || input.email.length > 256) throw new ApiError('validation')
  if (input.phone != null && input.phone !== '' && (input.phone.length > 50 || !PHONE.test(input.phone))) {
    throw new ApiError('validation')
  }
  if (!isUuid(input.roleId)) throw new ApiError('validation')
  if (input.branchIds.length < 1 || !input.branchIds.every(isUuid) || new Set(input.branchIds).size !== input.branchIds.length) {
    throw new ApiError('validation')
  }
}
