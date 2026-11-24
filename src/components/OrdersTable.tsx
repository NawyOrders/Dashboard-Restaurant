import type { T } from '../i18n'
import type { OrderRow, OrderStatus } from '../types'
import { statusOf } from '../orders'
import { StatusBadge } from './StatusBadge'
import { ArrowLeftIcon, ArrowRightIcon, SearchXIcon } from '../icons'

type Props = {
  t: T
  orders: OrderRow[]
  statuses: Record<string, OrderStatus>
  query: string
  state?: 'loading' | 'ready' | 'error'
  onRetry?: () => void
  onSelect: (order: OrderRow) => void
  onViewAll: () => void
}

export function OrdersTable({
  t,
  orders,
  statuses,
  query,
  state = 'ready',
  onRetry,
  onSelect,
  onViewAll,
}: Props) {
  const { title, viewAll, cols, status } = t.orders
  const isRtl = t.dir === 'rtl'
  const Arrow = isRtl ? ArrowLeftIcon : ArrowRightIcon
  const queryActive = query.trim().length > 0
  const visibleOrders = orders.slice(0, 7)

  return (
    <section dir={t.dir} className="dashboard-panel min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-stone-800 sm:text-lg">{title}</h3>
          {queryActive && (
            <p className="mt-1 text-xs font-semibold text-stone-500">
              {orders.length} {t.search.results}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          title={`${viewAll} — ${title}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          {viewAll}
          <Arrow className="h-4 w-4" />
        </button>
      </div>

      {state === 'loading' ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-stone-500">{t.orders.loading}</p>
          <ul aria-hidden="true" className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <li key={index} className="h-12 animate-pulse rounded-xl bg-cream-100 motion-reduce:animate-none" />
            ))}
          </ul>
        </div>
      ) : state === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-line bg-cream-50 px-4 py-6">
          <p className="text-sm font-bold text-stone-800">{t.orders.loadError}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              {t.orders.retry}
            </button>
          )}
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-cream-50 px-4 py-12 text-center">
          <SearchXIcon className="mb-1 h-9 w-9 text-stone-400" />
          <p className="text-sm font-bold text-stone-800">{queryActive ? t.search.empty : t.liveOrders.empty}</p>
          {queryActive && <p className="max-w-xs text-xs leading-5 text-stone-500">{t.search.emptyHint}</p>}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-stone-500">
                  <th scope="col" className="py-3 pe-4 ps-2 text-start font-bold">{cols.id}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.customer}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.items}</th>
                  <th scope="col" className="py-3 pe-4 text-start font-bold">{cols.total}</th>
                  <th scope="col" className="px-2 py-3 text-start font-bold">{cols.status}</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((row) => {
                  const current = statusOf(row, statuses)
                  return (
                    <tr key={row.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-cream-50/70">
                      <td className="whitespace-nowrap py-4 pe-4 ps-2">
                        <button
                          type="button"
                          onClick={() => onSelect(row)}
                          title={`${t.actions.viewDetails} ${row.id}`}
                          className="block font-extrabold tabular-nums text-stone-800 transition-colors hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                        >
                          {row.id}
                        </button>
                        <span className="mt-1 block text-xs font-medium tabular-nums text-stone-500">{row.time}</span>
                      </td>
                      <td className="py-4 pe-4 font-bold leading-6 text-stone-800">{row.customer}</td>
                      <td className="py-4 pe-4 leading-6 text-stone-500">{row.items}</td>
                      <td className="whitespace-nowrap py-4 pe-4 font-extrabold tabular-nums text-stone-800">
                        <bdi>{row.total}</bdi>
                      </td>
                      <td className="px-2 py-4">
                        <StatusBadge status={current} label={status[current]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {visibleOrders.map((row) => {
              const current = statusOf(row, statuses)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    title={`${t.actions.viewDetails} ${row.id}`}
                    className="group flex w-full min-w-0 flex-col rounded-xl border border-line bg-white p-3.5 text-start transition-colors hover:border-gold-300 hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span className="flex w-full flex-wrap items-center justify-between gap-2">
                      <bdi className="text-sm font-extrabold tabular-nums text-stone-800">{row.id}</bdi>
                      <StatusBadge status={current} label={status[current]} size="xs" />
                    </span>
                    <span className="mt-2 block w-full break-words text-sm font-bold leading-6 text-stone-800">{row.customer}</span>
                    <span className="mt-0.5 block w-full break-words text-xs leading-5 text-stone-500">{row.items}</span>
                    <span className="mt-2 flex w-full items-center justify-between gap-2 border-t border-dashed border-line pt-2">
                      <span className="text-xs font-semibold tabular-nums text-stone-500">{row.time}</span>
                      <bdi className="text-base font-extrabold tabular-nums text-stone-800">{row.total}</bdi>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
