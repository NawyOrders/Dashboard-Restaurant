import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './api/httpApi'
import type { Api } from './api'
import type { MenuCategory } from './api/types'
import { translations } from './i18n'
import MenuPage from './pages/MenuPage'
import SettingsPage from './pages/SettingsPage'

// Security regression suite: guards the hardening invariants (transport
// safety, storage hygiene, markup injection, deployment headers) so a future
// change cannot silently weaken them.

const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  )
}

const emptyOrderPage = {
  statusCode: 200,
  isSuccess: true,
  data: {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  },
}

describe('deployment security headers', () => {
  const vercel = JSON.parse(readFileSync(process.cwd() + '/vercel.json', 'utf8')) as {
    headers?: { source: string; headers: { key: string; value: string }[] }[]
  }
  const globalHeaders = new Map(
    (vercel.headers?.find((entry) => entry.source === '/(.*)')?.headers ?? []).map((h) => [
      h.key,
      h.value,
    ]),
  )

  it('blocks framing, MIME sniffing and referrer leakage', () => {
    expect(globalHeaders.get('X-Frame-Options')).toBe('DENY')
    expect(globalHeaders.get('X-Content-Type-Options')).toBe('nosniff')
    expect(globalHeaders.get('Referrer-Policy')).toBe('no-referrer')
    expect(globalHeaders.get('Permissions-Policy')).toContain('camera=()')
  })

  it('enforces a restrictive content security policy', () => {
    const csp = globalHeaders.get('Content-Security-Policy') ?? ''
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('loads no third-party scripts or styles besides Google Fonts', () => {
    const html = readFileSync(process.cwd() + '/index.html', 'utf8')
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i)
    const hosts = [...html.matchAll(/(?:href|src)=["'](https?:\/\/[^"']+)/gi)].map(
      (match) => new URL(match[1]).host,
    )
    expect([...new Set(hosts)].sort()).toEqual(['fonts.googleapis.com', 'fonts.gstatic.com'])
  })
})

describe('HTTP transport hardening', () => {
  beforeEach(() => fetchMock.mockReset())

  it('URL-encodes query values so reserved characters cannot alter the request', async () => {
    respond(emptyOrderPage)
    const api = createHttpApi({
      baseUrl: 'https://tenant.test',
      getAccessToken: () => 'token',
      fetchImpl: fetchMock,
    })
    await api.listOrders({ branchId: 'a&b=c?', fromDate: '2026-01-01' })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('branchId=a%26b%3Dc%3F')
    expect(String(url)).not.toContain('a&b=c?')
    expect(new URL(String(url)).searchParams.get('branchId')).toBe('a&b=c?')
  })

  it('never sends cookies and never follows redirects on data requests', async () => {
    respond(emptyOrderPage)
    const api = createHttpApi({
      baseUrl: 'https://tenant.test',
      getAccessToken: () => 'token',
      fetchImpl: fetchMock,
    })
    await api.listOrders()

    const [, init] = fetchMock.mock.calls[0]
    expect(init).toMatchObject({
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
  })
})

describe('settings storage hardening', () => {
  const t = translations.ar
  const storageKey = 'security-settings-test'

  beforeEach(() => window.localStorage.clear())

  it('falls back to defaults when stored settings are corrupted', () => {
    window.localStorage.setItem(storageKey, '{not json')
    render(<SettingsPage t={t} lang="ar" storageKey={storageKey} onToast={vi.fn()} />)
    expect(screen.getByLabelText(t.settingsPage.restaurantName)).toHaveValue(
      t.settingsPage.defaults.restaurantName,
    )
  })

  it('keeps nested defaults when a stored section has the wrong type', () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ restaurantName: 'مطعم التجربة', notifications: 'yes' }),
    )
    render(<SettingsPage t={t} lang="ar" storageKey={storageKey} onToast={vi.fn()} />)
    expect(screen.getByLabelText(t.settingsPage.restaurantName)).toHaveValue('مطعم التجربة')
    expect(screen.getByRole('switch', { name: t.settingsPage.repeatSound })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('does not let stored settings pollute Object.prototype', () => {
    window.localStorage.setItem(
      storageKey,
      '{"__proto__": {"polluted": true}, "restaurantName": "x"}',
    )
    render(<SettingsPage t={t} lang="ar" storageKey={storageKey} onToast={vi.fn()} />)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.prototype).not.toHaveProperty('polluted')
  })
})

describe('markup injection resistance', () => {
  it('renders API-provided menu text inertly, never as markup', async () => {
    const evil = '<img src=x onerror=window.__xss=1>'
    const categories: MenuCategory[] = [
      {
        id: 'c1',
        nameAr: evil,
        nameEn: evil,
        count: 1,
        items: [
          {
            id: 'i1',
            nameAr: evil,
            nameEn: evil,
            price: 10,
            available: true,
            imageUrl: null,
            categoryId: 'c1',
          },
        ],
      },
    ]
    const api = {
      listMenu: vi.fn(async () => categories),
      listBranches: vi.fn(async () => []),
      updateMenuItemAvailability: vi.fn(async () => {}),
    } as unknown as Api

    render(<MenuPage t={translations.ar} lang="ar" api={api} onToast={vi.fn()} />)

    const rendered = await screen.findAllByText(evil)
    expect(rendered.length).toBeGreaterThan(0)
    expect(document.querySelector('img')).toBeNull()
    expect((window as { __xss?: unknown }).__xss).toBeUndefined()
  })
})
