import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NotificationItem } from '../api/notifications'
import { translations } from '../i18n'
import { NotificationsToasts } from './NotificationsDrawer'

const t = translations.ar

afterEach(cleanup)

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    notificationId: 'ntf-1',
    eventId: 'evt-1',
    type: 'OrderPlaced',
    isRead: false,
    readAtUtc: null,
    orderId: 'ord-1',
    orderNumber: 'ORD-2841',
    displayOrderNumber: '#2841',
    branchId: 'br-1',
    branchName: 'فرع',
    branchNameEn: 'Branch',
    customerName: 'Mona',
    fulfilmentType: 'Pickup',
    distinctItemsCount: 1,
    totalItemsQuantity: 1,
    total: 100,
    currency: 'EGP',
    paymentMethod: 'InstaPay',
    requiresPaymentProof: false,
    createdAtUtc: new Date(Date.now() - 60_000).toISOString(),
    createdAtLocal: '',
    ...overrides,
  }
}

function renderToasts(alerts: NotificationItem[], overrides: Partial<React.ComponentProps<typeof NotificationsToasts>> = {}) {
  const props: React.ComponentProps<typeof NotificationsToasts> = {
    t,
    lang: 'ar',
    alerts,
    permissions: ['orders.view', 'orders.accept', 'orders.reject'],
    onDismiss: vi.fn(),
    onView: vi.fn(),
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onOpenAll: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<NotificationsToasts {...props} />) }
}

describe('NotificationsToasts', () => {
  it('renders nothing without alerts', () => {
    const { container } = renderToasts([])
    expect(container.textContent).toBe('')
  })

  it('stacks two alerts and counts the rest', () => {
    const alerts = [item(), item({ notificationId: 'ntf-2', eventId: 'evt-2', orderNumber: 'ORD-2842' }), item({ notificationId: 'ntf-3', eventId: 'evt-3', orderNumber: 'ORD-2843' })]
    const { props } = renderToasts(alerts)
    expect(screen.getByText(/ORD-2841/)).toBeTruthy()
    expect(screen.getByText(/ORD-2842/)).toBeTruthy()
    expect(screen.queryByText(/ORD-2843/)).toBeNull()
    const more = screen.getByText(t.notifications.moreAlerts.replace('{n}', '1'))
    fireEvent.click(more)
    expect(props.onOpenAll).toHaveBeenCalledTimes(1)
  })

  it('acts on the alert that was clicked, not the first one', () => {
    const alerts = [item(), item({ notificationId: 'ntf-2', eventId: 'evt-2', orderNumber: 'ORD-2842' })]
    const { props } = renderToasts(alerts)
    const acceptButtons = screen.getAllByText(t.notifications.accept)
    fireEvent.click(acceptButtons[1])
    expect(props.onAccept).toHaveBeenCalledWith(expect.objectContaining({ notificationId: 'ntf-2' }))
    fireEvent.click(screen.getAllByLabelText(t.notifications.close)[0])
    expect(props.onDismiss).toHaveBeenCalledWith('ntf-1')
  })

  it('hides the accept and reject buttons without the permissions', () => {
    renderToasts([item()], { permissions: ['orders.view'] })
    expect(screen.queryByText(t.notifications.accept)).toBeNull()
    expect(screen.queryByText(t.notifications.reject)).toBeNull()
  })
})
