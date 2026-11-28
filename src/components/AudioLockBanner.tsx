import { useEffect, useState } from 'react'
import type { T } from '../i18n'
import { isAudioLocked, subscribeAudioState, unlockAudio } from '../notifications/chime'

/** True until the browser lets the page make sound; updates when that changes. */
export function useAudioLocked(): boolean {
  const [locked, setLocked] = useState(() => isAudioLocked())
  useEffect(() => {
    const sync = () => setLocked(isAudioLocked())
    sync()
    return subscribeAudioState(sync)
  }, [])
  return locked
}

type Props = { t: T; visible: boolean }

/**
 * Browsers refuse sound until the person touches the page once. This bar stays
 * on top until they do, so a silent dashboard is never a surprise.
 */
export function AudioLockBanner({ t, visible }: Props) {
  if (!visible) return null
  return (
    <div
      dir={t.dir}
      role="alert"
      className="fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-3 bg-gold-500 px-4 py-2 text-sm font-extrabold text-stone-900 shadow-lg"
    >
      <span>{t.notifications.soundLocked}</span>
      <button
        type="button"
        onClick={() => unlockAudio()}
        className="rounded-xl bg-stone-900 px-3 py-1 text-xs font-bold text-white hover:bg-stone-800"
      >
        {t.notifications.soundLockedAction}
      </button>
    </div>
  )
}
