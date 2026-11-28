// Menu images come back as an object key, not a URL. The key is only readable
// under the tenant's own public storage prefix, which the tenant's branding
// already points at (its logo lives in the same bucket). Nothing about a
// specific restaurant is hard-coded here: without a branding URL, or when the
// key is not under a public storage prefix, the item keeps no image.
const PUBLIC_PREFIX = '/storage/v1/object/public/'

let mediaBase: string | null = null

// Derives https://<project>/storage/v1/object/public/<bucket> from any public
// storage URL of the same tenant (its logo, favicon or banner).
export function mediaBaseFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  const index = parsed.pathname.indexOf(PUBLIC_PREFIX)
  if (index < 0) return null
  const rest = parsed.pathname.slice(index + PUBLIC_PREFIX.length)
  const bucket = rest.split('/')[0]
  if (!bucket) return null
  return `${parsed.origin}${PUBLIC_PREFIX}${bucket}`
}

export function setMediaBase(url: string | null | undefined): void {
  mediaBase = mediaBaseFromUrl(url)
}

export function currentMediaBase(): string | null {
  return mediaBase
}

// An explicit URL wins; otherwise the key is resolved under the media base.
export function resolveItemImageUrl(
  imageKey: string | null | undefined,
  imageUrl: string | null | undefined,
  base: string | null = mediaBase,
): string | null {
  const explicit = (imageUrl ?? '').trim()
  if (explicit) return explicit
  const key = (imageKey ?? '').trim()
  if (!key) return null
  if (/^https:\/\//i.test(key)) return key
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`
}
