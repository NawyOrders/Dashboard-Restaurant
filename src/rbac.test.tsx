import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from './api/mockApi'
import type { AdminOrderListItem, Api, PagedResult } from './api'
import { can, canAny, PERMISSIONS } from './authz'
import { translations } from './i18n'
import { createMockSession } from './mockAuth'
import OrdersPage from './pages/OrdersPage'

const t = translations.en

describe('authz helpers', () => {
  it('grants a permission only when the session lists its key', () => {
    expect(can([PERMISSIONS.ordersAccept], PERMISSIONS.ordersAccept)).toBe(true)
    expect(can([PERMISSIONS.ordersAccept], PERMISSIONS.ordersReject)).toBe(false)
    expect(can([], PERMISSIONS.ordersAccept)).toBe(false)
    expect(can(undefined, PERMISSIONS.ordersAccept)).toBe(false)
    expect(can(null, PERMISSIONS.ordersAccept)).toBe(false)
  })

  it('canAny grants when at least one key is present', () => {
    expect(canAny([PERMISSIONS.menuAvailability], PERMISSIONS.menuEdit, PERMISSIONS.menuAvailability)).toBe(true)
    expect(canAny([PERMISSIONS.menuView], PERMISSIONS.menuEdit, PERMISSIONS.menuAvailability)).toBe(false)
  })
})

describe('mock sessions follow the reference RBAC matrix', () => {
  it('Owner receives every permission', () => {
    const session = createMockSession('Owner')
    expect(session.user.permissions).toHaveLength(Object.keys(PERMISSIONS).length)
  })

  it('OrderStaff gets the matrix defaults without manager-only keys', () => {
    const session = createMockSession('Staff')
    const permissions = session.user.permissions
    expect(permissions).toContain(PERMISSIONS.ordersAccept)
    expect(permissions).toContain(PERMISSIONS.ordersReject)
    expect(permissions).toContain(PERMISSIONS.ordersStatusUpdate)
    expect(permissions).not.toContain(PERMISSIONS.ordersCancel)
    expect(permissions).not.toContain(PERMISSIONS.menuAvailability)
    expect(permissions).not.toContain(PERMISSIONS.staffManage)
    expect(permissions).not.toContain(PERMISSIONS.restaurantSettingsManage)
    expect(permissions).not.toContain(PERMISSIONS.reportsFinancialView)
  })

  it('BranchManager adds availability, cancel, staff and branch management', () => {
    const session = createMockSession('Manager')
    const permissions = session.user.permissions
    expect(permissions).toContain(PERMISSIONS.ordersCancel)
    expect(permissions).toContain(PERMISSIONS.menuAvailability)
    expect(permissions).toContain(PERMISSIONS.staffManage)
    expect(permissions).toContain(PERMISSIONS.branchesManage)
    expect(permissions).not.toContain(PERMISSIONS.menuEdit)
    expect(permissions).not.toContain(PERMISSIONS.restaurantSettingsManage)
  })
})

function renderOrdersPage(permissions: string[], api?: Api) {
  const onToast = vi.fn()
  render(
    <OrdersPage
      t={t}
      lang="en"
      api={api ?? createMockApi({ latencyMs: 0 })}
      permissions={permissions}
      onToast={onToast}
    />,
  )
  return onToast
}

const ORDER_STAFF_PERMISSIONS = createMockSession('Staff').user.permissions

describe('OrdersPage RBAC gating', () => {
  it('shows accept, reject and advance actions for order staff', async () => {
    renderOrdersPage(ORDER_STAFF_PERMISSIONS)
    await waitFor(() => expect(screen.getByText('#ORD-2841')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Accept order' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject order' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Preparing' }).length).toBeGreaterThan(0)
  })

  it('hides accept and reject without the matching permissions', async () => {
    renderOrdersPage([PERMISSIONS.ordersView, PERMISSIONS.ordersStatusUpdate])
    await waitFor(() => expect(screen.getByText('#ORD-2841')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Accept order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject order' })).not.toBeInTheDocument()
  })

  it('hides status transitions without orders.status.update', async () => {
    renderOrdersPage([PERMISSIONS.ordersView, PERMISSIONS.ordersAccept, PERMISSIONS.ordersReject])
    await waitFor(() => expect(screen.getByText('#ORD-2840')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Preparing' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ready for delivery' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deliver order' })).not.toBeInTheDocument()
  })

  it('hides every action for a view-only session', async () => {
    renderOrdersPage([PERMISSIONS.ordersView])
    await waitFor(() => expect(screen.getByText('#ORD-2841')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Accept order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Preparing' })).not.toBeInTheDocument()
  })
})

function confirmedPaymentApi(): Api {
  const order: AdminOrderListItem = {
    orderId: '00000000-0000-4000-8000-000000000201',
    orderNumber: 'ORD-2900',
    status: 0,
    fulfilmentType: 0,
    branchId: '00000000-0000-4000-8000-0000000000bb',
    customerName: 'Test Customer',
    total: 120,
    vatAmount: 16.8,
    createdAtUtc: '2026-11-25T09:00:00Z',
    paymentMethod: 1,
    paymentStatus: 3,
  }
  const base = createMockApi({ latencyMs: 0 })
  base.listOrders = (): Promise<PagedResult<AdminOrderListItem>> =>
    Promise.resolve({ items: [order], totalCount: 1, page: 1, pageSize: 100, totalPages: 1, hasPreviousPage: false, hasNextPage: false })
  return base
}

describe('payment receipt gating', () => {
  it('shows the receipt link with payments.view', async () => {
    renderOrdersPage([PERMISSIONS.ordersView, PERMISSIONS.paymentsView], confirmedPaymentApi())
    await waitFor(() => expect(screen.getByText('#ORD-2900')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'View payment receipt' })).toBeInTheDocument()
  })

  it('hides the receipt link without payments.view', async () => {
    renderOrdersPage([PERMISSIONS.ordersView], confirmedPaymentApi())
    await waitFor(() => expect(screen.getByText('#ORD-2900')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'View payment receipt' })).not.toBeInTheDocument()
  })
})
