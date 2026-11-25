import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import BranchesPage from './BranchesPage'

const t = translations.en
const b = manageCopy.en.branches
const ALL = [PERMISSIONS.branchesView, PERMISSIONS.branchesManage]

function setup(permissions: readonly string[] = ALL) {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  render(<BranchesPage t={t} lang="en" api={api} permissions={permissions} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

describe('branches screen', () => {
  it('shows no access without branch permissions', async () => {
    setup([PERMISSIONS.menuView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('lists branches and hides write controls for view-only users', async () => {
    setup([PERMISSIONS.branchesView])
    expect(await screen.findByText('Main Branch')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: b.add })).toBeNull()
    expect(screen.getByLabelText(b.baseFee)).toBeDisabled()
  })

  it('validates required fields, then creates a branch', async () => {
    const { api, user, onToast } = setup()
    const create = vi.spyOn(api, 'createBranch')
    await user.click(await screen.findByRole('button', { name: b.add }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getAllByRole('button', { name: manageCopy.en.save })[0])
    expect(await within(dialog).findByText(b.invalid)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText(b.nameAr), 'فرع جديد')
    await user.type(within(dialog).getByLabelText(b.nameEn), 'New Branch')
    await user.type(within(dialog).getByLabelText(b.address), '5 Nile St')
    await user.click(within(dialog).getAllByRole('button', { name: manageCopy.en.save })[0])
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][0]).toMatchObject({ nameEn: 'New Branch', address: '5 Nile St' })
    expect(await screen.findByText('New Branch')).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith(manageCopy.en.saved)
  })

  it('saves delivery settings', async () => {
    const { api, user, onToast } = setup()
    const update = vi.spyOn(api, 'updateDeliverySettings')
    const base = await screen.findByLabelText(b.baseFee)
    await user.clear(base)
    await user.type(base, '25')
    await user.click(screen.getByRole('button', { name: b.saveDelivery }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ baseDeliveryFee: 25 })))
    expect(onToast).toHaveBeenCalledWith(manageCopy.en.saved)
  })
})
