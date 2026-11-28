import { useEffect, useState } from 'react'
import { API_BASE_URL } from './auth'
import { isRecord } from './api/types'
import type { Lang } from './i18n'
import { NO_BRAND, pickBrand, type TenantBrand } from './useBranding'

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

// The login screen has no session yet, so it reads the restaurant's public
// branding straight from GET /api/v1/Branding. Nothing is hard-coded: without a
// tenant origin, or when the request fails, the caller keeps the neutral
// defaults it already shows.
export async function fetchLoginBrand(lang: Lang, signal?: AbortSignal): Promise<TenantBrand> {
  if (!API_BASE_URL) return NO_BRAND
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/Branding`, {
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!response.ok) return NO_BRAND
    const body: unknown = await response.json()
    if (!isRecord(body) || body.isSuccess !== true || !isRecord(body.data)) return NO_BRAND
    const data = body.data
    return pickBrand(
      {
        nameAr: text(data.nameAr),
        nameEn: text(data.nameEn),
        logoUrl: text(data.logoUrl),
        primaryColor: text(data.primaryColor),
        secondaryColor: text(data.secondaryColor),
        accentColor: text(data.accentColor),
      },
      lang,
    )
  } catch {
    return NO_BRAND
  }
}

// Loads the public branding for the signed-out screens only.
export function useLoginBranding(lang: Lang, enabled: boolean): TenantBrand {
  const [brand, setBrand] = useState<TenantBrand>(NO_BRAND)
  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    void fetchLoginBrand(lang, controller.signal).then((next) => {
      if (controller.signal.aborted || next === NO_BRAND) return
      setBrand(next)
    })
    return () => controller.abort()
  }, [lang, enabled])
  return brand
}
