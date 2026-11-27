import { useEffect, useState } from 'react'
import type { Api } from './api/Api'
import type { Lang } from './i18n'

export type TenantBrand = { name: string | null; logoUrl: string | null }

export const NO_BRAND: TenantBrand = { name: null, logoUrl: null }

// Only https images are shown; anything else (javascript:, data:, http:) is dropped.
export function safeLogoUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

export function pickBrand(
  branding: { nameAr: string | null; nameEn: string | null; logoUrl: string | null },
  lang: Lang,
): TenantBrand {
  const ar = clean(branding.nameAr)
  const en = clean(branding.nameEn)
  return { name: lang === 'ar' ? (ar ?? en) : (en ?? ar), logoUrl: safeLogoUrl(branding.logoUrl) }
}

// The restaurant's own name and logo from its public branding. Without an api
// (mock mode) or when the request fails the caller keeps its neutral defaults.
export function useBranding(api: Api | null | undefined, lang: Lang): TenantBrand {
  const [brand, setBrand] = useState<TenantBrand>(NO_BRAND)
  useEffect(() => {
    if (!api) {
      setBrand(NO_BRAND)
      return undefined
    }
    const controller = new AbortController()
    api
      .getBranding(undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || result.notModified) return
        setBrand(pickBrand(result.branding, lang))
      })
      .catch(() => {
        // Keep the neutral defaults.
      })
    return () => controller.abort()
  }, [api, lang])
  return brand
}
