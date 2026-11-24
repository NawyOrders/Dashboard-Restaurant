import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { translations } from '../i18n'
import ReportsPage from './ReportsPage'

describe('reports page', () => {
  it('switches the report range and reloads the summary', async () => {
    const t = translations.ar
    const api = createMockApi({ latencyMs: 0 })
    const summary = vi.spyOn(api, 'getReportsSummary')
    const user = userEvent.setup()

    render(<ReportsPage t={t} lang="ar" api={api} onToast={vi.fn()} />)

    expect(await screen.findByText('48,250')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t.reports.month }))

    await waitFor(() => expect(summary).toHaveBeenLastCalledWith('month'))
    expect(await screen.findByText('248,250')).toBeInTheDocument()
  })
})
