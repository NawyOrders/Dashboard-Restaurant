import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'

// Payload of the server-to-client "OrderPlaced" event pushed by the tenant
// hub (/hubs/orders), per the API reference (section 6).
export type OrderPlacedNotificationPayload = {
  eventId: string
  orderId: string
  orderNumber: string
  branchId: string
  customerName: string
  fulfilmentType: number
  itemCount: number
  total: number
  placedAtUtc: string
  status: string
}

// Minimal subscription surface consumed by the orders board. Kept separate
// from @microsoft/signalr so tests and mock mode never open a connection.
export type OrderPlacedSource = {
  subscribe: (handler: (payload: OrderPlacedNotificationPayload) => void) => () => void
}

// In-memory bus between the hub connection (producer) and the board
// (consumer). Tests drive it directly through emit().
export function createOrderPlacedSource(): OrderPlacedSource & {
  emit: (payload: OrderPlacedNotificationPayload) => void
} {
  const handlers = new Set<(payload: OrderPlacedNotificationPayload) => void>()
  return {
    subscribe: (handler) => {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    emit: (payload) => {
      for (const handler of handlers) handler(payload)
    },
  }
}

// Builds the hub connection. The backend extracts the JWT from
// ?access_token= on /hubs paths (JwtBearerEvents.OnMessageReceived), which is
// what SignalR's accessTokenFactory sends. Reconnect backoff follows the
// reference: 0, 2s, 5s, 10s, 30s. The only server event is "OrderPlaced".
export function createOrdersHub(
  baseUrl: string,
  getAccessToken: () => string | undefined,
  onOrderPlaced: (payload: OrderPlacedNotificationPayload) => void,
): signalR.HubConnection {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${baseUrl.replace(/\/+$/, '')}/hubs/orders`, {
      accessTokenFactory: () => getAccessToken() ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build()
  connection.on('OrderPlaced', onOrderPlaced)
  return connection
}

export type OrdersHubConfig = {
  baseUrl: string
  getAccessToken: () => string | undefined
}

// Opens the hub connection while the caller (the orders board) is mounted.
// Other pages never trigger SignalR traffic. Live updates are best-effort:
// if the negotiate fails, the board simply keeps refreshing on demand.
export function useOrdersHub(config: OrdersHubConfig | null): OrderPlacedSource | null {
  const [source] = useState(() => createOrderPlacedSource())
  useEffect(() => {
    if (!config) return
    const connection = createOrdersHub(config.baseUrl, config.getAccessToken, source.emit)
    void connection.start().catch(() => {})
    return () => {
      void connection.stop()
    }
  }, [config, source])
  return config ? source : null
}
