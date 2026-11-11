import type { T } from '../i18n'
import type { OrderRow, OrderStatus } from '../types'
import { statusOf } from '../orders'
import { StatusBadge } from './StatusBadge'
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, RefreshIcon, SearchXIcon } from '../icons'

const FILTERS: Array<OrderStatus | 'all'> = ['all', 'new', 'preparing', 'done']

type Props = {
  t: T
  orders: OrderRow[]
  statuses: Record<string, OrderStatus>
  query: string
  state?: 'loading' | 'ready' | 'error'
  statusFilter?: OrderStatus | 'all'
  onStatusFilterChange?: (status: OrderStatus | 'all') => void
  onRetry?: () => void
  onRefresh?: () => void
  onSelect: (order: OrderRow) => void
  onViewAll: () => void
}

export function OrdersTable({
  t,
  orders,
  statuses,
  query,
  state = 'ready',
  statusFilter = 'all',
  onStatusFilterChange,
  onRetry,
  onRefresh,
  onSelect,
  onViewAll,
}: Props) {
  const { title, viewAll, cols, status } = t.orders
  const isRtl = t.dir === 'rtl'
  const Arrow = isRtl ? ArrowLeftIcon : ArrowRightIcon
  const queryActive = query.trim().length > 0
  const counts: Record<OrderStatus | 'all', number> = { all: orders.length, new: 0, preparing: 0, done: 0 }
  for (const row of orders) {
    counts[statusOf(row, statuses)] += 1
  }
  const visibleOrders =
    statusFilter === 'all' ? orders : orders.filter((row) => statusOf(row, statuses) === statusFilter)
  const empty = visibleOrders.length === 0

  return (
    <section dir={t.dir} className="dashboard-panel min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E1D7] pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-[#302B28] sm:text-lg">{title}</h3>
          {query.trim() && (
            <p className="mt-1 text-xs font-semibold text-[#756B62]">
              {visibleOrders.length} {t.search.results}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          title={`${viewAll} — ${title}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E9E1D7] px-3 py-2 text-sm font-bold text-[#C2281A] transition-colors hover:border-[#C2281A]/30 hover:bg-[#FDF8F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
        >
          {viewAll}
          <Arrow className="h-4 w-4" />
        </button>
      </div>

      {state === 'ready' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={title} className="flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => {
              const active = statusFilter === filter
              const label = filter === 'all' ? t.orders.filterAll : status[filter]
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => onStatusFilterChange?.(filter)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-[#C2281A] text-white'
                      : 'border border-[#E9E1D7] bg-white text-[#756B62] hover:border-[#D9B45A] hover:text-[#302B28]'
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                      active ? 'bg-white/20' : 'bg-[#F6EEE4] text-[#756B62]'
                    }`}
                  >
                    {counts[filter]}
                  </span>
                </button>
              )
            })}
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title={t.orders.refresh}
              aria-label={t.orders.refresh}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#E9E1D7] bg-white text-[#756B62] transition-colors hover:border-[#C2281A]/30 hover:text-[#C2281A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
            >
              <RefreshIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {state === 'loading' ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-[#756B62]">{t.orders.loading}</p>
          <ul aria-hidden="true" className="flex flex-col gap-3">
            {[0, 1, 2].map((index) => (
              <li key={index} className="h-16 animate-pulse rounded-xl bg-[#F6EEE4] motion-reduce:animate-none" />
            ))}
          </ul>
        </div>
      ) : state === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-[#E9E1D7] bg-[#FDF8F1] px-4 py-6">
          <p className="text-sm font-bold text-[#302B28]">{t.orders.loadError}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center rounded-lg bg-[#C2281A] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#A01F13] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
            >
              {t.orders.retry}
            </button>
          )}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-[#FDF8F1] px-4 py-12 text-center">
          <SearchXIcon className="mb-1 h-9 w-9 text-[#8B8177]" />
          <p className="text-sm font-bold text-[#302B28]">
            {queryActive ? t.search.empty : t.orders.emptyFilter}
          </p>
          <p className="max-w-xs text-xs leading-5 text-[#756B62]">
            {queryActive ? t.search.emptyHint : t.orders.emptyFilter}
          </p>
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onStatusFilterChange?.('all')}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg border border-[#E9E1D7] bg-white px-4 py-2 text-sm font-bold text-[#C2281A] transition-colors hover:border-[#C2281A]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
            >
              {t.orders.clearFilters}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E9E1D7] bg-[#FDF8F1] text-xs text-[#756B62]">
                  <th scope="col" className="py-3 pe-4 ps-3 text-start font-bold">{cols.id}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.customer}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.items}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.total}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.status}</th>
                  <th scope="col" className="px-2 py-3 text-center font-bold">
                    <span className="sr-only">{cols.action}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((row) => {
                  const current = statusOf(row, statuses)
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#E9E1D7]/70 transition-colors last:border-0 hover:bg-[#FDF8F1]/70"
                    >
                      <td className="whitespace-nowrap py-4 pe-4 ps-3">
                        <bdi className="block font-extrabold text-[#302B28] tabular-nums">{row.id}</bdi>
                        <span className="mt-1 block text-xs font-medium text-[#756B62] tabular-nums">{row.time}</span>
                      </td>
                      <td className="py-4 pe-4 font-bold leading-6 text-[#302B28]">
                        {row.customer}
                      </td>
                      <td className="py-4 pe-4 leading-6 text-[#756B62]">{row.items}</td>
                      <td className="whitespace-nowrap py-4 pe-4 font-extrabold text-[#302B28] tabular-nums">
                        <bdi>{row.total}</bdi>
                      </td>
                      <td className="py-4 pe-4">
                        <StatusBadge status={current} label={status[current]} />
                      </td>
                      <td className="px-2 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => onSelect(row)}
                          title={`${t.actions.viewDetails} ${row.id}`}
                          aria-label={`${t.actions.viewDetails} ${row.id}`}
                          className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-[#E9E1D7] text-[#756B62] transition-colors hover:border-[#C2281A]/30 hover:bg-white hover:text-[#C2281A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {visibleOrders.map((row) => {
              const current = statusOf(row, statuses)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    title={`${t.actions.viewDetails} ${row.id}`}
                    className="group flex w-full min-w-0 flex-col rounded-xl border border-[#E9E1D7] bg-white p-3.5 text-start transition-colors hover:border-[#C2281A]/30 hover:bg-[#FDF8F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
                  >
                    <span className="flex w-full flex-wrap items-center justify-between gap-2">
                      <bdi className="text-sm font-extrabold text-[#302B28] tabular-nums">{row.id}</bdi>
                      <StatusBadge status={current} label={status[current]} size="xs" />
                    </span>
                    <span className="mt-2.5 block w-full break-words text-sm font-bold leading-6 text-[#302B28]">
                      {row.customer}
                    </span>
                    <span className="mt-0.5 block w-full break-words text-sm leading-6 text-[#756B62]">
                      {row.items}
                    </span>
                    <span className="mt-3 flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-dashed border-[#E9E1D7] pt-3">
                      <span className="text-xs font-semibold text-[#756B62] tabular-nums">{row.time}</span>
                      <span className="inline-flex flex-wrap items-baseline gap-2">
                        <span className="text-xs text-[#756B62]">{cols.total}</span>
                        <bdi className="text-base font-extrabold text-[#302B28] tabular-nums">{row.total}</bdi>
                      </span>
                    </span>
                    <span className="mt-1 flex min-h-11 w-full items-center justify-end gap-1.5 text-xs font-bold text-[#C2281A]">
                      <EyeIcon className="h-4 w-4" />
                      {t.actions.viewDetails}
                      <Arrow className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E9E1D7] pt-3 text-xs font-semibold text-[#756B62]">
            <p className="tabular-nums">
              {t.orders.showing} <bdi className="font-extrabold text-[#302B28]">{visibleOrders.length}</bdi> {t.orders.of}{' '}
              <bdi className="font-extrabold text-[#302B28]">{orders.length}</bdi>
            </p>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onStatusFilterChange?.('all')}
                className="inline-flex min-h-11 items-center rounded-lg px-2 py-2 font-bold text-[#C2281A] transition-colors hover:bg-[#FDF8F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
              >
                {t.orders.clearFilters}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
