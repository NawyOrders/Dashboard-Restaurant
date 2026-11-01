import type { T } from '../i18n'

export function TopItems({ t }: { t: T }) {
  const { title, subtitle, items } = t.topItems
  const max = items[0].count

  return (
    <section className="bg-white rounded-4xl shadow-card p-6 h-full">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-extrabold text-stone-800 text-lg">{title}</h3>
          <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
        </div>
        <button className="text-stone-300 hover:text-stone-500 font-black tracking-widest">•••</button>
      </div>
      <ul className="flex flex-col gap-4">
        {items.map((item, i) => (
          <li key={item.name} className="grid grid-cols-[2.5rem_1fr_6rem] sm:grid-cols-[2.5rem_1fr_8rem] items-center gap-3">
            <span className="font-extrabold text-stone-700 text-sm">{item.count}</span>
            <div className="relative h-4 rounded-full bg-cream-100 overflow-hidden">
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
            <span className="text-sm font-bold text-stone-600 truncate text-end">{item.name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
