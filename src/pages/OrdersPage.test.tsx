import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { translations } from '../i18n'
import OrdersPage from './OrdersPage'

describe('live orders board', () => {
  it('moves a new order into the preparing column after accepting it', async () => {
    const t = translations.ar
    const api = createMockApi({ latencyMs: 0 })
    const transition = vi.spyOn(api, 'transitionOrderStatus')
    const onToast = vi.fn()
    const user = userEvent.setup()

    render(<OrdersPage t={t} lang="ar" api={api} onToast={onToast} />)

    const target = t.liveOrders.itemsList.find((order) => order.status === 'new')
    expect(target).toBeDefined()
    if (!target) return

    const newColumn = screen.getByRole('region', { name: t.liveOrders.columns.new })
    const card = within(newColumn).getByRole('heading', { name: target.customer }).closest('article')
    expect(card).not.toBeNull()
    if (!card) return

    await user.click(within(card).getByRole('button', { name: t.liveOrders.accept }))

    await waitFor(() => expect(transition).toHaveBeenCalledWith(target.id, 2))
    await waitFor(() => expect(within(newColumn).queryByRole('heading', { name: target.customer })).not.toBeInTheDocument())

    const preparingColumn = screen.getByRole('region', { name: t.liveOrders.columns.preparing })
    expect(within(preparingColumn).getByRole('heading', { name: target.customer })).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith(t.liveOrders.moved)
  })
})
