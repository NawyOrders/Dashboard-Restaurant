import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationFeed, NotificationItem } from '../api/notifications'
import { playChime } from './chime'
import { useNotifications, type NotificationsApi } from './useNotifications'

const hubMock = vi.hoisted(() => ({
  createOrdersHub: vi.fn(),
}))
vi.mock('../realtime/ordersHub', () => ({ createOrdersHub: hubMock.createOrdersHub }))
vi.mock('./chime', () => ({ playChime: vi.fn(), unlockAudio: vi.fn(), readMuted: () => false, writeMuted: vi.fn() }))

type Captured = {
  onOrderPlaced: (payload: unknown) => void
  handlers: {
    onPaymentProof: (payload: unknown) => void
    onAlertResolved: (payload: unknown) => void
    onStateChange: (status: 'live' | 'reconnecting' | 'offline') => void
    onReconnected: () => void
  }
}

let captured: Captured
const start = vi.fn(async () => {})
const stop = vi.fn(async () => {})

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
    createdAtUtc: '2026-11-28T09:12:00Z',
    createdAtLocal: '2026-11-28T11:12:00',
    ...overrides,
  }
}

function feed(items: NotificationItem[], overrides: Partial<NotificationFeed> = {}): NotificationFeed {
  return {
    items,
    unreadCount: items.filter((entry) => !entry.isRead).length,
    nextCursor: null,
    hasMore: false,
    timeZoneId: 'Africa/Cairo',
    ...overrides,
  }
}

function makeApi(first: NotificationFeed) {
  const listNotifications = vi.fn(async () => first)
  const markNotificationRead = vi.fn(async () => {})
  const markAllNotificationsRead = vi.fn(async () => {})
  return { api: { listNotifications, markNotificationRead, markAllNotificationsRead } as NotificationsApi, listNotifications, markNotificationRead, markAllNotificationsRead }
}

const hubConfig = { baseUrl: 'https://api.test', getAccessToken: () => 'token' }

beforeEach(() => {
  vi.mocked(playChime).mockClear()
  start.mockClear()
  stop.mockClear()
  hubMock.createOrdersHub.mockImplementation((_url, _token, onOrderPlaced, handlers) => {
    captured = { onOrderPlaced, handlers }
    return { start, stop }
  })
})

afterEach(() => {
  hubMock.createOrdersHub.mockReset()
})

