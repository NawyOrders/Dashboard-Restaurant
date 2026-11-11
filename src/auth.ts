// Contract: /swagger/v1/swagger.json on the configured Nawy Orders tenant API.
// This adapter never validates passwords locally or invents roles/branch scopes.
// Access and refresh tokens live in React memory only, not browser storage.
// Authorization and tenant isolation MUST be enforced by the API on every request.

const DEFAULT_API_BASE_URL = 'https://el-fahm-01a1c1ed11cf79ffbe51681899bb90fd.api.nawyorders.com'

function resolveApiBaseUrl(): string {
  const configured = typeof import.meta.env.VITE_API_BASE_URL === 'string'
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : ''
  if (!configured) return DEFAULT_API_BASE_URL
  try {
    const url = new URL(configured)
    // Accept only HTTPS origins without embedded credentials.
    if (url.protocol !== 'https:' || url.username || url.password) return DEFAULT_API_BASE_URL
    return configured.replace(/\/+$/, '')
  } catch {
    return DEFAULT_API_BASE_URL
  }
}

export const API_BASE_URL = resolveApiBaseUrl()
export const REQUEST_TIMEOUT_MS = 15_000

export interface AuthUser {
  id: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
}

export interface Session {
  apiOrigin: string
  user: AuthUser
  accessToken: string
  refreshToken: string | null
  expiresAt: number
}

export type AuthErrorCode =
  | 'invalidCredentials'
  | 'forbidden'
  | 'rateLimited'
  | 'network'
  | 'timeout'
  | 'service'
  | 'invalidResponse'

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code)
    this.name = 'AuthError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function stringArray(value: unknown): string[] {
  if (value == null) return []
  if (!Array.isArray(value) || !value.every(nonEmptyString)) throw new AuthError('invalidResponse')
  return value
}

async function request(
  path: '/api/v1/auth/login' | '/api/v1/auth/revoke',
  body: object,
  signal?: AbortSignal,
  accessToken?: string,
): Promise<{ status: number; ok: boolean; body: unknown }> {
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
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      // Do not send browser cookies or follow redirects with credentials.
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    let payload: unknown = null
    if (response.ok) {
      try {
        payload = await response.json()
      } catch {
        if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError')
        throw new AuthError('invalidResponse')
      }
    }
    return { status: response.status, ok: response.ok, body: payload }
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
    if (error instanceof AuthError) throw error
    throw new AuthError(timedOut ? 'timeout' : 'network')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export async function login(email: string, password: string, signal?: AbortSignal): Promise<Session> {
  const normalizedEmail = email.trim()
  if (!normalizedEmail || !password) throw new AuthError('invalidCredentials')

  const response = await request('/api/v1/auth/login', { email: normalizedEmail, password }, signal)
  if ([400, 401, 422].includes(response.status)) throw new AuthError('invalidCredentials')
  if (response.status === 403) throw new AuthError('forbidden')
  if (response.status === 429) throw new AuthError('rateLimited')
  if (!response.ok) throw new AuthError('service')

  const envelope = response.body
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
  if (!isRecord(envelope) || envelope.isSuccess !== true || !isRecord(envelope.data)) {
    throw new AuthError('invalidResponse')
  }
  const data = envelope.data
  const expiresAt = typeof data.expiresAtUtc === 'string' ? Date.parse(data.expiresAtUtc) : NaN
  if (
    !nonEmptyString(data.userId) || !nonEmptyString(data.email) ||
    !nonEmptyString(data.accessToken) || /[\r\n]/.test(data.accessToken) ||
    typeof data.tokenType !== 'string' || data.tokenType.toLowerCase() !== 'bearer' ||
    !Number.isFinite(expiresAt) || expiresAt <= Date.now() ||
    typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
    (data.refreshToken != null && !nonEmptyString(data.refreshToken))
  ) {
    throw new AuthError('invalidResponse')
  }

  return {
    apiOrigin: API_BASE_URL,
    user: {
      id: data.userId,
      name: nonEmptyString(data.fullName) ? data.fullName : data.email,
      email: data.email,
      roles: stringArray(data.roles),
      permissions: stringArray(data.permissions),
    },
    accessToken: data.accessToken,
    refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : null,
    expiresAt: Math.min(expiresAt, Date.now() + data.expiresIn * 1000),
  }
}

// Sign-out always clears the local session in App, even if revocation is offline.
// No automatic refresh: after expiry/reload the user signs in again.
export async function revokeSession(session: Session): Promise<boolean> {
  if (!session.refreshToken) return true
  if (session.apiOrigin !== API_BASE_URL) return false
  try {
    const response = await request('/api/v1/auth/revoke', {
      refreshToken: session.refreshToken,
      reason: 'User signed out of restaurant dashboard',
    }, undefined, session.accessToken)
    return response.ok && isRecord(response.body) && response.body.isSuccess === true
  } catch {
    return false
  }
}

// Delete only the obsolete demo token key. Never read it as authentication.
export function clearLegacySession(): void {
  try {
    localStorage.removeItem('nawy_session')
  } catch {
    // Authentication remains functional when browser storage is disabled.
  }
}
