import { ApiError, isRecord, numberOrNull, stringOrNull } from './types'

// Roles and permissions (reference section 18). Owner / RestaurantOwner only.
export type RoleKind = 'Owner' | 'Seeded' | 'Custom'
export const ROLE_KINDS: readonly RoleKind[] = ['Owner', 'Seeded', 'Custom']

export type PermissionInfo = { key: string; module: string; description: string }

export type RoleSummary = {
  id: string
  name: string
  description: string | null
  kind: RoleKind
  isProtected: boolean
  canBeDeleted: boolean
  staffCount: number
  permissionKeys: string[]
}

export type CreateRoleInput = { name: string; description?: string | null; permissionKeys: string[] }
export type UpdateRoleInput = { name: string; description?: string | null }

export function parsePermission(value: unknown): PermissionInfo {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const key = stringOrNull(value.key)
  if (!key) throw new ApiError('invalidResponse')
  return { key, module: stringOrNull(value.module) ?? '', description: stringOrNull(value.description) ?? '' }
}

export function parseRole(value: unknown): RoleSummary {
  if (!isRecord(value)) throw new ApiError('invalidResponse')
  const id = stringOrNull(value.id)
  const name = stringOrNull(value.name)
  const kind = value.kind
  if (!id || !name || typeof kind !== 'string' || !(ROLE_KINDS as readonly string[]).includes(kind)) {
    throw new ApiError('invalidResponse')
  }
  if (value.permissionKeys != null && !Array.isArray(value.permissionKeys)) throw new ApiError('invalidResponse')
  return {
    id,
    name,
    description: stringOrNull(value.description),
    kind: kind as RoleKind,
    isProtected: value.isProtected === true,
    canBeDeleted: value.canBeDeleted === true,
    staffCount: numberOrNull(value.staffCount) ?? 0,
    permissionKeys: ((value.permissionKeys ?? []) as unknown[]).filter((key): key is string => typeof key === 'string'),
  }
}

function validateName(name: string): void {
  if (!name.trim() || name.length > 100) throw new ApiError('validation')
}

function validateDescription(description: string | null | undefined): void {
  if (description != null && description.length > 500) throw new ApiError('validation')
}

// Unknown keys are rejected by the server (422); the client only checks shape.
export function validatePermissionKeys(keys: string[]): void {
  if (!Array.isArray(keys)) throw new ApiError('validation')
  if (!keys.every((key) => typeof key === 'string' && key.trim().length > 0)) throw new ApiError('validation')
  if (new Set(keys).size !== keys.length) throw new ApiError('validation')
}

export function validateCreateRole(input: CreateRoleInput): void {
  validateName(input.name)
  validateDescription(input.description)
  validatePermissionKeys(input.permissionKeys)
}

export function validateUpdateRole(input: UpdateRoleInput): void {
  validateName(input.name)
  validateDescription(input.description)
}
