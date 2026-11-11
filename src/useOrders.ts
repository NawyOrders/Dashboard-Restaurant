import { useEffect, useState } from 'react'
import type { Api } from './api'
import type { Lang } from './i18n'
import { mapAdminOrders } from './orders'
import type { OrderRow } from './types'

export type OrdersLoadState = 'loading' | 'ready' | 'error'

export type RemoteOrders = {
  state: OrdersLoadState
  rows: OrderRow[]
  reload: () => void
}

// Fetches restaurant-scoped orders through the Api contract. The backend owns
// tenant isolation and permissions; this hook only manages view state.
export function useOrders(api: Api | null, lang: Lang): RemoteOrders {
  const [state, setState] = useState<OrdersLoadState>(api ? 'loading' : 'ready')
  const [rows, setRows] = useState<OrderRow[]>([])
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!api) return
    const controller = new AbortController()
    setState('loading')
    api
      .listOrders({ pageNumber: 1, pageSize: 20 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setRows(mapAdminOrders(page.items, lang))
        setState('ready')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setRows([])
        setState('error')
      })
    return () => controller.abort()
  }, [api, lang, nonce])

  return { state, rows, reload: () => setNonce((value) => value + 1) }
}
