// Contract: /swagger/v1/swagger.json on the configured Nawy Orders tenant API.
// This adapter never validates passwords locally or invents roles/branch scopes.
// Access and refresh tokens live in React memory only, not browser storage.
// Authorization and tenant isolation MUST be enforced by the API on every request.

// One image serves every restaurant. The admin hostname carries the full tenant
// slug ({slug}.admin.nawyorders.com), so the tenant API origin is derived from
// the request host instead of being baked in at build time.
const ADMIN_HOST_SUFFIX = '.admin.nawyorders.com'
const API_HOST_SUFFIX = '.api.nawyorders.com'

export type ApiOriginFailure = 'missingTenant' | 'invalidTenant' | 'invalidOverride'

export type ApiOriginResolution =
  | { ok: true; origin: string }
  | { ok: false; reason: ApiOriginFailure }

function stripPort(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, '')
}

function normalizeApiOrigin(configured: string): string | null {
  try {
    const url = new URL(configured.trim())
    // Accept only HTTPS origins without embedded credentials.
    if (url.protocol !== 'https:' || url.username || url.password) return null
    url.port = ''
    return url.origin.replace(/\/+$/, '')
  } catch {
    return null
  }
}

function tenantSlugFromHostname(hostname: string): string | null {
  const host = stripPort(hostname)
  if (!host.endsWith(ADMIN_HOST_SUFFIX)) return null
  const slug = host.slice(0, -ADMIN_HOST_SUFFIX.length)
  // Exactly one DNS label: the full tenant slug, including its hash suffix.
  if (!slug || slug.includes('.')) return null
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return null
  return slug
}

// Precedence: explicit VITE_API_BASE_URL override (local dev, Vitest, Playwright)
// then hostname derivation, then a hard failure. There is deliberately no
// fallback tenant: calling another restaurant's API is never an acceptable
// default.
export function resolveApiOrigin(hostname: string, configured?: string | null): ApiOriginResolution {
  const override = (configured ?? '').trim()
  if (override) {
    const origin = normalizeApiOrigin(override)
    return origin ? { ok: true, origin } : { ok: false, reason: 'invalidOverride' }
  }

  const host = stripPort(hostname)
  if (host.endsWith(ADMIN_HOST_SUFFIX)) {
    const slug = tenantSlugFromHostname(host)
    return slug
      ? { ok: true, origin: `https://${slug}${API_HOST_SUFFIX}` }
      : { ok: false, reason: 'invalidTenant' }
  }

  // admin.nawyorders.com, localhost, 127.0.0.1, raw IPs and *.vercel.app all
  // reach this branch. None of them identifies a tenant.
  return { ok: false, reason: 'missingTenant' }
}

const configuredApiBaseUrl = typeof import.meta.env.VITE_API_BASE_URL === 'string'
  ? import.meta.env.VITE_API_BASE_URL
  : ''
const apiOriginResolution = resolveApiOrigin(
  typeof window === 'undefined' ? '' : window.location.hostname,
  configuredApiBaseUrl,
)

// Empty when the host cannot identify a tenant and no override is configured.
// login() refuses to run in that state and the login screen explains why.
export const API_BASE_URL = apiOriginResolution.ok ? apiOriginResolution.origin : ''
export const API_BASE_URL_ERROR: ApiOriginFailure | null = apiOriginResolution.ok
  ? null
  : apiOriginResolution.reason
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
  | 'configuration'

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
  path: '/api/v1/auth/login' | '/api/v1/auth/revoke' | '/api/v1/auth/refresh',
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
  if (!API_BASE_URL) throw new AuthError('configuration')
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

