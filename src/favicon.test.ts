import { beforeEach, describe, expect, it } from 'vitest'
import { applyFavicon, faviconHref, firstLetter, letterFaviconHref } from './favicon'

const decode = (href: string) => decodeURIComponent(href.replace('data:image/svg+xml,', ''))

describe('firstLetter', () => {
  it.each([
    ['Pablo', 'P'],
    ['  cafe 7', 'C'],
    ['بابلو', 'ب'],
    ['🍕 Pizza', '🍕'],
  ])('%s -> %s', (name, letter) => {
    expect(firstLetter(name)).toBe(letter)
  })
  it.each([null, undefined, '', '   '])('no letter for %s', (name) => {
    expect(firstLetter(name)).toBeNull()
  })
})

describe('faviconHref', () => {
  it('uses the restaurant logo when it is https', () => {
    expect(faviconHref('Pablo', 'https://img.test/logo.jpg')).toBe('https://img.test/logo.jpg')
  })
  it.each(['http://img.test/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///etc/passwd', '//img.test/a.jpg', 'not a url', ''])(
    'ignores an unsafe or invalid logo (%s) and uses the letter',
    (logo) => {
      const href = faviconHref('Pablo', logo)
      expect(href.startsWith('data:image/svg+xml,')).toBe(true)
      expect(decode(href)).toContain('>P<')
    },
  )
  it('falls back to the letter without a logo, and to a neutral mark without a name', () => {
    expect(decode(faviconHref('بابلو', null))).toContain('>ب<')
    const neutral = decode(faviconHref(null, null))
    expect(neutral).toContain('<rect')
    expect(neutral).not.toContain('<text')
  })
})

describe('letterFaviconHref', () => {
  it('escapes markup in the name so no script or tag can be injected', () => {
    const svg = decode(letterFaviconHref('<script>alert(1)</script>'))
    expect(svg).not.toContain('<script')
    expect(svg).toContain('&lt;')
    expect(decode(letterFaviconHref('&'))).toContain('&amp;')
    expect(decode(letterFaviconHref('"'))).toContain('&quot;')
  })
  it('is a valid svg document', () => {
    const svg = decode(letterFaviconHref('Pablo'))
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
  })
})

describe('applyFavicon', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link').forEach((node) => node.remove())
  })
  it('adds one icon link and updates it instead of adding more', () => {
    applyFavicon(document, 'https://img.test/a.jpg')
    applyFavicon(document, 'https://img.test/b.jpg')
    const links = document.head.querySelectorAll('link[rel="icon"]')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://img.test/b.jpg')
  })
  it('leaves other head links alone', () => {
    const other = document.createElement('link')
    other.rel = 'stylesheet'
    other.href = '/x.css'
    document.head.appendChild(other)
    applyFavicon(document, 'https://img.test/a.jpg')
    expect(document.head.querySelectorAll('link')).toHaveLength(2)
    expect(other.getAttribute('href')).toBe('/x.css')
  })
})
