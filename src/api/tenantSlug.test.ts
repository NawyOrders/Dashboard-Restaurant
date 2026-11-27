import { describe, expect, it, vi } from 'vitest'
import { resolveApiOrigin } from '../auth'
import { createHttpApi } from './httpApi'

function ok(data: unknown) {
  return new Response(JSON.stringify({ statusCode: 200, isSuccess: true, data }), { status: 200 })
}

// The dashboard is multi-tenant: the restaurant comes from the host name only.
describe('the restaurant slug in the host decides which API is called', () => {
  it.each(['pablo', 'burger-house', 'cafe-7', 'a'])('reads the menu from %s.api.nawyorders.com', async (slug) => {
    const resolution = resolveApiOrigin(`${slug}.admin.nawyorders.com`, '')
    expect(resolution).toEqual({ ok: true, origin: `https://${slug}.api.nawyorders.com` })
    if (!resolution.ok) return
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      return url.includes('/menu/categories') ? ok([{ id: 'c1', nameEn: 'X', nameAr: 'س', itemCount: 0 }]) : ok({ items: [], totalCount: 0 })
    })
    const api = createHttpApi({ baseUrl: resolution.origin, getAccessToken: () => 't', fetchImpl: fetchMock, timeoutMs: 1000 })
    await api.listMenu()
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0)
    for (const [url] of fetchMock.mock.calls) {
      expect(String(url).startsWith(`https://${slug}.api.nawyorders.com/`)).toBe(true)
    }
  })

  it('never falls back to another restaurant for unknown hosts or bad slugs', () => {
    for (const host of ['localhost', 'admin.nawyorders.com', 'x.vercel.app', 'a.b.admin.nawyorders.com', '-bad.admin.nawyorders.com', '']) {
      const result = resolveApiOrigin(host, '')
      expect(result.ok).toBe(false)
    }
  })

  it('does not contain a hardcoded restaurant slug in the production source', () => {
    const files = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const offenders = Object.entries(files).filter(([, text]) => /pablo/i.test(text)).map(([name]) => name)
    expect(offenders).toEqual([])
  })
})
