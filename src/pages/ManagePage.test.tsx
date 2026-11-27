import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../authz'
import { MANAGE_MODULES } from '../manage/modules'
import ManagePage from './ManagePage'

const ALL = Object.values(PERMISSIONS)

function renderHub(permissions: readonly string[]) {
  return render(
    <MemoryRouter>
      <ManagePage lang="en" dir="ltr" permissions={permissions} />
    </MemoryRouter>,
  )
}

describe('management hub', () => {
  it('shows one card per permitted module, each with its own icon', () => {
    const { container } = renderHub(ALL)
    const cards = screen.getAllByRole('button')
    expect(cards).toHaveLength(MANAGE_MODULES.length)
    const icons = cards.map((card) => card.querySelector('svg')?.innerHTML ?? '')
    expect(new Set(icons).size).toBe(MANAGE_MODULES.length)
    expect(container.querySelectorAll('li')).toHaveLength(MANAGE_MODULES.length)
  })

  it('hides modules the user has no permission for', () => {
    renderHub([PERMISSIONS.offersView])
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('shows the no-access message without any management permission', () => {
    renderHub([])
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText(/./, { selector: 'p.dashboard-panel' })).toBeInTheDocument()
  })
})
