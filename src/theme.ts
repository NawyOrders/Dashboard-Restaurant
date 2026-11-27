// Tenant theme: turns the restaurant's own brand colors (primary, secondary,
// accent from its branding data) into the CSS variables the whole dashboard
// uses. Nothing here is specific to one restaurant. Invalid or unusable colors
// are ignored, and the default palette in index.css stays in effect.

export type ThemeColors = {
  primary: string
  secondary: string
  accent: string
}

type Rgb = [number, number, number]

const HEX = /^#[0-9a-fA-F]{6}$/

export function parseHex(value: string | null | undefined): Rgb | null {
  const text = (value ?? '').trim()
  if (!HEX.test(text)) return null
  return [parseInt(text.slice(1, 3), 16), parseInt(text.slice(3, 5), 16), parseInt(text.slice(5, 7), 16)]
}

export function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

// amount 0 keeps `from`, 1 gives `to`.
export function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(from[i] + (to[i] - from[i]) * amount)) as Rgb
}

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]
const tint = (color: Rgb, amount: number) => mix(color, WHITE, amount)
const shade = (color: Rgb, amount: number) => mix(color, BLACK, amount)
const triplet = ([r, g, b]: Rgb) => `${r} ${g} ${b}`

// Only colors that are dark enough to carry white text are usable as the
// primary; a very light accent is fine because text on it is set dark.
export function pickThemeColors(input: {
  primary: string | null | undefined
  secondary: string | null | undefined
  accent: string | null | undefined
}): ThemeColors | null {
  const primary = parseHex(input.primary)
  const secondary = parseHex(input.secondary)
  const accent = parseHex(input.accent)
  if (!primary || !secondary || !accent) return null
  if (luminance(primary) > 0.4) return null
  if (luminance(secondary) > 0.05) return null
  return {
    primary: input.primary!.trim().toUpperCase(),
    secondary: input.secondary!.trim().toUpperCase(),
    accent: input.accent!.trim().toUpperCase(),
  }
}

export function deriveTheme(colors: ThemeColors): Record<string, string> {
  const primary = parseHex(colors.primary)!
  const secondary = parseHex(colors.secondary)!
  const accent = parseHex(colors.accent)!
  const onGold = luminance(accent) > 0.35 ? secondary : WHITE
  return {
    '--c-brand-50': triplet(tint(primary, 0.93)),
    '--c-brand-100': triplet(tint(primary, 0.85)),
    '--c-brand-200': triplet(tint(primary, 0.72)),
    '--c-brand-300': triplet(tint(primary, 0.55)),
    '--c-brand-400': triplet(tint(primary, 0.35)),
    '--c-brand-500': triplet(tint(primary, 0.15)),
    '--c-brand-600': triplet(primary),
    '--c-brand-700': triplet(shade(primary, 0.3)),
    '--c-gold-50': triplet(tint(accent, 0.85)),
    '--c-gold-200': triplet(tint(accent, 0.55)),
    '--c-gold-300': triplet(tint(accent, 0.4)),
    '--c-gold-400': triplet(accent),
    '--c-gold-500': triplet(shade(accent, 0.12)),
    '--c-gold-600': triplet(shade(accent, 0.35)),
    '--c-gold-800': triplet(mix(accent, secondary, 0.75)),
    '--c-on-gold': triplet(onGold),
    '--c-ink-900': triplet(secondary),
    '--c-ink-700': triplet(tint(secondary, 0.25)),
    '--c-ink-500': triplet(tint(secondary, 0.5)),
    '--c-cream-50': triplet(tint(primary, 0.97)),
    '--c-cream-100': triplet(tint(primary, 0.94)),
    '--c-cream-200': triplet(tint(primary, 0.88)),
    '--c-cream-300': triplet(tint(primary, 0.8)),
    '--c-line': triplet(tint(primary, 0.88)),
    '--c-line-strong': triplet(tint(primary, 0.78)),
    '--c-surface-muted': triplet(tint(primary, 0.97)),
    '--c-surface-sunken': triplet(tint(primary, 0.94)),
  }
}

export const THEME_VARIABLES = Object.keys(deriveTheme({ primary: '#4C1354', secondary: '#240223', accent: '#F4E234' }))

export function applyTheme(root: HTMLElement, colors: ThemeColors | null): void {
  if (!colors) {
    for (const name of THEME_VARIABLES) root.style.removeProperty(name)
    return
  }
  for (const [name, value] of Object.entries(deriveTheme(colors))) root.style.setProperty(name, value)
}

// The last theme is remembered per host so the next visit paints with the
// restaurant's colors from the first frame instead of flashing the default.
const cacheKey = (host: string) => `nawy-theme:${host}`

export function saveThemeCache(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  host: string,
  colors: ThemeColors | null,
): void {
  try {
    if (colors) storage.setItem(cacheKey(host), JSON.stringify(colors))
    else storage.removeItem(cacheKey(host))
  } catch {
    // Storage can be unavailable; the theme still applies for this visit.
  }
}

export function loadThemeCache(storage: Pick<Storage, 'getItem'>, host: string): ThemeColors | null {
  try {
    const raw = storage.getItem(cacheKey(host))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<ThemeColors> | null
    return pickThemeColors({
      primary: value?.primary,
      secondary: value?.secondary,
      accent: value?.accent,
    })
  } catch {
    return null
  }
}
