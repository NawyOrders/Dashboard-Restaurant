import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLoginBrand } from './loginBranding'
import { NO_BRAND } from './useBranding'

function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchLoginBrand', () => {
  it('reads the restaurant name and logo from the public branding endpoint', async () => {
    const fetchMock = respond({
      isSuccess: true,
      data: {
        nameAr: 'بابلو',
        nameEn: 'Pablo',
        logoUrl: 'https://img.test/logo.jpg',
        primaryColor: '#4C1354',
        secondaryColor: '#240223',
        accentColor: '#F4E234',
      },
    })

    const brand = await fetchLoginBrand('ar')

    expect(brand.name).toBe('بابلو')
    expect(brand.logoUrl).toBe('https://img.test/logo.jpg')
    expect(brand.theme?.primary).toBe('#4C1354')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://tenant.test/api/v1/Branding')
    // The login screen has no session, so it must not send credentials.
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('uses the English name in English and falls back to the other language', async () => {
    respond({ isSuccess: true, data: { nameAr: 'بابلو', nameEn: 'Pablo', logoUrl: null } })
    expect((await fetchLoginBrand('en')).name).toBe('Pablo')

    respond({ isSuccess: true, data: { nameAr: 'بابلو', nameEn: '  ', logoUrl: null } })
    expect((await fetchLoginBrand('en')).name).toBe('بابلو')
  })

  it('drops a logo that is not served over https', async () => {
    respond({ isSuccess: true, data: { nameAr: 'بابلو', nameEn: 'Pablo', logoUrl: 'http://img.test/logo.jpg' } })
    expect((await fetchLoginBrand('ar')).logoUrl).toBeNull()
  })

  it('keeps the neutral defaults when the request fails', async () => {
    respond({ isSuccess: false }, 500)
    expect(await fetchLoginBrand('ar')).toEqual(NO_BRAND)

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await fetchLoginBrand('ar')).toEqual(NO_BRAND)
  })

  it('keeps the neutral defaults when the response is not a success envelope', async () => {
    respond({ isSuccess: false, data: { nameAr: 'بابلو' } })
    expect(await fetchLoginBrand('ar')).toEqual(NO_BRAND)
  })
})
