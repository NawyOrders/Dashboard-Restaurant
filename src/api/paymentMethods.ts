import { ApiError, isRecord, stringOrNull, type PaymentMethodName, type RestaurantPaymentMethodConfig, type UpdatePaymentMethodInput } from './types'

export const PAYMENT_METHOD_NAMES: readonly PaymentMethodName[] = ['Cash', 'InstaPay', 'MobileWallet']

export function isPaymentMethodName(value: unknown): value is PaymentMethodName {
  return typeof value === 'string' && (PAYMENT_METHOD_NAMES as readonly string[]).includes(value)
}

export function parsePaymentMethod(value: unknown): RestaurantPaymentMethodConfig {
  if (!isRecord(value) || !isPaymentMethodName(value.paymentMethod)) throw new ApiError('invalidResponse')
  if (typeof value.isEnabled !== 'boolean' || typeof value.requiresVerificationProof !== 'boolean') {
    throw new ApiError('invalidResponse')
  }
  return {
    paymentMethod: value.paymentMethod,
    nameAr: stringOrNull(value.nameAr) ?? '',
    nameEn: stringOrNull(value.nameEn) ?? '',
    accountIdentifier: stringOrNull(value.accountIdentifier),
    isEnabled: value.isEnabled,
    requiresVerificationProof: value.requiresVerificationProof,
    instructionsAr: stringOrNull(value.instructionsAr),
    instructionsEn: stringOrNull(value.instructionsEn),
  }
}

// Client-side checks that mirror the reference limits and invariants, so
// obviously invalid requests never reach the server. The server stays the
// source of truth and re-validates everything.
export function validatePaymentMethodUpdate(method: PaymentMethodName, input: UpdatePaymentMethodInput): void {
  if (!isPaymentMethodName(method)) throw new ApiError('validation')
  for (const name of [input.nameAr, input.nameEn]) {
    if (name != null && (!name.trim() || name.length > 200)) throw new ApiError('validation')
  }
  if (input.accountIdentifier != null && input.accountIdentifier.length > 100) throw new ApiError('validation')
  for (const text of [input.instructionsAr, input.instructionsEn]) {
    if (text != null && text.length > 500) throw new ApiError('validation')
  }
  if (method === 'Cash') {
    if (input.isEnabled === false) throw new ApiError('validation')
    if (input.requiresVerificationProof === true) throw new ApiError('validation')
    if (input.accountIdentifier) throw new ApiError('validation')
  } else if (input.requiresVerificationProof === false) {
    throw new ApiError('validation')
  }
}
