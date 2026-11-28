import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readSystemEnabled,
  requestSystemPermission,
  showSystemNotification,
  systemNotificationsSupported,
  systemPermission,
  writeSystemEnabled,
} from './systemNotifications'

class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(async () => FakeNotification.permission)
  static instances: FakeNotification[] = []
  onclick: (() => void) | null = null
  close = vi.fn()
  constructor(public title: string, public options?: NotificationOptions) {
    FakeNotification.instances.push(this)
  }
}

function store(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

beforeEach(() => {
  FakeNotification.permission = 'default'
  FakeNotification.instances = []
  FakeNotification.requestPermission.mockClear()
  vi.stubGlobal('Notification', FakeNotification)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('system notification permission', () => {
  it('reports the browser permission', () => {
    expect(systemNotificationsSupported()).toBe(true)
    expect(systemPermission()).toBe('default')
    FakeNotification.permission = 'granted'
    expect(systemPermission()).toBe('granted')
  })

  it('is unsupported without the API', () => {
    const saved = globalThis.Notification
    // A browser without the API has no property at all, so delete rather than stub.
    delete (globalThis as { Notification?: unknown }).Notification
    expect(systemNotificationsSupported()).toBe(false)
    expect(systemPermission()).toBe('unsupported')
    globalThis.Notification = saved
  })

  it('asks once and reuses a decided permission', async () => {
    FakeNotification.permission = 'granted'
    FakeNotification.requestPermission.mockResolvedValueOnce('granted')
    expect(await requestSystemPermission()).toBe('granted')
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()

    FakeNotification.permission = 'default'
    await requestSystemPermission()
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
  })
})

describe('the stored preference', () => {
  it('defaults to on and remembers the choice', () => {
    const storage = store()
    expect(readSystemEnabled(storage)).toBe(true)
    writeSystemEnabled(false, storage)
    expect(readSystemEnabled(storage)).toBe(false)
    writeSystemEnabled(true, storage)
    expect(readSystemEnabled(storage)).toBe(true)
  })

  it('survives a blocked storage', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } } as unknown as Storage
    expect(readSystemEnabled(broken)).toBe(true)
    expect(() => writeSystemEnabled(false, broken)).not.toThrow()
  })
})

describe('showSystemNotification', () => {
  it('does nothing without permission', () => {
    expect(showSystemNotification({ title: 'a', body: 'b', tag: 't' })).toBeNull()
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('shows the alert and focuses the window when clicked', () => {
    FakeNotification.permission = 'granted'
    const focus = vi.fn()
    vi.stubGlobal('focus', focus)
    const shown = showSystemNotification({ title: 'طلب جديد', body: 'ORD-2841', tag: 'evt-1', iconUrl: 'https://img.test/l.png' })
    expect(shown).not.toBeNull()
    expect(FakeNotification.instances[0].options).toMatchObject({ body: 'ORD-2841', tag: 'evt-1', icon: 'https://img.test/l.png' })
    shown!.onclick?.call(shown!, new Event('click'))
    expect(focus).toHaveBeenCalled()
  })
})
