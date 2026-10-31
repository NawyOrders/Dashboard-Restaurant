export type OrderStatus = 'new' | 'preparing' | 'done'

export type OrderRow = {
  id: string
  customer: string
  items: string
  total: string
  status: string
  time: string
}

export type StatKey = 'salesToday' | 'newOrders' | 'employees' | 'avgOrder'

export type SectionKey = 'home' | 'orders' | 'menu' | 'reports'

export type Profile = {
  name?: string
  phone?: string
  address?: string
}
