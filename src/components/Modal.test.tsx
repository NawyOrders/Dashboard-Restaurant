import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrandContext } from '../brandContext'
import { Modal } from './Modal'

const renderModal = (over: Partial<Parameters<typeof Modal>[0]> = {}) => {
  const onClose = vi.fn()
  const utils = render(
    <Modal open onClose={onClose} title="Details" subtitle="Sub" closeLabel="Close" footer={<button type="button">Save</button>} {...over}>
      <input aria-label="field" />
    </Modal>,
  )
  return { onClose, ...utils }
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    renderModal({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is an accessible dialog with a title, description and footer', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Details' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('closes with the close button, Escape, and a click on the backdrop', () => {
    const { onClose, container } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(container.querySelector('[aria-hidden="true"].absolute') as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when the panel itself is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses the close button, keeps focus inside, and locks page scroll until closed', () => {
    const { unmount } = renderModal()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(document.body.style.overflow).toBe('hidden')
    screen.getByRole('button', { name: 'Save' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('has a decorative mobile handle that screen readers skip, and no footer when none is given', () => {
    const { container } = renderModal({ footer: undefined })
    expect(container.querySelector('[data-modal-handle]')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('shows the optional icon tile only when given, hidden from screen readers', () => {
    const { container, unmount } = renderModal({ icon: <svg data-testid="ic" /> })
    expect(container.querySelector('[data-modal-icon]')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByTestId('ic')).toBeTruthy()
    unmount()
    const again = renderModal()
    expect(again.container.querySelector('[data-modal-icon]')).toBeNull()
  })

  it('keeps the title readable as the dialog name with the red header band', () => {
    const { container } = renderModal()
    expect(container.querySelector('[data-modal-header]')?.className).toContain('from-brand-700')
    expect(screen.getByRole('heading', { name: 'Details' })).toBeTruthy()
  })

  it("shows the restaurant's own logo in the header when it has one, instead of the icon tile", () => {
    const { container } = render(
      <BrandContext.Provider value={{ logoUrl: 'https://img.test/logo.jpg', name: 'Pablo' }}>
        <Modal open onClose={() => undefined} title="Details" closeLabel="Close" icon={<svg data-testid="ic" />}>
          <p>body</p>
        </Modal>
      </BrandContext.Provider>,
    )
    expect(container.querySelector('[data-modal-logo] img')?.getAttribute('src')).toBe('https://img.test/logo.jpg')
    expect(container.querySelector('[data-modal-icon]')).toBeNull()
  })

  it('falls back to the icon tile, or nothing, when the restaurant has no logo', () => {
    const a = renderModal({ icon: <svg data-testid="ic" /> })
    expect(a.container.querySelector('[data-modal-logo]')).toBeNull()
    expect(a.container.querySelector('[data-modal-icon]')).not.toBeNull()
    a.unmount()
    const b = renderModal()
    expect(b.container.querySelector('[data-modal-logo]')).toBeNull()
    expect(b.container.querySelector('[data-modal-icon]')).toBeNull()
  })

  it.each(['sm', 'md', 'lg'] as const)('supports size %s', (size) => {
    renderModal({ size })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
