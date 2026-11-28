import type { NotificationItem } from '../api/notifications'

/**
 * The alert stack. Every live event that still needs an eye stays here until a
 * staff member acts on it; the screen shows the first two and counts the rest,
 * so a rush of orders never hides the newest one behind an older toast.
 */
export const MAX_VISIBLE_ALERTS = 2

export function enqueueAlert(current: NotificationItem[], next: NotificationItem): NotificationItem[] {
  if (current.some((item) => item.notificationId === next.notificationId)) return current
  return [...current, next]
}

export function dismissAlert(current: NotificationItem[], notificationId: string): NotificationItem[] {
  return current.filter((item) => item.notificationId !== notificationId)
}

/** Another terminal accepted or rejected the order: every alert for it is done. */
export function acknowledgeOrder(current: NotificationItem[], orderId: string): NotificationItem[] {
  if (!orderId) return current
  return current.filter((item) => item.orderId !== orderId)
}

export function visibleAlerts(alerts: NotificationItem[], max = MAX_VISIBLE_ALERTS): NotificationItem[] {
  return alerts.slice(0, max)
}

export function hiddenAlertCount(alerts: NotificationItem[], max = MAX_VISIBLE_ALERTS): number {
  return Math.max(0, alerts.length - max)
}

/** The tab title carries the unread count so a background tab still shows it. */
export function titleWithUnread(unread: number, base: string): string {
  return unread > 0 ? `(${unread}) ${base}` : base
}

/**
 * A system notification is for the case the dashboard cannot cover: the tab is
 * behind another window or hidden in a background tab.
 */
export function shouldShowSystemNotification(visibility: DocumentVisibilityState | 'unknown', hasFocus: boolean): boolean {
  return visibility === 'hidden' || !hasFocus
}
