import type { ReactNode } from 'react'
import type { Lang, T } from '../i18n'
import type { OrderRow } from '../types'
import type { OrdersLoadState } from '../useOrders'
import { StatCard } from '../components/StatCard'
import { SalesChart } from '../components/SalesChart'
import { TopItems } from '../components/TopItems'
import { OrdersTable } from '../components/OrdersTable'
import { BagIcon, CoinsIcon, StarIcon, UsersIcon } from '../icons'

export type HomePageProps = {
  t: T
  lang: Lang
  orders: OrderRow[]
  state: OrdersLoadState
  query: string
  onRetry: () => void
  onViewAll: () => void
  onToast: (message: string) => void
}

type HomeStat = {
  key: string
  label: string
  value: string
  suffix?: string
  delta: string
  up: boolean
  icon: ReactNode
  iconClass: string
}

export default function HomePage({ t, orders, state, query, onRetry, onViewAll, onToast }: HomePageProps) {
  const stats: HomeStat[] = [
    {
      key: 'salesToday',
      label: t.stats.salesToday,
      value: t.home.values.salesToday,
      suffix: t.reports.currency,
      delta: t.home.deltas.salesToday,
      up: true,
      icon: <CoinsIcon />,
      iconClass: 'bg-gradient-to-br from-gold-300 to-[#C9971F]',
    },
    {
      key: 'newOrders',
      label: t.stats.newOrders,
      value: t.home.values.newOrders,
      delta: t.home.deltas.newOrders,
      up: true,
      icon: <BagIcon />,
      iconClass: 'bg-gradient-to-br from-[#F26B5E] to-brand-600',
    },
    {
      key: 'employees',
      label: t.stats.employees,
      value: t.home.values.employees,
      delta: t.home.deltas.employees,
      up: true,
      icon: <UsersIcon />,
      iconClass: 'bg-gradient-to-br from-[#F6A08E] to-[#E05A4A]',
    },
    {
      key: 'avgOrder',
      label: t.stats.avgOrder,
      value: t.home.values.avgOrder,
      suffix: t.reports.currency,
      delta: t.home.deltas.avgOrder,
      up: false,
      icon: <StarIcon />,
      iconClass: 'bg-gradient-to-br from-gold-300 to-[#C9971F]',
    },
  ]

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={stat.value}
            suffix={stat.suffix}
            delta={stat.delta}
            up={stat.up}
            icon={stat.icon}
            iconClass={stat.iconClass}
            onClick={() => onToast(`${stat.label} — ${stat.value}${stat.suffix ? ` ${stat.suffix}` : ''}`)}
            detailsLabel={t.actions.viewDetails}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <SalesChart t={t} />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <TopItems t={t} onOpenDetails={() => onToast(t.topItems.subtitle)} />
        </div>
      </div>

      <div className="mt-4">
        <OrdersTable
          t={t}
          orders={orders}
          statuses={{}}
          query={query}
          state={state}
          onRetry={onRetry}
          onSelect={(row) => onToast(`${t.actions.viewDetails} ${row.id}`)}
          onViewAll={onViewAll}
        />
      </div>
    </div>
  )
}
