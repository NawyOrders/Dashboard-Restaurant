import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PERMISSIONS } from '../authz'
import { SettingsAdminLinks } from './SettingsAdminLinks'

function renderLinks(permissions: string[]) {
  const onNavigate = vi.fn()
  const view = render(<SettingsAdminLinks lang="en" dir="ltr" permissions={permissions} onNavigate={onNavigate} />)
  return { onNavigate, view }
}

describe('settings admin links', () => {
  it('shows Branches, Payments and Roles for a user with all three permissions', () => {
    renderLinks([PERMISSIONS.branchesView, PERMISSIONS.restaurantSettingsView, PERMISSIONS.staffManage])
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('hides links the user has no permission for', () => {
    renderLinks([PERMISSIONS.branchesView])
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('renders nothing without any of these permissions', () => {
    const { view } = renderLinks([PERMISSIONS.offersView])
    expect(view.container).toBeEmptyDOMElement()
  })

  it('navigates to the chosen page', () => {
    const { onNavigate } = renderLinks([PERMISSIONS.staffManage])
    fireEvent.click(screen.getByRole('button'))
    expect(onNavigate).toHaveBeenCalledWith('/manage/roles')
  })
})
