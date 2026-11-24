import type { T } from '../i18n'
import { MoreIcon } from '../icons'

export function TopItems({ t, onOpenDetails }: { t: T; onOpenDetails: () => void }) {
  const { title, subtitle, items } = t.topItems
  const max = Math.max(...items.map((item) => item.count), 1)
  const rankedItems = [...items].sort((a, b) => b.count - a.count)

  return (
    <section dir={t.dir} className="dashboard-panel flex h-full min-w-0 flex-col p-4 sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-stone-800 sm:text-lg">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenDetails}
          title={t.actions.viewDetails}
          aria-label={`${t.actions.viewDetails} — ${title}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      </div>

      <ol className="mt-2 flex flex-1 flex-col justify-center gap-3">
        {rankedItems.map((item) => (
          <li key={item.name} className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="min-w-0 break-words text-sm font-bold leading-6 text-stone-700">{item.name}</span>
              <bdi className="shrink-0 text-sm font-extrabold tabular-nums text-stone-700">{item.count}</bdi>
            </div>
            <div aria-hidden="true" className="relative h-2.5 overflow-hidden rounded-full bg-cream-100">
              <div
                className="absolute inset-y-0 rounded-full bg-gradient-to-r from-brand-600 to-[#F07A6E]"
                style={{ width: `${(item.count / max) * 100}%`, insetInlineStart: 0 }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
