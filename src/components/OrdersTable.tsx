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
    <section dir={t.dir} className="dashboard-panel min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E1D7] pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-[#302B28] sm:text-lg">{title}</h3>
          {query.trim() && (
            <p className="mt-1 text-xs font-semibold text-[#756B62]">
              {orders.length} {t.search.results}
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

      {empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-[#FDF8F1] px-4 py-12 text-center">
          <SearchXIcon className="mb-1 h-9 w-9 text-[#8B8177]" />
          <p className="text-sm font-bold text-[#302B28]">{t.search.empty}</p>
          <p className="max-w-xs text-xs leading-5 text-[#756B62]">{t.search.emptyHint}</p>
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
                {orders.map((row) => {
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
            {orders.map((row) => {
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
        </>
      )}
    </section>
  )
}
