import type { T } from '../i18n'
import { EyeIcon } from '../icons'

export function TopItems({ t, onOpenDetails }: { t: T; onOpenDetails: () => void }) {
  const { title, subtitle, items } = t.topItems
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <section className="h-full rounded-4xl bg-white p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-stone-800 sm:text-lg">{title}</h3>
          <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenDetails}
          title={t.actions.viewDetails}
          aria-label={`${t.actions.viewDetails} — ${title}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-stone-300 transition-colors hover:bg-cream-100 hover:text-stone-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      </div>
      <ul className="flex flex-col gap-4">
        {items.map((item, i) => (
          <li
            key={item.name}
            className="grid grid-cols-[2rem_1fr_4.75rem] items-center gap-2.5 sm:grid-cols-[2.5rem_1fr_8rem] sm:gap-3"
          >
            <span className="text-xs font-extrabold text-stone-700 sm:text-sm">{item.count}</span>
            <div className="relative h-4 overflow-hidden rounded-full bg-cream-100">
              <div
                className={`absolute inset-y-0 h-full rounded-full ${
                  i === 0
                    ? 'bg-gradient-to-l from-brand-500 to-brand-600'
                    : i === items.length - 1
                      ? 'bg-gradient-to-l from-brand-100 to-brand-100'
                      : 'bg-gradient-to-l from-brand-400/70 to-brand-500/70'
                }`}
                style={{
                  width: `${(item.count / max) * 100}%`,
                  insetInlineStart: 0,
                }}
              />
            </div>
            <span className="truncate text-end text-xs font-bold text-stone-600 sm:text-sm">
              {item.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
