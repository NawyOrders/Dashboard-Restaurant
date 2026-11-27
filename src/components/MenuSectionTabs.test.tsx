import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PERMISSIONS } from '../authz'
import { MenuSectionTabs } from './MenuSectionTabs'

function renderTabs(permissions: string[], currentPath = '/manage/menu-items') {
  const onNavigate = vi.fn()
  render(<MenuSectionTabs lang="en" permissions={permissions} currentPath={currentPath} onNavigate={onNavigate} label="Menu management" />)
  return onNavigate
}

describe('menu section tabs', () => {
  it('shows Menu items, Categories and Add-ons for a user who can edit the menu', () => {
    renderTabs([PERMISSIONS.menuView, PERMISSIONS.menuEdit])
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('hides Add-ons without edit permission', () => {
    renderTabs([PERMISSIONS.menuView])
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('renders nothing without menu permissions', () => {
    renderTabs([])
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('marks the current page and navigates on click', () => {
    const onNavigate = renderTabs([PERMISSIONS.menuEdit], '/manage/categories')
    const buttons = screen.getAllByRole('button')
    expect(buttons.filter((button) => button.getAttribute('aria-current') === 'page')).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