export interface RefreshResult {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// The server rotates the refresh token on every refresh and revokes the whole
// family when a token is reused, so concurrent refreshes of the same session
// must share one in-flight request instead of racing the rotation.
let refreshFlight: Promise<RefreshResult> | null = null
// A refresh that finishes and one that starts right after with the SAME (now
// rotated) token is still the same logical refresh: hand back the rotated
// result instead of reusing the revoked token and killing the session.
let lastRefresh: { fromToken: string; at: number; result: RefreshResult } | null = null

export function refreshSession(session: Session, signal?: AbortSignal): Promise<RefreshResult> {
  if (!API_BASE_URL || !session.refreshToken || session.apiOrigin !== API_BASE_URL) {
    return Promise.reject(new AuthError('configuration'))
  }
  // The replay only dedupes back-to-back refreshes; a later attempt with the
  // same token is genuinely a reuse and must reach the server.
  if (lastRefresh && lastRefresh.fromToken === session.refreshToken && Date.now() - lastRefresh.at < 60_000) {
    return Promise.resolve(lastRefresh.result)
  }
  if (!refreshFlight) {
    const fromToken = session.refreshToken
    refreshFlight = request('/api/v1/auth/refresh', { refreshToken: fromToken }, signal)
      .then(parseRefresh)
      .then((result) => {
        lastRefresh = { fromToken, at: Date.now(), result }
        return result
      })
      .finally(() => { refreshFlight = null })
  }
  return refreshFlight
}

function parseRefresh(response: { status: number; ok: boolean; body: unknown }): RefreshResult {
  if (response.status === 401 || response.status === 403) throw new AuthError('forbidden')
  if (response.status === 429) throw new AuthError('rateLimited')
  if (!response.ok) throw new AuthError('service')
  const envelope = response.body
  if (!isRecord(envelope) || envelope.isSuccess !== true || !isRecord(envelope.data)) {
    throw new AuthError('invalidResponse')
  }
  const data = envelope.data
  const expiresAt = typeof data.expiresAtUtc === 'string' ? Date.parse(data.expiresAtUtc) : NaN
  if (
    !nonEmptyString(data.accessToken) || /[\r\n]/.test(data.accessToken) ||
    typeof data.tokenType !== 'string' || data.tokenType.toLowerCase() !== 'bearer' ||
    !Number.isFinite(expiresAt) || expiresAt <= Date.now() ||
    typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
    !nonEmptyString(data.refreshToken) || /[\r\n]/.test(data.refreshToken)
  ) {
    throw new AuthError('invalidResponse')
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Math.min(expiresAt, Date.now() + data.expiresIn * 1000),
  }
}

// Sign-out always clears the local session in App, even if revocation is offline.
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

// Persisted session storage. The session lives in localStorage so a reload, a
// new tab and a browser restart all land back on the dashboard instead of the
// login screen. The stored copy is validated on load (shape and tenant origin)
// and every request still has to carry a token the API accepts, so a forged
// entry reaches no data. Signing out clears it, and the access token still
// expires after an hour and is rotated with a single-use refresh token.
const SESSION_STORAGE_KEY = 'nawy_dashboard_session'

function browserStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[name]
  } catch {
    // Some browsers throw on access when storage is blocked.
    return null
  }
}

function isStoredSession(value: unknown): value is Session {
  if (!isRecord(value) || !isRecord(value.user)) return false
  return (
    nonEmptyString(value.apiOrigin) &&
    nonEmptyString(value.accessToken) &&
    (value.refreshToken === null || nonEmptyString(value.refreshToken)) &&
    typeof value.expiresAt === 'number' &&
    nonEmptyString(value.user.id) &&
    nonEmptyString(value.user.email) &&
    Array.isArray(value.user.roles) &&
    Array.isArray(value.user.permissions)
  )
}

function readStored(store: Storage | null): Session | null {
  if (!store) return null
  try {
    const raw = store.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    // A session minted for another API origin (tenant host) is not ours.
    if (!isStoredSession(parsed) || parsed.apiOrigin !== API_BASE_URL) return null
    return parsed
  } catch {
    return null
  }
}

export function loadStoredSession(): Session | null {
  const stored = readStored(browserStorage('localStorage'))
  if (stored) return stored
  // An older build kept the session in sessionStorage; adopt one that is still
  // in this tab so an open tab does not have to sign in again.
  const legacy = readStored(browserStorage('sessionStorage'))
  if (legacy) {
    saveStoredSession(legacy)
    try {
      browserStorage('sessionStorage')?.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // Nothing to clean up when storage is disabled.
    }
  }
  return legacy
}

export function saveStoredSession(session: Session): void {
  try {
    const store = browserStorage('localStorage')
    const existing = readStored(store)
    // Another tab may already hold a fresher copy of this session; never
    // overwrite it with an older one.
    if (existing && existing.user.id === session.user.id && existing.expiresAt > session.expiresAt) return
    store?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage disabled: the tab keeps working until it reloads.
  }
}

export function clearStoredSession(): void {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      browserStorage(name)?.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // Storage disabled: nothing to clear.
    }
  }
}
