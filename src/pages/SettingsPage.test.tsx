import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { translations } from '../i18n'
import SettingsPage from './SettingsPage'

describe('settings page', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists edited settings locally when saved', async () => {
    const t = translations.ar
    const onToast = vi.fn()
    const user = userEvent.setup()
    const storageKey = 'settings-test'

    render(<SettingsPage t={t} lang="ar" storageKey={storageKey} onToast={onToast} />)

    const nameInput = screen.getByLabelText(t.settingsPage.restaurantName)
    await user.clear(nameInput)
    await user.type(nameInput, 'مطعم النيل')

    const repeatSound = screen.getByRole('switch', { name: t.settingsPage.repeatSound })
    expect(repeatSound).toHaveAttribute('aria-checked', 'true')
    await user.click(repeatSound)

    await user.click(screen.getAllByRole('button', { name: t.settingsPage.save })[0])

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as {
        restaurantName?: string
        notifications?: { repeatSound?: boolean }
      }
      expect(saved.restaurantName).toBe('مطعم النيل')
      expect(saved.notifications?.repeatSound).toBe(false)
    })
    expect(onToast).toHaveBeenCalledWith(t.settingsPage.saved)
  })
})
