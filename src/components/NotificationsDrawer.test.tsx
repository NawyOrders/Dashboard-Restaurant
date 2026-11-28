import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NotificationItem } from '../api/notifications'
import { translations } from '../i18n'
import type { NotificationState } from '../notifications/model'
import { LiveAlertToast, NotificationsDrawer, notificationBody, notificationTitle, relativeTime } from './NotificationsDrawer'

const t = translations.ar

afterEach(cleanup)

function row(overrides: Partial<NotificationItem> = {}): NotificationItem {
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
    branchName: 'فرع محطة الرمل',
    branchNameEn: 'Mahattat El Raml',
    customerName: 'Mona',
    fulfilmentType: 'Pickup',
    distinctItemsCount: 2,
    totalItemsQuantity: 3,
    total: 148.5,
    currency: 'EGP',
    paymentMethod: 'InstaPay',
    requiresPaymentProof: true,
    createdAtUtc: new Date(Date.now() - 3 * 60_000).toISOString(),
    createdAtLocal: '2026-11-28T11:12:00',
    ...overrides,
  }
}

function state(items: NotificationItem[], overrides: Partial<NotificationState> = {}): NotificationState {
  return {
    items,
    unreadCount: items.filter((item) => !item.isRead).length,
    nextCursor: null,
    hasMore: false,
    seenEventIds: new Set(items.map((item) => item.eventId)),
    lastSeenUtc: items[0]?.createdAtUtc ?? null,
    ...overrides,
  }
}

function drawer(overrides: Partial<React.ComponentProps<typeof NotificationsDrawer>> = {}) {
  const props: React.ComponentProps<typeof NotificationsDrawer> = {
    t,
    lang: 'ar',
    open: true,
    state: state([row()]),
    status: 'live',
    loading: false,
    muted: false,
    permissions: ['orders.view'],
    onClose: vi.fn(),
    onMarkRead: vi.fn(),
    onMarkAllRead: vi.fn(),
    onLoadMore: vi.fn(),
    onOpenOrder: vi.fn(),
    onToggleMuted: vi.fn(),
    systemPermission: 'granted' as const,
    ...overrides,
  }
  return { props, ...render(<NotificationsDrawer {...props} />) }
}

describe('relativeTime', () => {
  it('reads minutes, hours and days', () => {
    const now = Date.parse('2026-11-28T12:00:00Z')
    expect(relativeTime('2026-11-28T11:58:00Z', 'en', now)).toMatch(/2 minutes ago/)
    expect(relativeTime('2026-11-28T09:00:00Z', 'en', now)).toMatch(/3 hours ago/)
    expect(relativeTime('2026-11-26T12:00:00Z', 'en', now)).toMatch(/2 days ago/)
    expect(relativeTime('not a date', 'en', now)).toBe('')
  })
})

describe('notification copy', () => {
  it('names the two event kinds', () => {
    expect(notificationTitle(row(), t.notifications)).toBe(t.notifications.orderPlaced)
    expect(notificationTitle(row({ type: 'PaymentProofSubmitted' }), t.notifications)).toBe(t.notifications.proofSubmitted)
  })

  it('builds the body from the real fields', () => {
    expect(notificationBody(row())).toBe('Mona · فرع محطة الرمل · 148.5 EGP')
    expect(notificationBody(row({ customerName: '', branchName: '' }))).toBe('148.5 EGP')
  })
})

