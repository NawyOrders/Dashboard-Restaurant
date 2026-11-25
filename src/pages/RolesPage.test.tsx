import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import RolesPage from './RolesPage'

const t = translations.en
const r = manageCopy.en.roles

function setup(permissions: readonly string[] = [PERMISSIONS.staffManage]) {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  render(<RolesPage t={t} lang="en" api={api} permissions={permissions} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

describe('roles screen', () => {
  it('shows no access without staff.manage', async () => {
    setup([PERMISSIONS.staffView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('lists roles and offers no edit for protected ones', async () => {
    setup()
    expect(await screen.findByText('OrderStaff')).toBeInTheDocument()
    const owner = screen.getByText('Owner', { selector: 'h3' }).closest('li')!
    expect(within(owner).queryByRole('button', { name: manageCopy.en.edit })).toBeNull()
  })

  it('validates, creates a custom role with chosen permissions, then edits and deletes it', async () => {
    const { api, user, onToast } = setup()
    const create = vi.spyOn(api, 'createRole')
    await user.click(await screen.findByRole('button', { name: r.add }))
    let dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    expect(await within(dialog).findByText(r.invalid)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText(r.name), 'Cashier')
    await user.click(within(dialog).getByLabelText(new RegExp(PERMISSIONS.ordersView.replace('.', '\\.'))))
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][0]).toMatchObject({ name: 'Cashier', permissionKeys: [PERMISSIONS.ordersView] })
    expect(onToast).toHaveBeenCalledWith(manageCopy.en.saved)

    const replace = vi.spyOn(api, 'replaceRolePermissions')
    const remove = vi.spyOn(api, 'deleteRole')
    const card = (await screen.findByText('Cashier', { selector: 'h3' })).closest('li')!
    await user.click(within(card).getByRole('button', { name: manageCopy.en.edit }))
    dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1))

    const card2 = (await screen.findByText('Cashier', { selector: 'h3' })).closest('li')!
    await user.click(within(card2).getByRole('button', { name: manageCopy.en.edit }))
    dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.delete }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.confirmDelete }))
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
  })
})
