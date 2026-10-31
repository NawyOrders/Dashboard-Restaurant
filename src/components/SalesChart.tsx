import { useState } from 'react'
import type { T } from '../i18n'

const DATA = {
  week: [14800, 12480, 9900, 10600, 8900, 9700, 8300],
  month: [6200, 5800, 6500, 5400],
}

function Chart({
  values,
  labels,
  currency,
  ariaLabel,
  pointLabel,
  locale,
  rtl,
}: {
  values: number[]
  labels: string[]
  currency: string
  ariaLabel: string
  pointLabel: string
  locale: string
  rtl: boolean
}) {
  const [active, setActive] = useState(0)
  const W = 640
  const H = 260
  const PAD_X = 8
  const PAD_TOP = 24
  const PAD_BOTTOM = 32
  const max = Math.max(...values) * 1.15
  const stepX = values.length > 1 ? (W - PAD_X * 2) / (values.length - 1) : 0
  const y = (value: number) => PAD_TOP + (1 - value / max) * (H - PAD_TOP - PAD_BOTTOM)
  const xFor = (index: number) =>
    rtl ? W - PAD_X - index * stepX : PAD_X + index * stepX
  const points = values.map((value, index) => [xFor(index), y(value)] as const)
  const line = points.map(([x, py], index) => `${index === 0 ? 'M' : 'L'}${x},${py}`).join(' ')
  const area = `${line} L${points[points.length - 1][0]},${H - PAD_BOTTOM} L${points[0][0]},${H - PAD_BOTTOM} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio)
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)

  const activeIndex = Math.min(active, values.length - 1)
  const tooltipStart = Math.min(84, Math.max(16, (points[activeIndex][0] / W) * 100))
  const tooltipTop = Math.min(88, Math.max(16, (points[activeIndex][1] / H) * 100))

  return (
    <div className="w-full">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D93B2B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#D93B2B" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#F5E7D3"
              strokeWidth="1"
            />
          ))}
          <path d={area} fill="url(#areaFill)" />
          <path
            d={line}
            fill="none"
            stroke="#D93B2B"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map(([x, py], index) => (
            <g
              key={index}
              tabIndex={0}
              role="button"
              aria-label={`${pointLabel} ${labels[index]}: ${currency} ${format(values[index])}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActive(index)
                }
              }}
              className="chart-point cursor-pointer outline-none"
            >
              <circle cx={x} cy={py} r="15" fill="transparent" />
              <circle
                cx={x}
                cy={py}
                r={index === activeIndex ? 6 : 4.5}
                fill="#fff"
                stroke="#D93B2B"
                strokeWidth={index === activeIndex ? 3 : 2.5}
                className="pointer-events-none transition-all"
              />
            </g>
          ))}
        </svg>

        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[135%] whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg"
          style={{ left: `${tooltipStart}%`, top: `${tooltipTop}%` }}
        >
          {currency} {format(values[activeIndex])}
        </div>
      </div>

      <div className="mt-1 flex w-full px-1">
        {labels.map((label) => (
          <span
            key={label}
            className="min-w-0 flex-1 truncate text-center text-[9px] font-semibold text-stone-400 sm:text-[11px]"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function SalesChart({ t }: { t: T }) {
  const [tab, setTab] = useState<'week' | 'month'>('week')
  const { title, subtitle, monthSubtitle, week, month, days, monthLabels, currency, chartLabel, pointLabel } =
    t.chart
  const locale = t.dir === 'rtl' ? 'ar-EG' : 'en-US'

  return (
    <section className="flex h-full flex-col rounded-4xl bg-white p-4 shadow-card sm:p-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-stone-800 sm:text-lg">{title}</h3>
          <p className="mt-0.5 text-xs text-stone-400">
            {tab === 'week' ? subtitle : monthSubtitle}
          </p>
        </div>
        <div className="flex rounded-xl bg-cream-100 p-1">
          {(
            [
              { key: 'week', label: week },
              { key: 'month', label: month },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`min-h-[36px] rounded-lg px-4 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${
                tab === key ? 'bg-brand-600 text-white shadow' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-end pt-2">
        <Chart
          key={tab}
          values={tab === 'week' ? DATA.week : DATA.month}
          labels={tab === 'week' ? days : monthLabels}
          currency={currency}
          ariaLabel={chartLabel}
          pointLabel={pointLabel}
          locale={locale}
          rtl={t.dir === 'rtl'}
        />
      </div>
    </section>
  )
}
