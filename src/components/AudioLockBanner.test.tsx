import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '../i18n'
import { flashTitle } from '../notifications/alerts'
import * as chime from '../notifications/chime'
import { AudioLockBanner, useAudioLocked } from './AudioLockBanner'

describe('AudioLockBanner', () => {
  afterEach(() => vi.restoreAllMocks())
  const t = translations.ar

  it('shows the lock message and unlocks on click', () => {
    const unlock = vi.spyOn(chime, 'unlockAudio').mockImplementation(() => {})
    vi.spyOn(chime, 'playChime').mockImplementation(() => {})
    render(<AudioLockBanner t={t} visible />)
    expect(screen.getByRole('alert').textContent).toContain(t.notifications.soundLocked)
    fireEvent.click(screen.getByRole('button', { name: t.notifications.soundLockedAction }))
    expect(unlock).toHaveBeenCalled()
  })

  it('renders nothing when hidden', () => {
    const { container } = render(<AudioLockBanner t={t} visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('the hook follows the audio state', () => {
    let locked = true
    let notify: () => void = () => {}
    vi.spyOn(chime, 'isAudioLocked').mockImplementation(() => locked)
    vi.spyOn(chime, 'subscribeAudioState').mockImplementation((listener) => {
      notify = listener
      return () => {}
    })
    const { result } = renderHook(() => useAudioLocked())
    expect(result.current).toBe(true)
    act(() => {
      locked = false
      notify()
    })
    expect(result.current).toBe(false)
  })
})

describe('flashTitle', () => {
  it('alternates between the attention text and the unread title', () => {
    expect(flashTitle('Nawy', 2, 'طلب جديد', true)).toBe('🔔 طلب جديد')
    expect(flashTitle('Nawy', 2, 'طلب جديد', false)).toBe('(2) Nawy')
  })
})
