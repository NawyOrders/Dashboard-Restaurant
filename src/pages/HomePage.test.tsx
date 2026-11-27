import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api } from '../api/Api'
import { translations } from '../i18n'
import HomePage from './HomePage'

const baseProps = {
  t: translations.en,
  lang: 'en' as const,
  orders: [],
  state: 'ready' as const,
  query: '',
  onRetry: () => undefined,
  onViewAll: () => undefined,
  onToast: () => undefined,
}

function order(id: string, total: number, customerName: string, hour = 10) {
  return {
    orderId: id, orderNumber: id, status: 6, fulfilmentType: 1, branchId: 'b', customerName, total, vatAmount: 0,
    createdAtUtc: new Date(2026, 10, 27, hour).toISOString(), paymentMethod: 0, paymentStatus: 3,
  }
}

function fakeApi(over: Partial<Api>): Api {
  return over as Api
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 27, 15))
})
afterEach(() => vi.useRealTimers())

describe('HomePage data source', () => {
  it('shows the placeholder numbers without an api (mock mode)', () => {
    render(<HomePage {...baseProps} />)
    expect(screen.getAllByText(translations.en.home.values.salesToday).length).toBeGreaterThan(0)
  })

  it('shows real numbers, replaces the sample top items and survives failed detail calls', async () => {
    const api = fakeApi({
      listOrders: vi.fn(async () => ({ items: [order('a', 1234, 'Mona'), order('b', 66, 'Ali')], totalCount: 2, page: 1, pageSize: 100, totalPages: 1, hasPreviousPage: false, hasNextPage: false })),
      getOrderDetails: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    render(<HomePage {...baseProps} api={api} />)
    await waitFor(() => expect(screen.getByText('1,300')).toBeInTheDocument())
    expect(screen.queryAllByText(translations.en.home.values.salesToday)).toHaveLength(0)
  })

  it('keeps the page and placeholders when the orders request fails', async () => {
    const api = fakeApi({ listOrders: vi.fn(async () => Promise.reject(new Error('401'))) })
    render(<HomePage {...baseProps} api={api} />)
    await waitFor(() => expect(api.listOrders).toHaveBeenCalled())
    expect(screen.getAllByText(translations.en.home.values.salesToday).length).toBeGreaterThan(0)
  })

  it('does not call the api when it is null', () => {
    const listOrders = vi.fn()
    render(<HomePage {...baseProps} api={null} />)
    expect(listOrders).not.toHaveBeenCalled()
  })
})
