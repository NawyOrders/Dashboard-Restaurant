import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Api } from './api/Api'
import { NO_BRAND, pickBrand, safeLogoUrl, useBranding } from './useBranding'

const branding = (over: Partial<{ nameAr: string | null; nameEn: string | null; logoUrl: string | null }> = {}) => ({
  nameAr: 'بابلو', nameEn: 'Pablo', logoUrl: 'https://img.test/logo.jpg', ...over,
})

describe('safeLogoUrl', () => {
  it.each(['https://img.test/a.jpg', 'https://img.test/a b.jpg'])('accepts https: %s', (url) => {
    expect(safeLogoUrl(url)).not.toBeNull()
  })
  it.each([null, undefined, '', 'http://img.test/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x/y', '//img.test/a.jpg', 'not a url', 'file:///etc/passwd'])(
    'drops %s',
    (url) => {
      expect(safeLogoUrl(url as string | null | undefined)).toBeNull()
    },
  )
})

describe('pickBrand', () => {
  it('uses the name for the language and falls back to the other one', () => {
    expect(pickBrand(branding(), 'ar').name).toBe('بابلو')
    expect(pickBrand(branding(), 'en').name).toBe('Pablo')
    expect(pickBrand(branding({ nameAr: null }), 'ar').name).toBe('Pablo')
    expect(pickBrand(branding({ nameEn: '  ' }), 'en').name).toBe('بابلو')
  })
  it('returns no name when both are missing or blank', () => {
    expect(pickBrand(branding({ nameAr: null, nameEn: null }), 'en').name).toBeNull()
    expect(pickBrand(branding({ nameAr: ' ', nameEn: '' }), 'ar').name).toBeNull()
  })
  it('trims the name and drops an unsafe logo', () => {
    const brand = pickBrand(branding({ nameEn: '  Cafe 7  ', logoUrl: 'javascript:x' }), 'en')
    expect(brand).toEqual({ name: 'Cafe 7', logoUrl: null })
  })
})

describe('useBranding', () => {
  const apiWith = (getBranding: Api['getBranding']) => ({ getBranding }) as unknown as Api

  it('keeps the neutral defaults without an api', () => {
    const { result } = renderHook(() => useBranding(null, 'en'))
    expect(result.current).toEqual(NO_BRAND)
  })

  it("loads the restaurant's own name and logo", async () => {
    const api = apiWith(vi.fn(async () => ({ notModified: false as const, etag: null, branding: { ...branding(), tenantId: 't' } as never })))
    const { result } = renderHook(() => useBranding(api, 'en'))
    await waitFor(() => expect(result.current.name).toBe('Pablo'))
    expect(result.current.logoUrl).toBe('https://img.test/logo.jpg')
  })

  it('switches the name when the language changes', async () => {
    const api = apiWith(vi.fn(async () => ({ notModified: false as const, etag: null, branding: { ...branding(), tenantId: 't' } as never })))
    const { result, rerender } = renderHook(({ lang }) => useBranding(api, lang), { initialProps: { lang: 'en' as 'en' | 'ar' } })
    await waitFor(() => expect(result.current.name).toBe('Pablo'))
    rerender({ lang: 'ar' })
    await waitFor(() => expect(result.current.name).toBe('بابلو'))
  })

  it('keeps defaults when the request fails or the server says not modified', async () => {
    const failing = apiWith(vi.fn(async () => Promise.reject(new Error('401'))))
    const a = renderHook(() => useBranding(failing, 'en'))
    await waitFor(() => expect(failing.getBranding).toHaveBeenCalled())
    expect(a.result.current).toEqual(NO_BRAND)
    const same = apiWith(vi.fn(async () => ({ notModified: true as const, etag: 'x' })))
    const b = renderHook(() => useBranding(same, 'en'))
    await waitFor(() => expect(same.getBranding).toHaveBeenCalled())
    expect(b.result.current).toEqual(NO_BRAND)
  })

  it('ignores a late answer after unmount (aborts the request)', async () => {
    let signal: AbortSignal | undefined
    const api = apiWith(vi.fn(async (_etag?: string, s?: AbortSignal) => {
      signal = s
      return new Promise<never>(() => undefined)
    }))
    const { unmount } = renderHook(() => useBranding(api, 'en'))
    await waitFor(() => expect(signal).toBeDefined())
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})