describe('useNotifications', () => {
  it('hydrates from the inbox and reports the hub status', async () => {
    const { api } = makeApi(feed([row(), row({ notificationId: 'ntf-2', eventId: 'evt-2' })]))
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true }))

    await waitFor(() => expect(result.current.state.items).toHaveLength(2))
    expect(result.current.state.unreadCount).toBe(2)
    // The dot turns live as soon as the hub handshake lands, without waiting for
    // the first event to arrive.
    await waitFor(() => expect(result.current.status).toBe('live'))

    act(() => captured.handlers.onStateChange('reconnecting'))
    expect(result.current.status).toBe('reconnecting')
    act(() => captured.handlers.onStateChange('live'))
    expect(result.current.status).toBe('live')
  })

  it('stays at zero with no api', async () => {
    const { result } = renderHook(() => useNotifications({ api: null, hub: null, muted: true }))
    await waitFor(() => expect(result.current.state.items).toEqual([]))
    expect(result.current.status).toBe('offline')
    expect(hubMock.createOrdersHub).not.toHaveBeenCalled()
  })

  it('adds a live order once and calls the alert callback', async () => {
    const { api } = makeApi(feed([]))
    const onAlert = vi.fn()
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true, onAlert }))
    await waitFor(() => expect(hubMock.createOrdersHub).toHaveBeenCalled())

    const payload = { eventId: 'evt-live', orderId: 'ord-live', orderNumber: 'ORD-2900', total: 210, placedAtUtc: '2026-11-28T12:30:00Z' }
    act(() => captured.onOrderPlaced(payload))
    await waitFor(() => expect(result.current.state.items).toHaveLength(1))
    expect(result.current.state.unreadCount).toBe(1)
    expect(onAlert).toHaveBeenCalledTimes(1)
    expect(playChime).not.toHaveBeenCalled()

    act(() => captured.onOrderPlaced(payload))
    expect(result.current.state.items).toHaveLength(1)
    expect(onAlert).toHaveBeenCalledTimes(1)
  })

  it('chimes for a live alert unless the user muted it', async () => {
    const { api } = makeApi(feed([]))
    renderHook(() => useNotifications({ api, hub: hubConfig, muted: false }))
    await waitFor(() => expect(hubMock.createOrdersHub).toHaveBeenCalled())
    act(() => captured.handlers.onPaymentProof({ eventId: 'evt-proof', orderId: 'ord-proof', submittedAtUtc: '2026-11-28T12:30:00Z' }))
    await waitFor(() => expect(playChime).toHaveBeenCalledTimes(1))
  })

  it('marks a resolved order read and tells the caller', async () => {
    const { api } = makeApi(feed([row()]))
    const onResolved = vi.fn()
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true, onResolved }))
    await waitFor(() => expect(result.current.state.items).toHaveLength(1))

    act(() => captured.handlers.onAlertResolved({ orderId: 'ord-1' }))
    expect(result.current.state.items[0].isRead).toBe(true)
    expect(onResolved).toHaveBeenCalledWith('ord-1')
  })

  it('catches up after a reconnect using the newest timestamp', async () => {
    const { api, listNotifications } = makeApi(feed([row()]))
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true }))
    await waitFor(() => expect(result.current.state.items).toHaveLength(1))

    listNotifications.mockResolvedValueOnce(
      feed([row({ notificationId: 'ntf-2', eventId: 'evt-2', createdAtUtc: '2026-11-28T13:00:00Z' })], { unreadCount: 2 }),
    )
    act(() => captured.handlers.onReconnected())
    await waitFor(() => expect(result.current.state.items).toHaveLength(2))
    expect(listNotifications).toHaveBeenLastCalledWith({ sinceUtc: '2026-11-28T09:12:00Z', pageSize: 50 })
    expect(result.current.state.items[0].notificationId).toBe('ntf-2')
  })

  it('reads optimistically and posts the receipt', async () => {
    const { api, markNotificationRead } = makeApi(feed([row(), row({ notificationId: 'ntf-2', eventId: 'evt-2' })]))
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true }))
    await waitFor(() => expect(result.current.state.unreadCount).toBe(2))

    act(() => result.current.markRead('ntf-2'))
    expect(result.current.state.unreadCount).toBe(1)
    expect(result.current.state.items.find((entry) => entry.notificationId === 'ntf-2')?.isRead).toBe(true)
    expect(markNotificationRead).toHaveBeenCalledWith('ntf-2')
  })

  it('clears the badge and posts read-all', async () => {
    const { api, markAllNotificationsRead } = makeApi(feed([row(), row({ notificationId: 'ntf-2', eventId: 'evt-2' })]))
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true }))
    await waitFor(() => expect(result.current.state.unreadCount).toBe(2))

    act(() => result.current.markAllRead())
    expect(result.current.state.unreadCount).toBe(0)
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it('loads an older page by cursor and stops when there is none', async () => {
    const { api, listNotifications } = makeApi(feed([row()], { nextCursor: 'c-2', hasMore: true }))
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true }))
    await waitFor(() => expect(result.current.state.hasMore).toBe(true))

    listNotifications.mockResolvedValueOnce(
      feed([row({ notificationId: 'ntf-0', eventId: 'evt-0', createdAtUtc: '2026-11-27T09:00:00Z' })], { unreadCount: 2 }),
    )
    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.state.items).toHaveLength(2))
    expect(listNotifications).toHaveBeenLastCalledWith({ cursor: 'c-2', pageSize: 20 })
    expect(result.current.state.items[1].notificationId).toBe('ntf-0')
  })

  it('retries a failed handshake instead of going straight to offline', async () => {
    const { api } = makeApi(feed([]))
    start.mockRejectedValueOnce(new Error('negotiate failed'))
    const { result } = renderHook(() => useNotifications({ api, hub: hubConfig, muted: true }))
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))
    // Still trying, not given up.
    expect(result.current.status).toBe('reconnecting')
    await waitFor(() => expect(result.current.status).toBe('live'), { timeout: 6000 })
    expect(start).toHaveBeenCalledTimes(2)
  })

  it('keeps the bell empty when the inbox request fails', async () => {
    const { api } = makeApi(feed([]))
    ;(api.listNotifications as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useNotifications({ api, hub: null, muted: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state.items).toEqual([])
  })
})
