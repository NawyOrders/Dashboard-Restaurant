import { useEffect, useState, type ReactNode } from 'react'
import type { Api } from '../api/Api'
import { loadHomeOverview } from '../homeOverview'
import { bucketDays, type HomeOverview } from '../reportsFromOrders'
import { numberLocale } from '../orders'
import type { Lang, T } from '../i18n'
import type { OrderRow } from '../types'
import type { OrdersLoadState } from '../useOrders'
import { StatCard } from '../components/StatCard'
import { SalesChart, type ChartSeries } from '../components/SalesChart'
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
  // When given, the cards, chart and top items come from the real orders.
  api?: Api | null
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

function formatDelta(value: number | null, fallback: string): { text: string; up: boolean } {
  if (value === null) return { text: fallback, up: true }
  return { text: `${Math.abs(value)}%`, up: value >= 0 }
}

function buildSeries(overview: HomeOverview, lang: Lang): ChartSeries {
  const locale = numberLocale(lang)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' })
  const month = bucketDays(overview.month, 7)
  return {
    week: { values: overview.week.map((d) => d.revenue), labels: overview.week.map((d) => weekday.format(d.date)) },
    month: { values: month.map((d) => d.revenue), labels: month.map((d) => dayMonth.format(d.date)) },
  }
}

export default function HomePage({ t, lang, orders, state, query, onRetry, onViewAll, onToast, api }: HomePageProps) {
  const [overview, setOverview] = useState<HomeOverview | null>(null)
  useEffect(() => {
    if (!api) return undefined
    const controller = new AbortController()
    loadHomeOverview(api, new Date(), controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOverview(data)
      })
      .catch(() => {
        // Keep the page usable: the cards fall back to their placeholders.
      })
    return () => controller.abort()
  }, [api])

  const number = new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits: 0 })
  const real = overview !== null
  const sales = formatDelta(real ? overview.salesDelta : null, t.home.deltas.salesToday)
  const newOrdersDelta = formatDelta(real ? overview.ordersDelta : null, t.home.deltas.newOrders)
  const customersDelta = formatDelta(real ? overview.customersDelta : null, t.home.deltas.customers)
  const averageDelta = formatDelta(real ? overview.averageDelta : null, t.home.deltas.avgOrder)
  const stats: HomeStat[] = [
    {
      key: 'salesToday',
      label: t.stats.salesToday,
      value: real ? number.format(overview.salesToday) : t.home.values.salesToday,
      suffix: t.reports.currency,
      delta: sales.text,
      up: sales.up,
      icon: <CoinsIcon />,
      iconClass: 'bg-gradient-to-br from-gold-300 to-[#C9971F]',
    },
    {
      key: 'newOrders',
      label: t.stats.newOrders,
      value: real ? number.format(overview.newOrders) : t.home.values.newOrders,
      delta: newOrdersDelta.text,
      up: newOrdersDelta.up,
      icon: <BagIcon />,
      iconClass: 'bg-gradient-to-br from-[#F26B5E] to-brand-600',
    },
    {
      key: 'customers',
      label: t.stats.customers ?? t.stats.employees,
      value: real ? number.format(overview.customersToday) : t.home.values.customers,
      delta: customersDelta.text,
      up: customersDelta.up,
      icon: <UsersIcon />,
      iconClass: 'bg-gradient-to-br from-[#F6A08E] to-[#E05A4A]',
    },
    {
      key: 'avgOrder',
      label: t.stats.avgOrder,
      value: real ? number.format(overview.averageToday) : t.home.values.avgOrder,
      suffix: t.reports.currency,
      delta: averageDelta.text,
      up: averageDelta.up,
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
          <SalesChart t={t} series={real ? buildSeries(overview, lang) : undefined} />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <TopItems t={t} items={real && overview.topItems.length > 0 ? overview.topItems : undefined} onOpenDetails={() => onToast(t.topItems.subtitle)} />
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
