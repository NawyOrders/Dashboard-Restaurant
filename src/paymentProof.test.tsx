import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './api/httpApi'
import { createMockApi } from './api/mockApi'
import { PERMISSIONS } from './authz'
import { translations } from './i18n'
import OrdersPage from './pages/OrdersPage'

const t = translations.en
const fetchMock = vi.fn<typeof fetch>()
const ORDER_ID = '00000000-0000-4000-8000-000000000101'

function http() {
  return createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })
}

function ok() {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: 200, isSuccess: true, data: null, errors: null }), { status: 200 }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('payment proof HTTP calls', () => {
  it('confirms a payment with POST /api/v1/orders/{id}/confirm-payment and no body', async () => {
    ok()
    await http().confirmPayment('abc/1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/orders/abc%2F1/confirm-payment')
    expect(init).toMatchObject({ method: 'POST' })
    expect(init?.body).toBeUndefined()
  })

  it('rejects a proof with POST /api/v1/orders/{id}/reject-proof and a trimmed reason', async () => {
    ok()
    await http().rejectPaymentProof(ORDER_ID, '  blurry screenshot  ')
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/orders/${ORDER_ID}/reject-proof`)
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual({ rejectionReason: 'blurry screenshot' })
  })

  it('validates input before calling the server', async () => {
    await expect(http().confirmPayment(' ')).rejects.toMatchObject({ code: 'validation' })
    await expect(http().rejectPaymentProof(ORDER_ID, '   ')).rejects.toMatchObject({ code: 'validation' })
    await expect(http().rejectPaymentProof(ORDER_ID, 'x'.repeat(1001))).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [422, 'validation'],
  ])('maps HTTP %s to %s', async (status, code) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ errors: { detail: 'x' } }), { status }))
    await expect(http().confirmPayment(ORDER_ID)).rejects.toMatchObject({ code })
  })
})

describe('mock API payment review', () => {
  it('confirms a submitted proof once and refuses a second confirm', async () => {
    const api = createMockApi({ latencyMs: 0 })
    await api.confirmPayment(ORDER_ID)
    await expect(api.confirmPayment(ORDER_ID)).rejects.toMatchObject({ code: 'validation' })
  })

  it('rejects a submitted proof only with a reason', async () => {
    const api = createMockApi({ latencyMs: 0 })
    await expect(api.rejectPaymentProof(ORDER_ID, ' ')).rejects.toMatchObject({ code: 'validation' })
    await api.rejectPaymentProof(ORDER_ID, 'amount mismatch')
    await expect(api.confirmPayment(ORDER_ID)).rejects.toMatchObject({ code: 'validation' })
  })

  it('answers notFound for an unknown order', async () => {
    await expect(createMockApi({ latencyMs: 0 }).confirmPayment('missing')).rejects.toMatchObject({ code: 'notFound' })
  })
})

const REVIEWER = [PERMISSIONS.ordersView, PERMISSIONS.paymentsProofConfirm, PERMISSIONS.paymentsProofReject]

describe('board payment review', () => {
  it('confirms a submitted proof from the board', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const spy = vi.spyOn(api, 'confirmPayment')
    const onToast = vi.fn()
    const user = userEvent.setup()
    render(<OrdersPage t={t} lang="en" api={api} permissions={REVIEWER} onToast={onToast} />)
    await user.click(await screen.findByRole('button', { name: t.liveOrders.confirmPayment }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(ORDER_ID))
    await waitFor(() => expect(screen.queryByRole('button', { name: t.liveOrders.confirmPayment })).not.toBeInTheDocument())
    expect(onToast).toHaveBeenCalledWith(t.liveOrders.paymentConfirmedToast)
  })

  it('rejects a submitted proof with the reason the reviewer typed', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const spy = vi.spyOn(api, 'rejectPaymentProof')
    vi.stubGlobal('prompt', vi.fn(() => ' blurry '))
    const user = userEvent.setup()
    render(<OrdersPage t={t} lang="en" api={api} permissions={REVIEWER} onToast={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: t.liveOrders.rejectProof }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(ORDER_ID, 'blurry'))
  })

  it('does not call the API when the reason prompt is cancelled', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const spy = vi.spyOn(api, 'rejectPaymentProof')
    vi.stubGlobal('prompt', vi.fn(() => null))
    const user = userEvent.setup()
    render(<OrdersPage t={t} lang="en" api={api} permissions={REVIEWER} onToast={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: t.liveOrders.rejectProof }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('hides the review buttons without the proof permissions', async () => {
    render(<OrdersPage t={t} lang="en" api={createMockApi({ latencyMs: 0 })} permissions={[PERMISSIONS.ordersView]} onToast={vi.fn()} />)
    await screen.findByText(t.liveOrders.proofSubmitted)
    expect(screen.queryByRole('button', { name: t.liveOrders.confirmPayment })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.liveOrders.rejectProof })).not.toBeInTheDocument()
  })
})
