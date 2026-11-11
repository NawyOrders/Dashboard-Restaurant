import type { Api } from './Api'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'

export type { Api } from './Api'
export * from './types'

export type CreateApiOptions = {
  baseUrl: string
  getAccessToken: () => string | null
  mock?: boolean
  mockError?: boolean
  fetchImpl?: typeof fetch
  timeoutMs?: number
  mockLatencyMs?: number
}

// `?mock=1` opts into seeded sample data; `?mockError=1` additionally simulates
// a failing backend so error states can be exercised without touching the API.
export function isMockRequested(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.get('mock') === '1' || params.get('mockError') === '1'
}

export function isMockErrorRequested(search: string): boolean {
  return new URLSearchParams(search).get('mockError') === '1'
}

export function createApi(options: CreateApiOptions): Api {
  if (options.mock) {
    return createMockApi({ latencyMs: options.mockLatencyMs, fail: options.mockError })
  }
  return createHttpApi({
    baseUrl: options.baseUrl,
    getAccessToken: options.getAccessToken,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  })
}
