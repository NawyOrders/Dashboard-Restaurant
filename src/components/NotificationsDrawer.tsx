import { useEffect, useRef } from 'react'
import type { NotificationItem } from '../api/notifications'
import type { T } from '../i18n'
import { can, PERMISSIONS } from '../authz'
import { BellIcon, CheckCircleIcon, CloseIcon, ReceiptIcon } from '../icons'
import type { NotificationState } from '../notifications/model'
import type { NotificationsStatus } from '../notifications/useNotifications'

type Labels = T['notifications']

/** "منذ ٣ دقائق" / "3 minutes ago", without pulling in a date library. */
export function relativeTime(iso: string, lang: 'ar' | 'en', now = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.round((now - then) / 1000)
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-EG' : 'en', { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return rtf.format(-seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}

export function notificationTitle(item: NotificationItem, labels: Labels): string {
  return item.type === 'PaymentProofSubmitted' ? labels.proofSubmitted : labels.orderPlaced
}

export function notificationBody(item: NotificationItem): string {
  const parts = [item.customerName, item.branchName, `${item.total} ${item.currency}`]
  return parts.filter(Boolean).join(' · ')
}

type DrawerProps = {
  t: T
  lang: 'ar' | 'en'
  open: boolean
  state: NotificationState
  status: NotificationsStatus
  loading: boolean
  muted: boolean
  permissions: readonly string[]
  onClose: () => void
  onMarkRead: (notificationId: string) => void
  onMarkAllRead: () => void
  onLoadMore: () => void
  onOpenOrder: (item: NotificationItem) => void
  onToggleMuted: () => void
}

export function NotificationsDrawer({
  t,
  lang,
  open,
  state,
  status,
  loading,
  muted,
  permissions,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onLoadMore,
  onOpenOrder,
  onToggleMuted,
}: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const labels = t.notifications
  const canView = can(permissions, PERMISSIONS.ordersView)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const statusLabel =
    status === 'live' ? labels.live : status === 'reconnecting' ? labels.reconnecting : labels.offline

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={labels.title}>
      <button type="button" aria-label={labels.close} onClick={onClose} className="flex-1 bg-stone-900/30" />
      <aside
        dir={t.dir}
        className="flex h-full w-full max-w-[420px] flex-col border-s border-cream-100 bg-white shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b border-cream-100 px-4 py-3">
          <BellIcon className="h-5 w-5 text-brand-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-stone-800">{labels.title}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  status === 'live' ? 'bg-mint-600' : status === 'reconnecting' ? 'bg-gold-500' : 'bg-stone-400'
                }`}
                aria-hidden="true"
              />
              {statusLabel}
              {state.unreadCount > 0 ? ` · ${state.unreadCount} ${labels.unread}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleMuted}
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-stone-500 hover:bg-cream-50"
            aria-pressed={muted}
          >
            {muted ? labels.unmute : labels.mute}
          </button>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={labels.close} className="rounded-lg p-1.5 hover:bg-cream-50">
            <CloseIcon className="h-4 w-4 text-stone-500" />
          </button>
        </header>

        {state.unreadCount > 0 ? (
          <div className="flex justify-end border-b border-cream-50 px-4 py-2">
            <button type="button" onClick={onMarkAllRead} className="text-[11px] font-bold text-brand-700 hover:underline">
              {labels.markAllRead}
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm font-semibold text-stone-500">{labels.empty}</p>
          ) : (
            <ul className="divide-y divide-cream-50">
              {state.items.map((item) => (
                <li key={item.notificationId}>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkRead(item.notificationId)
                      if (canView) onOpenOrder(item)
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-cream-50 ${
                      item.isRead ? '' : 'bg-brand-50/40'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        item.type === 'PaymentProofSubmitted' ? 'bg-gold-50 text-gold-800' : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {item.type === 'PaymentProofSubmitted' ? (
                        <ReceiptIcon className="h-4 w-4" />
                      ) : (
                        <BellIcon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-extrabold text-stone-800">
                          {notificationTitle(item, labels)}
                        </span>
                        {item.isRead ? null : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-stone-600" dir="auto">
                        {item.orderNumber} · {notificationBody(item)}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-stone-500">
                        <span>{item.paymentMethod}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {item.distinctItemsCount} {labels.itemsCount}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{relativeTime(item.createdAtUtc, lang)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {state.hasMore ? (
            <div className="p-3">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loading}
                className="w-full rounded-xl border border-cream-100 py-2 text-xs font-bold text-stone-600 disabled:opacity-50"
              >
                {labels.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

type ToastProps = {
  t: T
  lang: 'ar' | 'en'
  item: NotificationItem
  permissions: readonly string[]
  onDismiss: () => void
  onView: () => void
  onAccept: () => void
  onReject: () => void
}

/**
 * The live alert. It carries the actions a cashier actually needs, and only the
 * ones their session allows: the backend enforces the same permissions, so
 * showing a button the staff cannot use would only produce a 403.
 */
export function LiveAlertToast({ t, lang, item, permissions, onDismiss, onView, onAccept, onReject }: ToastProps) {
  const labels = t.notifications
  const canAccept = can(permissions, PERMISSIONS.ordersAccept) && item.type === 'OrderPlaced'
  const canReject = can(permissions, PERMISSIONS.ordersReject) && item.type === 'OrderPlaced'

  return (
    <div
      dir={t.dir}
      role="status"
      className="fixed bottom-5 start-5 z-[60] w-[min(92vw,380px)] rounded-2xl border border-cream-100 bg-white p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          {item.type === 'PaymentProofSubmitted' ? <ReceiptIcon className="h-5 w-5" /> : <BellIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-stone-800">
            {notificationTitle(item, labels)} · {item.orderNumber}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-stone-600" dir="auto">
            {notificationBody(item)}
          </p>
          <p className="mt-1 text-[11px] text-stone-500">
            {item.paymentMethod} · {item.distinctItemsCount} {labels.itemsCount} · {relativeTime(item.createdAtUtc, lang)}
          </p>
        </div>
        <button type="button" onClick={onDismiss} aria-label={labels.close} className="rounded-lg p-1 hover:bg-cream-50">
          <CloseIcon className="h-4 w-4 text-stone-500" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-900"
        >
          {labels.viewOrder}
        </button>
        {canAccept ? (
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center gap-1 rounded-xl bg-mint-100 px-3 py-1.5 text-xs font-bold text-[#176B4B] hover:bg-mint-100/80"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />
            {labels.accept}
          </button>
        ) : null}
        {canReject ? (
          <button
            type="button"
            onClick={onReject}
            className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50/80"
          >
            {labels.reject}
          </button>
        ) : null}
      </div>
    </div>
  )
}
