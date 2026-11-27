import { describe, expect, it } from 'vitest'
import {
  THEME_VARIABLES,
  applyTheme,
  deriveTheme,
  loadThemeCache,
  luminance,
  parseHex,
  pickThemeColors,
  saveThemeCache,
} from './theme'

const PABLO = { primary: '#4C1354', secondary: '#240223', accent: '#F4E234' }

describe('parseHex', () => {
  it('reads a six digit hex color', () => {
    expect(parseHex('#4C1354')).toEqual([76, 19, 84])
    expect(parseHex(' #f4e234 ')).toEqual([244, 226, 52])
  })
  it.each([
    null,
    undefined,
    '',
    '#FFF',
    '4C1354',
    '#4C13545',
    '#GGGGGG',
    'red',
    'rgb(1,2,3)',
    '#4C1354; background: url(x)',
    '#4C1354"><script>',
    'var(--x)',
  ])('rejects %s', (value) => {
    expect(parseHex(value as string | null | undefined)).toBeNull()
  })
})

describe('pickThemeColors', () => {
  it('accepts a dark primary, a very dark secondary and any accent', () => {
    expect(pickThemeColors(PABLO)).toEqual(PABLO)
  })
  it('rejects a set with one bad color', () => {
    expect(pickThemeColors({ ...PABLO, accent: 'nope' })).toBeNull()
    expect(pickThemeColors({ ...PABLO, primary: null })).toBeNull()
  })
  it('rejects a primary too light for white text and a secondary too light for body text', () => {
    expect(pickThemeColors({ ...PABLO, primary: '#FFEE88' })).toBeNull()
    expect(pickThemeColors({ ...PABLO, secondary: '#C2281A' })).toBeNull()
  })
})

describe('deriveTheme', () => {
  const vars = deriveTheme(PABLO)
  it('uses the primary as brand-600 and the accent as gold-400', () => {
    expect(vars['--c-brand-600']).toBe('76 19 84')
    expect(vars['--c-gold-400']).toBe('244 226 52')
    expect(vars['--c-ink-900']).toBe('36 2 35')
  })
  it('sets dark text on a light accent and white on a dark one', () => {
    expect(vars['--c-on-gold']).toBe('36 2 35')
    expect(deriveTheme({ ...PABLO, accent: '#7A1F5C' })['--c-on-gold']).toBe('255 255 255')
  })
  it('produces only space separated rgb triplets', () => {
    for (const value of Object.values(vars)) expect(value).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
  })
  it('lightens scales towards white and darkens 700', () => {
    expect(luminance(parseHex('#F5EAF7')!)).toBeGreaterThan(luminance(parseHex('#4C1354')!))
    const brand700 = vars['--c-brand-700'].split(' ').map(Number)
    expect(brand700[0]).toBeLessThan(76)
  })
})

describe('applyTheme', () => {
  it('sets every variable and clears them again for the default palette', () => {
    const root = document.createElement('div')
    applyTheme(root, PABLO)
    for (const name of THEME_VARIABLES) expect(root.style.getPropertyValue(name)).not.toBe('')
    applyTheme(root, null)
    for (const name of THEME_VARIABLES) expect(root.style.getPropertyValue(name)).toBe('')
  })
})

describe('theme cache', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    }
  }
  it('round trips per host', () => {
    const store = memory()
    saveThemeCache(store, 'a.test', PABLO)
    expect(loadThemeCache(store, 'a.test')).toEqual(PABLO)
    expect(loadThemeCache(store, 'b.test')).toBeNull()
    saveThemeCache(store, 'a.test', null)
    expect(loadThemeCache(store, 'a.test')).toBeNull()
  })
  it('ignores corrupt or tampered cache entries', () => {
    const store = memory()
    store.setItem('nawy-theme:a.test', '{not json')
    expect(loadThemeCache(store, 'a.test')).toBeNull()
    store.setItem('nawy-theme:a.test', JSON.stringify({ primary: 'red; x', secondary: '#240223', accent: '#F4E234' }))
    expect(loadThemeCache(store, 'a.test')).toBeNull()
  })
  it('does not throw when storage is broken', () => {
    const broken = {
      getItem: () => {
        throw new Error('no')
      },
      setItem: () => {
        throw new Error('no')
      },
      removeItem: () => {
        throw new Error('no')
      },
    }
    expect(() => saveThemeCache(broken, 'a.test', PABLO)).not.toThrow()
    expect(loadThemeCache(broken, 'a.test')).toBeNull()
  })
})
