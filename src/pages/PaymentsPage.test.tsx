import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import PaymentsPage from './PaymentsPage'

const t = translations.en
const p = manageCopy.en.payments
const ALL = [PERMISSIONS.restaurantSettingsView, PERMISSIONS.restaurantSettingsManage]

function setup(permissions: readonly string[] = ALL) {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  render(<PaymentsPage t={t} lang="en" api={api} permissions={permissions} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

describe('payment methods screen', () => {
  it('shows no access without settings permissions', async () => {
    setup([PERMISSIONS.menuView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('lists the three methods and is read only for view users', async () => {
    setup([PERMISSIONS.restaurantSettingsView])
    expect(await screen.findByText(p.methods.InstaPay)).toBeInTheDocument()
    expect(screen.getByText(p.methods.MobileWallet)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: p.save })).toBeNull()
  })

  it('keeps cash on and saves InstaPay with the method name', async () => {
    const { api, user, onToast } = setup()
    const update = vi.spyOn(api, 'updatePaymentMethod')
    await screen.findByText(p.methods.InstaPay)
    expect(screen.getByRole('switch', { name: `${p.methods.Cash}: ${p.enabled}` })).toBeDisabled()
    const account = screen.getByLabelText(p.account, { selector: '#InstaPay-account' })
    await user.clear(account)
    await user.type(account, 'shop@instapay')
    await user.click(screen.getAllByRole('button', { name: p.save })[1])
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update.mock.calls[0][0]).toBe('InstaPay')
    expect(update.mock.calls[0][1]).toMatchObject({ accountIdentifier: 'shop@instapay', requiresVerificationProof: true })
    expect(onToast).toHaveBeenCalledWith(manageCopy.en.saved)
  })

  it('blocks an empty name before calling the API', async () => {
    const { api, user } = setup()
    const update = vi.spyOn(api, 'updatePaymentMethod')
    await screen.findByText(p.methods.InstaPay)
    await user.clear(screen.getByLabelText(p.nameEn, { selector: '#InstaPay-name-en' }))
    await user.click(screen.getAllByRole('button', { name: p.save })[1])
    expect(await screen.findByRole('alert')).toHaveTextContent(p.invalid)
    expect(update).not.toHaveBeenCalled()
  })
})
