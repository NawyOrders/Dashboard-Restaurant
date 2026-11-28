import { describe, expect, it } from 'vitest'
import { mediaBaseFromUrl, resolveItemImageUrl } from './media'

const LOGO = 'https://proj.supabase.co/storage/v1/object/public/nawy-orders/onboarding/pending/a/logo.jpg'

describe('menu media resolution', () => {
  it('derives the public storage prefix from the tenant branding url', () => {
    expect(mediaBaseFromUrl(LOGO)).toBe('https://proj.supabase.co/storage/v1/object/public/nawy-orders')
    expect(mediaBaseFromUrl('https://example.test/logo.jpg')).toBeNull()
    expect(mediaBaseFromUrl('http://proj.supabase.co/storage/v1/object/public/b/x.jpg')).toBeNull()
    expect(mediaBaseFromUrl(null)).toBeNull()
  })

  it('turns an item image key into an absolute url under that prefix', () => {
    const base = mediaBaseFromUrl(LOGO)
    expect(resolveItemImageUrl('tenant-1/menu/items/a.jpg', null, base)).toBe(
      'https://proj.supabase.co/storage/v1/object/public/nawy-orders/tenant-1/menu/items/a.jpg',
    )
    expect(resolveItemImageUrl('/tenant-1/menu/items/a.jpg', null, base)).toBe(
      'https://proj.supabase.co/storage/v1/object/public/nawy-orders/tenant-1/menu/items/a.jpg',
    )
  })

  it('keeps an explicit url and drops a key it cannot resolve', () => {
    expect(resolveItemImageUrl('tenant-1/a.jpg', 'https://cdn.test/a.jpg', null)).toBe('https://cdn.test/a.jpg')
    expect(resolveItemImageUrl('https://cdn.test/a.jpg', null, null)).toBe('https://cdn.test/a.jpg')
    expect(resolveItemImageUrl('tenant-1/a.jpg', null, null)).toBeNull()
    expect(resolveItemImageUrl(null, null, 'https://proj.supabase.co/storage/v1/object/public/b')).toBeNull()
  })
})
