import type { T } from '../i18n'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'

type Status = 'new' | 'preparing' | 'done'

const statusStyle: Record<Status, string> = {
  new: 'bg-brand-50 text-brand-600',
  preparing: 'bg-gold-300/40 text-gold-600',
  done: 'bg-mint-100 text-mint-600',
}

export function OrdersTable({ t }: { t: T }) {
  const { title, viewAll, cols, rows, status } = t.orders
  const isRtl = t.dir === 'rtl'
  const Arrow = isRtl ? ArrowLeftIcon : ArrowRightIcon

  return (
    <section className="bg-white rounded-4xl shadow-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-stone-800 text-lg">{title}</h3>
        <a href="#" className="flex items-center gap-1.5 text-brand-600 text-sm font-bold hover:text-brand-700">
          {viewAll}
          <Arrow className="w-4 h-4" />
        </a>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-stone-400 text-xs font-bold border-b border-cream-200">
              <th className="text-start py-3 pe-4 font-bold">{cols.id}</th>
              <th className="text-start py-3 pe-4 font-bold">{cols.customer}</th>
              <th className="text-start py-3 pe-4 font-bold">{cols.items}</th>
              <th className="text-start py-3 pe-4 font-bold">{cols.total}</th>
              <th className="text-start py-3 font-bold">{cols.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/60 transition-colors">
                <td className="py-3.5 pe-4 font-extrabold text-stone-700 whitespace-nowrap">{r.id}</td>
                <td className="py-3.5 pe-4 font-bold text-stone-600 whitespace-nowrap">{r.customer}</td>
                <td className="py-3.5 pe-4 text-stone-500">{r.items}</td>
                <td className="py-3.5 pe-4 font-bold text-stone-700 whitespace-nowrap">{r.total}</td>
                <td className="py-3.5">
                  <span className={`text-xs font-bold rounded-full px-3 py-1.5 ${statusStyle[r.status as Status]}`}>
                    {status[r.status as Status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="border border-cream-200 rounded-2xl p-4 grid grid-cols-[1fr_auto] gap-4 items-center">
            <div className="min-w-0">
              <span className="font-extrabold text-stone-700">{r.id}</span>
              <p className="font-bold text-stone-700 text-sm mt-1">{r.customer}</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{r.items}</p>
            </div>
            <div className="border-s border-cream-200 ps-4 self-stretch flex flex-col items-center justify-center gap-2">
              <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${statusStyle[r.status as Status]}`}>
                {status[r.status as Status]}
              </span>
              <span className="font-extrabold text-stone-700 whitespace-nowrap">{r.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
