import type { Lang, T } from '../i18n'
import type { OrderRow } from '../types'
import type { OrdersLoadState } from '../useOrders'

export type HomePageProps = {
  t: T
  lang: Lang
  orders: OrderRow[]
  state: OrdersLoadState
  query: string
  onRetry: () => void
  onViewAll: () => void
}

export default function HomePage({ t }: HomePageProps) {
  return (
    <div className="dashboard-panel p-6">
      <h2 className="text-lg font-extrabold text-stone-800">{t.dashboard.overview}</h2>
    </div>
  )
}
