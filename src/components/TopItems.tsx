import type { T } from '../i18n'
import { EyeIcon } from '../icons'

export function TopItems({ t, onOpenDetails }: { t: T; onOpenDetails: () => void }) {
  const { title, subtitle, items } = t.topItems
  const max = Math.max(...items.map((item) => item.count), 1)
  const rankedItems = [...items].sort((a, b) => b.count - a.count)

  return (
    <section dir={t.dir} className="dashboard-panel h-full min-w-0 p-4 sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-3 border-b border-[#E9E1D7] pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-[#302B28] sm:text-lg">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#756B62]">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenDetails}
          title={t.actions.viewDetails}
          aria-label={`${t.actions.viewDetails} — ${title}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#E9E1D7] text-[#756B62] transition-colors hover:bg-[#FDF8F1] hover:text-[#C2281A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      </div>
      <ol className="divide-y divide-[#E9E1D7]/70">
        {rankedItems.map((item, i) => (
          <li
            key={item.name}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 py-3.5 last:pb-1"
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-md text-xs font-extrabold tabular-nums ${
                i === 0 ? 'bg-[#D9B45A]/20 text-[#78591F]' : 'bg-[#FDF8F1] text-[#756B62]'
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="min-w-0 break-words text-sm font-bold leading-6 text-[#302B28]">
                  {item.name}
                </span>
                <span className="shrink-0 text-sm font-extrabold leading-6 text-[#302B28] tabular-nums">
                  {item.count}
                </span>
              </div>
              <div aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-[#F6EEE4]">
                <div
                  className="absolute inset-y-0 rounded-full bg-[#C2281A]"
                  style={{
                    width: `${(item.count / max) * 100}%`,
                    insetInlineStart: 0,
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
