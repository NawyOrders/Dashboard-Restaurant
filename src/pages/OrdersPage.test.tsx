import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { translations } from '../i18n'
import { createMockSession } from '../mockAuth'
import OrdersPage from './OrdersPage'

const t = translations.ar
// The board's action buttons are RBAC-gated; these tests exercise them as
// order staff, who hold accept/reject/status-update by default.
const ORDER_STAFF_PERMISSIONS = createMockSession('Staff').user.permissions

function setup() {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  const user = userEvent.setup()
  render(<OrdersPage t={t} lang="ar" api={api} permissions={ORDER_STAFF_PERMISSIONS} onToast={onToast} />)
  return { api, onToast, user }
}

describe('live orders board', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the API orders into their status columns', async () => {
    setup()
    const newColumn = screen.getByRole('region', { name: t.liveOrders.columns.new })
    expect(await within(newColumn).findByRole('heading', { name: 'منى عبد الله' })).toBeInTheDocument()
    const preparingColumn = screen.getByRole('region', { name: t.liveOrders.columns.preparing })
    expect(within(preparingColumn).getByRole('heading', { name: 'Ahmed Hassan' })).toBeInTheDocument()
    const deliveredColumn = screen.getByRole('region', { name: t.liveOrders.columns.delivered })
    expect(within(deliveredColumn).getByRole('heading', { name: 'نور خالد' })).toBeInTheDocument()
  })

  it('loads order details into the new-column card', async () => {
    setup()
    const newColumn = screen.getByRole('region', { name: t.liveOrders.columns.new })
    expect(await within(newColumn).findByText('+201001234567')).toBeInTheDocument()
  })

  it('accepts a new order through the accept endpoint and moves it to preparing', async () => {
    const { api, onToast, user } = setup()
    const acceptOrder = vi.spyOn(api, 'acceptOrder')

    const newColumn = screen.getByRole('region', { name: t.liveOrders.columns.new })
    const card = (await within(newColumn).findByRole('heading', { name: 'منى عبد الله' })).closest('article')
    expect(card).not.toBeNull()
    if (!card) return

    await user.click(within(card).getByRole('button', { name: t.liveOrders.accept }))

    await waitFor(() => expect(acceptOrder).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101'))
    await waitFor(() => expect(within(newColumn).queryByRole('heading', { name: 'منى عبد الله' })).not.toBeInTheDocument())
    const preparingColumn = screen.getByRole('region', { name: t.liveOrders.columns.preparing })
    expect(within(preparingColumn).getByRole('heading', { name: 'منى عبد الله' })).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith(t.liveOrders.moved)
  })

  it('rejects a new order with a reason through the reject endpoint', async () => {
    const { api, onToast, user } = setup()
    const rejectOrder = vi.spyOn(api, 'rejectOrder')
    vi.stubGlobal('prompt', vi.fn(() => ' خارج نطاق التوصيل '))

    const newColumn = screen.getByRole('region', { name: t.liveOrders.columns.new })
    const card = (await within(newColumn).findByRole('heading', { name: 'منى عبد الله' })).closest('article')
    expect(card).not.toBeNull()
    if (!card) return

    await user.click(within(card).getByRole('button', { name: t.liveOrders.reject }))

    await waitFor(() => expect(rejectOrder).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101', 'خارج نطاق التوصيل'))
    await waitFor(() => expect(within(newColumn).queryByRole('heading', { name: 'منى عبد الله' })).not.toBeInTheDocument())
    expect(onToast).toHaveBeenCalledWith(t.liveOrders.rejected)
  })

  it('does not reject when the reason is left empty', async () => {
    const { api, user } = setup()
    const rejectOrder = vi.spyOn(api, 'rejectOrder')
    vi.stubGlobal('prompt', vi.fn(() => '   '))

    const newColumn = screen.getByRole('region', { name: t.liveOrders.columns.new })
    const card = (await within(newColumn).findByRole('heading', { name: 'منى عبد الله' })).closest('article')
    expect(card).not.toBeNull()
    if (!card) return

    await user.click(within(card).getByRole('button', { name: t.liveOrders.reject }))
    expect(rejectOrder).not.toHaveBeenCalled()
    expect(within(newColumn).getByRole('heading', { name: 'منى عبد الله' })).toBeInTheDocument()
  })

  it('advances an accepted order through preparing and ready with the state-machine codes', async () => {
    const { api, user } = setup()
    const transition = vi.spyOn(api, 'transitionOrderStatus')

    const preparingColumn = screen.getByRole('region', { name: t.liveOrders.columns.preparing })
    const card = (await within(preparingColumn).findByRole('heading', { name: 'Ahmed Hassan' })).closest('article')
    expect(card).not.toBeNull()
    if (!card) return

    // Accepted (1) -> Preparing (3)
    await user.click(within(card).getByRole('button', { name: t.liveOrders.preparing }))
    await waitFor(() => expect(transition).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000102', 3))

    // Preparing (3) -> Ready (4): the card stays in the preparing column until ready
    const readyColumn = screen.getByRole('region', { name: t.liveOrders.columns.ready })
    await waitFor(() => expect(within(card).queryByRole('button', { name: t.liveOrders.markReady })).toBeInTheDocument())
    await user.click(within(card).getByRole('button', { name: t.liveOrders.markReady }))
    await waitFor(() => expect(transition).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000102', 4))
    await waitFor(() => expect(within(readyColumn).getByRole('heading', { name: 'Ahmed Hassan' })).toBeInTheDocument())
  })

  it('shows a retry action when loading orders fails', async () => {
    const api = createMockApi({ latencyMs: 0, fail: true })
    render(<OrdersPage t={t} lang="ar" api={api} onToast={vi.fn()} />)
    expect(await screen.findByText(t.liveOrders.loadError)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.actions.retry })).toBeInTheDocument()
  })
})
