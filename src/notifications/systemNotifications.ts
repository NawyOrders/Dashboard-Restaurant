/**
 * Browser notifications. The in-app toast covers a visible dashboard; this is
 * the fallback for a tab that is behind another window, where a restaurant
 * would otherwise miss a new order entirely.
 */
const STORAGE_KEY = 'nawy-notifications-system'

export type SystemPermission = NotificationPermission | 'unsupported'

export function systemNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function systemPermission(): SystemPermission {
  if (!systemNotificationsSupported()) return 'unsupported'
  return Notification.permission
}

/** Must be called from a user gesture: browsers ignore a prompt without one. */
export async function requestSystemPermission(): Promise<SystemPermission> {
  if (!systemNotificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function readSystemEnabled(
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage,
): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function writeSystemEnabled(
  enabled: boolean,
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage,
): void {
  try {
    storage?.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // A blocked storage only means the choice is not remembered.
  }
}

export type SystemNotificationInput = {
  title: string
  body: string
  tag: string
  iconUrl?: string | null
}

export function showSystemNotification(input: SystemNotificationInput): Notification | null {
  if (!systemNotificationsSupported() || Notification.permission !== 'granted') return null
  try {
    const notification = new Notification(input.title, {
      body: input.body,
      tag: input.tag,
      icon: input.iconUrl ?? undefined,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    return notification
  } catch {
    // Some browsers refuse construction outside a service worker; the in-app
    // toast is still on screen.
    return null
  }
}
