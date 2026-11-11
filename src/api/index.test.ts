import { describe, expect, it } from 'vitest'
import { createApi, isMockErrorRequested, isMockRequested } from './index'

describe('API factory', () => {
  it('detects mock query flags', () => {
    expect(isMockRequested('')).toBe(false)
    expect(isMockRequested('?mock=1')).toBe(true)
    expect(isMockRequested('?mockError=1')).toBe(true)
    expect(isMockErrorRequested('?mock=1')).toBe(false)
    expect(isMockErrorRequested('?mockError=1')).toBe(true)
  })

  it('creates the seeded mock adapter when requested', async () => {
    const api = createApi({
      baseUrl: 'https://api.test',
      getAccessToken: () => 'token',
      mock: true,
      mockError: false,
      mockLatencyMs: 0,
    })
    const page = await api.listOrders()
    expect(page.items.length).toBeGreaterThan(0)
  })

  it('creates a failing mock adapter for mockError', async () => {
    const api = createApi({
      baseUrl: 'https://api.test',
      getAccessToken: () => 'token',
      mock: true,
      mockError: true,
      mockLatencyMs: 0,
    })
    await expect(api.listOrders()).rejects.toMatchObject({ code: 'service' })
  })
})