describe('NotificationsDrawer', () => {
  it('renders nothing while closed', () => {
    const { container } = drawer({ open: false })
    expect(container.textContent).toBe('')
  })

  it('shows the empty state', () => {
    drawer({ state: state([]) })
    expect(screen.getByText(t.notifications.empty)).toBeTruthy()
  })

  it('lists an item with its order number, items count and live status', () => {
    const { container } = drawer()
    expect(screen.getByText(/ORD-2841/)).toBeTruthy()
    expect(container.textContent).toContain(t.notifications.live)
    expect(container.textContent).toContain(`2 ${t.notifications.itemsCount}`)
  })

  it('marks an item read and opens the order when the staff may view orders', () => {
    const { props } = drawer()
    fireEvent.click(screen.getByText(/ORD-2841/).closest('button')!)
    expect(props.onMarkRead).toHaveBeenCalledWith('ntf-1')
    expect(props.onOpenOrder).toHaveBeenCalledTimes(1)
  })

  it('marks read without navigating when orders.view is missing', () => {
    const { props } = drawer({ permissions: [] })
    fireEvent.click(screen.getByText(/ORD-2841/).closest('button')!)
    expect(props.onMarkRead).toHaveBeenCalledWith('ntf-1')
    expect(props.onOpenOrder).not.toHaveBeenCalled()
  })

  it('offers mark-all-read only while something is unread', () => {
    const { props } = drawer({ state: state([row(), row({ notificationId: 'ntf-2', eventId: 'evt-2' })]) })
    fireEvent.click(screen.getByText(t.notifications.markAllRead))
    expect(props.onMarkAllRead).toHaveBeenCalledTimes(1)
    cleanup()
    drawer({ state: state([row({ isRead: true })]) })
    expect(screen.queryByText(t.notifications.markAllRead)).toBeNull()
  })

  it('toggles the mute button and reports its pressed state', () => {
    const { props } = drawer({ muted: true })
    const button = screen.getByText(t.notifications.unmute)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(props.onToggleMuted).toHaveBeenCalledTimes(1)
    cleanup()
    drawer({ muted: false })
    expect(screen.getByText(t.notifications.mute).getAttribute('aria-pressed')).toBe('false')
  })

  it('closes on the backdrop button and on Escape', () => {
    const { props } = drawer()
    fireEvent.click(screen.getAllByLabelText(t.notifications.close)[0])
    expect(props.onClose).toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })

  it('loads an older page only when one exists', () => {
    const { props } = drawer({ state: state([row()], { hasMore: true, nextCursor: 'c-2' }) })
    fireEvent.click(screen.getByText(t.notifications.loadMore))
    expect(props.onLoadMore).toHaveBeenCalledTimes(1)
    cleanup()
    drawer()
    expect(screen.queryByText(t.notifications.loadMore)).toBeNull()
  })

  it('has no sound test button and no browser-alert switch', () => {
    drawer()
    expect(screen.queryByText(t.notifications.testSound)).toBeNull()
    expect(screen.queryByText(t.notifications.systemOn)).toBeNull()
    expect(screen.queryByText(t.notifications.systemOff)).toBeNull()
    cleanup()
    const blocked = drawer({ systemPermission: 'denied' })
    expect(blocked.container.textContent).toContain(t.notifications.systemBlocked)
    expect(blocked.container.querySelector('button[aria-pressed]')?.textContent).not.toContain(t.notifications.systemBlocked)
  })

  it('shows the reconnecting and offline states', () => {
    const reconnecting = drawer({ status: 'reconnecting' })
    expect(reconnecting.container.textContent).toContain(t.notifications.reconnecting)
    cleanup()
    const offline = drawer({ status: 'offline' })
    expect(offline.container.textContent).toContain(t.notifications.offline)
  })
})

describe('LiveAlertToast', () => {
  function toast(overrides: Partial<React.ComponentProps<typeof LiveAlertToast>> = {}) {
    const props: React.ComponentProps<typeof LiveAlertToast> = {
      t,
      lang: 'ar',
      item: row(),
      permissions: ['orders.view', 'orders.accept', 'orders.reject'],
      onDismiss: vi.fn(),
      onView: vi.fn(),
      onAccept: vi.fn(),
      onReject: vi.fn(),
      ...overrides,
    }
    return { props, ...render(<LiveAlertToast {...props} />) }
  }

  it('offers view, accept and reject when the staff holds both permissions', () => {
    const { props } = toast()
    expect(screen.getByText(/ORD-2841/)).toBeTruthy()
    fireEvent.click(screen.getByText(t.notifications.viewOrder))
    fireEvent.click(screen.getByText(t.notifications.accept))
    fireEvent.click(screen.getByText(t.notifications.reject))
    expect(props.onView).toHaveBeenCalledTimes(1)
    expect(props.onAccept).toHaveBeenCalledTimes(1)
    expect(props.onReject).toHaveBeenCalledTimes(1)
  })

  it('hides accept and reject from staff who may not decide orders', () => {
    toast({ permissions: ['orders.view'] })
    expect(screen.getByText(t.notifications.viewOrder)).toBeTruthy()
    expect(screen.queryByText(t.notifications.accept)).toBeNull()
    expect(screen.queryByText(t.notifications.reject)).toBeNull()
  })

  it('never offers accept or reject for a payment proof', () => {
    toast({ item: row({ type: 'PaymentProofSubmitted' }) })
    expect(screen.queryByText(t.notifications.accept)).toBeNull()
    expect(screen.queryByText(t.notifications.reject)).toBeNull()
  })

  it('dismisses from its close button', () => {
    const { props } = toast()
    fireEvent.click(screen.getByLabelText(t.notifications.close))
    expect(props.onDismiss).toHaveBeenCalledTimes(1)
  })
})
