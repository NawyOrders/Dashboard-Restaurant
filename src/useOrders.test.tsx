import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMockApi } from './api/mockApi'
import { useOrders } from './useOrders'

describe('useOrders', () => {
  it('stays ready and empty without an api', () => {
    const { result } = renderHook(() => useOrders(null, 'en'))
    expect(result.current.state).toBe('ready')
    expect(result.current.rows).toEqual([])
  })

  it('loads and maps orders through the api', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const { result } = renderHook(() => useOrders(api, 'en'))

    expect(result.current.state).toBe('loading')

    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.rows.length).toBeGreaterThan(0)
    expect(result.current.rows[0].id.startsWith('#')).toBe(true)
    expect(result.current.rows[0].total).toContain('EGP')
  })

  it('exposes an error state when the api fails', async () => {
    const api = createMockApi({ latencyMs: 0, fail: true })
    const { result } = renderHook(() => useOrders(api, 'en'))

    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(result.current.rows).toEqual([])
  })

  it('reloads orders when retry is requested', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const { result } = renderHook(() => useOrders(api, 'en'))

    await waitFor(() => expect(result.current.state).toBe('ready'))

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.rows.length).toBeGreaterThan(0)
  })
})
