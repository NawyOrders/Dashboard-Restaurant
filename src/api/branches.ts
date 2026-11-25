import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'

// Branches and delivery settings (reference section 15).
export type BranchStatus = 'Open' | 'TemporarilyClosed'
export type DayOfWeekName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'

export const BRANCH_STATUSES: readonly BranchStatus[] = ['Open', 'TemporarilyClosed']
export const DAYS_OF_WEEK: readonly DayOfWeekName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export type BranchWorkingHour = {
  dayOfWeek: DayOfWeekName
  isClosed: boolean
  openTime: string | null
  closeTime: string | null
  closesNextDay: boolean
}

export type BranchDetails = {
  id: string
  nameAr: string
  nameEn: string
  address: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  status: BranchStatus
  isActive: boolean
  isPrimary: boolean
  sortOrder: number
  workingHours: BranchWorkingHour[]
}

export type ListBranchesQuery = { pageNumber?: number; pageSize?: number }

export type CreateBranchInput = {
  nameAr: string
  nameEn: string
  address: string
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  status?: BranchStatus
  isActive?: boolean
  isPrimary?: boolean
  sortOrder?: number
  workingHours: BranchWorkingHour[]
}

// PATCH changes only what is supplied; workingHours takes 1..7 days.
export type UpdateBranchInput = {
  nameAr?: string | null
  nameEn?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  status?: BranchStatus | null
  isActive?: boolean | null
  isPrimary?: boolean | null
  sortOrder?: number | null
  workingHours?: BranchWorkingHour[] | null
}

export type DeliverySettings = {
  baseDeliveryFee: number
  deliveryFeePerKm: number
  maxDeliveryRadiusKm: number | null
}

export function parseWorkingHour(value: unknown): BranchWorkingHour {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const day = value.dayOfWeek
  if (typeof day !== 'string' || !(DAYS_OF_WEEK as readonly string[]).includes(day)) throw new ApiError('invalidResponse')
  return {
    dayOfWeek: day as DayOfWeekName,
    isClosed: value.isClosed === true,
    openTime: stringOrNull(value.openTime),
    closeTime: stringOrNull(value.closeTime),
    closesNextDay: value.closesNextDay === true,
  }
}

export function parseBranch(value: unknown): BranchDetails {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  const status = value.status
  if (!id || typeof status !== 'string' || !(BRANCH_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError('invalidResponse')
  }
  if (value.workingHours != null && !Array.isArray(value.workingHours)) throw new ApiError('invalidResponse')
  return {
    id,
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    address: stringOrNull(value.address) ?? '',
    latitude: numberOrNull(value.latitude),
    longitude: numberOrNull(value.longitude),
    phone: stringOrNull(value.phone),
    status: status as BranchStatus,
    isActive: value.isActive === true,
    isPrimary: value.isPrimary === true,
    sortOrder: numberOrNull(value.sortOrder) ?? 0,
    workingHours: ((value.workingHours ?? []) as unknown[]).map(parseWorkingHour),
  }
}

export function parseDeliverySettings(value: unknown): DeliverySettings {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const base = numberOrNull(value.baseDeliveryFee)
  const perKm = numberOrNull(value.deliveryFeePerKm)
  if (base === null || perKm === null) throw new ApiError('invalidResponse')
  return { baseDeliveryFee: base, deliveryFeePerKm: perKm, maxDeliveryRadiusKm: numberOrNull(value.maxDeliveryRadiusKm) }
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/

function toSeconds(time: string): number | null {
  const match = TIME.exec(time)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[4] ?? 0)
}

function validateWorkingHour(hour: BranchWorkingHour): void {
  if (!DAYS_OF_WEEK.includes(hour.dayOfWeek)) throw new ApiError('validation')
  if (hour.isClosed) {
    if (hour.openTime != null || hour.closeTime != null || hour.closesNextDay) throw new ApiError('validation')
    return
  }
  if (hour.openTime == null || hour.closeTime == null) throw new ApiError('validation')
  const open = toSeconds(hour.openTime)
  const close = toSeconds(hour.closeTime)
  if (open === null || close === null) throw new ApiError('validation')
  if (!hour.closesNextDay && close <= open) throw new ApiError('validation')
}

export function validateWorkingHours(hours: BranchWorkingHour[], mode: 'all' | 'some'): void {
  const days = new Set<string>()
  for (const hour of hours) {
    validateWorkingHour(hour)
    if (days.has(hour.dayOfWeek)) throw new ApiError('validation')
    days.add(hour.dayOfWeek)
  }
  if (mode === 'all' && days.size !== 7) throw new ApiError('validation')
  if (mode === 'some' && (days.size < 1 || days.size > 7)) throw new ApiError('validation')
}

function validateName(value: string | null | undefined): void {
  if (value != null && (!value.trim() || value.length > 200)) throw new ApiError('validation')
}

function validateCoordinates(lat: number | null | undefined, lon: number | null | undefined): void {
  if (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) throw new ApiError('validation')
  if (lon != null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) throw new ApiError('validation')
}

function validateCommon(input: CreateBranchInput | UpdateBranchInput): void {
  validateName(input.nameAr)
  validateName(input.nameEn)
  if (input.address != null && !input.address.trim()) throw new ApiError('validation')
  validateCoordinates(input.latitude, input.longitude)
  if (input.status != null && !BRANCH_STATUSES.includes(input.status)) throw new ApiError('validation')
  if (input.sortOrder != null && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)) {
    throw new ApiError('validation')
  }
}

export function validateCreateBranch(input: CreateBranchInput): void {
  if (!input.nameAr?.trim() || !input.nameEn?.trim() || !input.address?.trim()) throw new ApiError('validation')
  validateCommon(input)
  validateWorkingHours(input.workingHours, 'all')
}

export function validateUpdateBranch(input: UpdateBranchInput): void {
  validateCommon(input)
  if (input.workingHours != null) validateWorkingHours(input.workingHours, 'some')
}

export function validateDeliverySettings(input: DeliverySettings): void {
  if (!Number.isFinite(input.baseDeliveryFee) || input.baseDeliveryFee < 0) throw new ApiError('validation')
  if (!Number.isFinite(input.deliveryFeePerKm) || input.deliveryFeePerKm < 0) throw new ApiError('validation')
  const radius = input.maxDeliveryRadiusKm
  if (radius != null && (!Number.isFinite(radius) || radius <= 0 || radius > 9999.99)) throw new ApiError('validation')
}
