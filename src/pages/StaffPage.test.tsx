import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import StaffPage from './StaffPage'

const t = translations.en
const s = manageCopy.en.staff
const ALL = [PERMISSIONS.staffView, PERMISSIONS.staffManage]

function setup(permissions: readonly string[] = ALL, seed?: (api: ReturnType<typeof createMockApi>) => Promise<void>) {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  const ready = seed ? seed(api) : Promise.resolve()
  return ready.then(() => {
    render(<StaffPage t={t} lang="en" api={api} permissions={permissions} onToast={onToast} />)
    return { api, onToast, user: userEvent.setup() }
  })
}

describe('staff screen', () => {
  it('shows no access without staff permissions', async () => {
    await setup([PERMISSIONS.menuView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('lists staff and hides write controls for view-only users', async () => {
    await setup([PERMISSIONS.staffView])
    expect(await screen.findByText('Demo Owner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: s.invite })).toBeNull()
  })

  it('validates the invitation, then invites and lists the new member', async () => {
    const { api, user, onToast } = await setup()
    const invite = vi.spyOn(api, 'inviteStaff')
    await user.click(await screen.findByRole('button', { name: s.invite }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    expect(await within(dialog).findByText(s.invalid)).toBeInTheDocument()
    expect(invite).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText(s.fullName), 'Sara Ali')
    await user.type(within(dialog).getByLabelText(s.email), 'sara@example.com')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(invite).toHaveBeenCalledTimes(1))
    expect(invite.mock.calls[0][0]).toMatchObject({ fullName: 'Sara Ali', email: 'sara@example.com' })
    expect(await screen.findByText('Sara Ali')).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith(s.invited)
  })

  it('resends an invitation and deletes with a confirm step', async () => {
    const { api, user } = await setup(ALL, async (seedApi) => {
      await seedApi.inviteStaff({ fullName: 'Omar Z', email: 'omar@example.com', roleId: (await seedApi.listRoles()).find((r) => r.kind !== 'Owner')!.id, branchIds: [(await seedApi.listBranches()).items[0].id] })
    })
    const resend = vi.spyOn(api, 'resendStaffInvitation')
    const remove = vi.spyOn(api, 'deleteStaff')
    await user.click(await screen.findByRole('button', { name: s.resend }))
    await waitFor(() => expect(resend).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: manageCopy.en.delete }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: manageCopy.en.confirmDelete }))
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText('Omar Z')).toBeNull())
  })
})
