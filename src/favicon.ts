// Browser-tab icon from the restaurant's own branding. The logo is used when
// there is a safe (https) one; otherwise a small SVG with the first letter of
// the restaurant name, or a plain neutral mark when there is no name either.

const NEUTRAL_BG = '#1f2937'

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function firstLetter(name: string | null | undefined): string | null {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return null
  const [first] = Array.from(trimmed)
  return first ? first.toUpperCase() : null
}

export function letterFaviconHref(name: string | null | undefined): string {
  const letter = firstLetter(name)
  const text = letter
    ? `<text x="32" y="44" font-size="38" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#ffffff">${escapeXml(letter)}</text>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${NEUTRAL_BG}"/>${text}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// `logoUrl` is expected to be already checked by safeLogoUrl (https only);
// it is checked again here so this function is safe on its own.
export function faviconHref(name: string | null | undefined, logoUrl: string | null | undefined): string {
  if (logoUrl) {
    try {
      const url = new URL(logoUrl)
      if (url.protocol === 'https:') return url.toString()
    } catch {
      // fall through to the letter icon
    }
  }
  return letterFaviconHref(name)
}

export function applyFavicon(doc: Document, href: string): void {
  let link = doc.head.querySelector<HTMLLinkElement>('link[data-tenant-favicon]')
  if (!link) {
    link = doc.createElement('link')
    link.setAttribute('data-tenant-favicon', '')
    link.rel = 'icon'
    doc.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}
