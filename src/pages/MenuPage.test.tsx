import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { translations } from '../i18n'
import MenuPage from './MenuPage'

describe('menu management', () => {
  it('optimistically toggles item availability through the API', async () => {
    const t = translations.ar
    const api = createMockApi({ latencyMs: 0 })
    const update = vi.spyOn(api, 'updateMenuItemAvailability')
    const onToast = vi.fn()
    const user = userEvent.setup()

    render(<MenuPage t={t} lang="ar" api={api} onToast={onToast} />)

    const toggle = await screen.findByRole('switch', { name: 'ريش غنم مشوية' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)

    await waitFor(() => expect(update).toHaveBeenCalledWith('m1', '00000000-0000-4000-8000-0000000000bb', true))
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(onToast).toHaveBeenCalledWith(`ريش غنم مشوية — ${t.menuPage.available}`)
  })
})
