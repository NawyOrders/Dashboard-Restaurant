export type OrderStatus = 'new' | 'preparing' | 'done'

export type LiveOrderStatus = 'new' | 'preparing' | 'ready' | 'delivered'

export type LiveOrderPayment = 'cash' | 'instapay' | 'wallet'

export type LiveOrderLine = {
  name: string
  extras?: string
  notes?: string
}

export type LiveOrder = {
  // Display id shown on the card; orderId is the backend id used by the API.
  id: string
  orderId?: string
  statusCode?: number
  customer: string
  phone?: string
  itemCount: number
  fulfilment: 'delivery' | 'pickup'
  minutes: number
  total: number
  status: LiveOrderStatus
  payment: LiveOrderPayment
  paymentConfirmed?: boolean
  lines: LiveOrderLine[]
}

export type OrderRow = {
  id: string
  customer: string
  items: string
  total: string
  totalValue?: number
  status: string
  time: string
}

export type StatKey = 'salesToday' | 'newOrders' | 'employees' | 'avgOrder'

export type SectionKey = 'home' | 'orders' | 'menu' | 'reports' | 'settings'

export type Profile = {
  name?: string
  phone?: string
  address?: string
}
