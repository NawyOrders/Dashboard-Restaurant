import type { T } from '../i18n'
import type { OrderRow, OrderStatus } from '../types'
import { statusOf } from '../orders'
import { StatusBadge } from './StatusBadge'
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, SearchXIcon } from '../icons'

type Props = {
  t: T
  orders: OrderRow[]
  statuses: Record<string, OrderStatus>
  query: string
  onSelect: (order: OrderRow) => void
  onViewAll: () => void
}

export function OrdersTable({ t, orders, statuses, query, onSelect, onViewAll }: Props) {
  const { title, viewAll, cols, status } = t.orders
  const isRtl = t.dir === 'rtl'
  const Arrow = isRtl ? ArrowLeftIcon : ArrowRightIcon
  const empty = orders.length === 0

  return (
    <section className="rounded-4xl bg-white p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-stone-800 sm:text-lg">{title}</h3>
          {query.trim() && (
            <p className="mt-0.5 text-xs font-semibold text-stone-400">
              {orders.length} {t.search.results}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          title={`${viewAll} — ${title}`}
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          {viewAll}
          <Arrow className="h-4 w-4" />
        </button>
      </div>

      {empty ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <SearchXIcon className="h-10 w-10 text-stone-300" />
          <p className="text-sm font-bold text-stone-500">{t.search.empty}</p>
          <p className="max-w-xs text-xs text-stone-400">{t.search.emptyHint}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-xs font-bold text-stone-400">
                  <th className="py-3 pe-4 text-start font-bold">{cols.id}</th>
                  <th className="py-3 pe-4 text-start font-bold">{cols.customer}</th>
                  <th className="py-3 pe-4 text-start font-bold">{cols.items}</th>
                  <th className="py-3 pe-4 text-start font-bold">{cols.total}</th>
                  <th className="py-3 pe-4 text-start font-bold">{cols.status}</th>
                  <th className="py-3 text-center font-bold">
                    <span className="sr-only">{cols.action}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => {
                  const current = statusOf(row, statuses)
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-cream-100 transition-colors last:border-0 hover:bg-cream-50/60"
                    >
                      <td className="whitespace-nowrap py-3.5 pe-4 font-extrabold text-stone-700">
                        {row.id}
                      </td>
                      <td className="whitespace-nowrap py-3.5 pe-4 font-bold text-stone-600">
                        {row.customer}
                      </td>
                      <td className="py-3.5 pe-4 text-stone-500">{row.items}</td>
                      <td className="whitespace-nowrap py-3.5 pe-4 font-bold text-stone-700">
                        {row.total}
                      </td>
                      <td className="py-3.5 pe-4">
                        <StatusBadge status={current} label={status[current]} />
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelect(row)}
                          title={`${t.actions.viewDetails} ${row.id}`}
                          aria-label={`${t.actions.viewDetails} ${row.id}`}
                          className="mx-auto grid h-9 w-9 place-items-center rounded-xl text-stone-400 transition-colors hover:bg-cream-100 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
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

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {orders.map((row) => {
              const current = statusOf(row, statuses)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    title={`${t.actions.viewDetails} ${row.id}`}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-cream-200 p-3.5 text-start transition-colors hover:border-brand-100 hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                  >
                    <span className="min-w-0">
                      <span className="font-extrabold text-stone-700">{row.id}</span>
                      <span className="mt-1 block truncate text-sm font-bold text-stone-700">
                        {row.customer}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-stone-400">
                        {row.items}
                      </span>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-500">
                        <EyeIcon className="h-3.5 w-3.5" />
                        {t.actions.viewDetails}
                      </span>
                    </span>
                    <span className="flex flex-col items-center justify-center gap-2 self-stretch border-s border-cream-200 ps-3">
                      <StatusBadge status={current} label={status[current]} size="xs" />
                      <span className="whitespace-nowrap font-extrabold text-stone-700">{row.total}</span>
                      <span className="text-[10px] font-semibold text-stone-400">{row.time}</span>
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
