import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo } from './BrandLogo'

describe('BrandLogo', () => {
  it('shows the logo image when there is one', () => {
    const { container } = render(<BrandLogo name="Pablo" logoUrl="https://img.test/l.jpg" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://img.test/l.jpg')
  })
  it('falls back to the first letter of the name without a logo', () => {
    const { container } = render(<BrandLogo name="Pablo" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('P')
  })
  it('falls back to the letter when the image fails to load', () => {
    const { container } = render(<BrandLogo name="بابلو" logoUrl="https://img.test/broken.jpg" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('ب')
  })
  it('is empty but valid with no name and no logo, and never shows a hardcoded restaurant', () => {
    const { container } = render(<BrandLogo />)
    expect(container.textContent).toBe('')
    expect(container.textContent).not.toMatch(/كرم|Karam/)
  })
  it('tries the logo again when the url changes after a failure', () => {
    const { container, rerender } = render(<BrandLogo name="A" logoUrl="https://img.test/1.jpg" />)
    fireEvent.error(container.querySelector('img')!)
    rerender(<BrandLogo name="A" logoUrl="https://img.test/2.jpg" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://img.test/2.jpg')
  })
  it('handles emoji and surrogate pairs as one letter', () => {
    expect(render(<BrandLogo name="🍕 Pizza" />).container.textContent).toBe('🍕')
  })
})
