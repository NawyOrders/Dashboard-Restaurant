import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Login } from './Login'
import { translations } from '../i18n'

const ar = translations.ar

function mount(brand?: { name: string | null; logoUrl: string | null; theme: null }) {
  return render(
    <Login
      t={ar}
      langToggle={ar.nav.langToggle}
      onToggleLang={() => {}}
      onSuccess={vi.fn()}
      brand={brand}
    />,
  )
}

describe('login branding', () => {
  it("shows the restaurant's own logo and name from its public branding", () => {
    const { container } = mount({ name: 'بابلو', logoUrl: 'https://img.test/logo.jpg', theme: null })

    const logos = container.querySelectorAll('[data-login-logo] img')
    expect(logos.length).toBeGreaterThan(0)
    logos.forEach((logo) => {
      expect(logo.getAttribute('src')).toBe('https://img.test/logo.jpg')
    })
    expect(screen.getAllByText('بابلو').length).toBeGreaterThan(0)
  })

  it('falls back to the neutral title and the name initial without branding', () => {
    const { container } = mount({ name: null, logoUrl: null, theme: null })

    expect(container.querySelector('[data-login-logo] img')).toBeNull()
    expect(screen.getAllByText(ar.auth.brandTitle).length).toBeGreaterThan(0)
  })
})
