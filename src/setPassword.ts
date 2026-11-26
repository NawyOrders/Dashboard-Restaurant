import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './auth'

// POST /api/v1/auth/set-initial-password (reference section 8). Anonymous: it
// needs the tenant subdomain (API_BASE_URL) but no access token.
export type SetPasswordErrorCode =
  | 'validation'
  | 'conflict'
  | 'rateLimited'
  | 'forbidden'
  | 'notFound'
  | 'network'
  | 'timeout'
  | 'service'
  | 'invalidResponse'
  | 'configuration'

export class SetPasswordError extends Error {
  constructor(public readonly code: SetPasswordErrorCode) {
    super(code)
    this.name = 'SetPasswordError'
  }
}

export type SetInitialPasswordInput = {
  email: string
  token: string
  newPassword: string
  confirmPassword: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mirrors the server rule: at least 8 characters, one uppercase, one lowercase,
// one digit and one special character ([\W_]).
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[\W_]/.test(password)
  )
}

export function validateSetInitialPassword(input: SetInitialPasswordInput): void {
  if (!EMAIL.test(input.email.trim())) throw new SetPasswordError('validation')
  if (!input.token.trim()) throw new SetPasswordError('validation')
  if (!isStrongPassword(input.newPassword)) throw new SetPasswordError('validation')
  if (input.newPassword !== input.confirmPassword) throw new SetPasswordError('validation')
}

function statusToError(status: number): SetPasswordError {
  if (status === 400 || status === 422) return new SetPasswordError('validation')
  if (status === 403) return new SetPasswordError('forbidden')
  if (status === 404) return new SetPasswordError('notFound')
  if (status === 409) return new SetPasswordError('conflict')
  if (status === 429) return new SetPasswordError('rateLimited')
  return new SetPasswordError('service')
}

export async function setInitialPassword(input: SetInitialPasswordInput, signal?: AbortSignal): Promise<void> {
  if (!API_BASE_URL) throw new SetPasswordError('configuration')
  validateSetInitialPassword(input)

  const controller = new AbortController()
  const abort = () => controller.abort()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/set-initial-password`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        email: input.email.trim(),
        token: input.token.trim(),
        newPassword: input.newPassword,
        confirmPassword: input.confirmPassword,
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw statusToError(response.status)
    // Success carries data: null; only the envelope flag matters.
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new SetPasswordError('invalidResponse')
    }
    if (typeof body !== 'object' || body === null || (body as { isSuccess?: unknown }).isSuccess !== true) {
      throw new SetPasswordError('invalidResponse')
    }
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
    if (error instanceof SetPasswordError) throw error
    throw new SetPasswordError(timedOut ? 'timeout' : 'network')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
