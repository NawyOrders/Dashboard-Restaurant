import { useId, useState } from 'react'
import type { T } from '../i18n'
import { numberLocale } from '../orders'

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
  const gradientId = useId()
  const W = 640
  const H = 240
  const PAD_X = 24
  const PAD_TOP = 20
  const PAD_BOTTOM = 28
  const max = Math.max(Math.ceil((Math.max(...values, 0) * 1.15) / 4000) * 4000, 4000)
  const stepX = values.length > 1 ? (W - PAD_X * 2) / (values.length - 1) : 0
  const y = (value: number) => PAD_TOP + (1 - value / max) * (H - PAD_TOP - PAD_BOTTOM)
  const xFor = (index: number) => (rtl ? W - PAD_X - index * stepX : PAD_X + index * stepX)
  const points = values.map((value, index) => [xFor(index), y(value)] as const)
  const line = points.map(([x, py], index) => `${index === 0 ? 'M' : 'L'}${x},${py}`).join(' ')
  const area = `${line} L${points[points.length - 1][0]},${H - PAD_BOTTOM} L${points[0][0]},${H - PAD_BOTTOM} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio)
  const format = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
  const axisLabel = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}K` : String(value))
  const displayLabels = rtl ? [...labels].reverse() : labels

  const activeIndex = Math.min(active, values.length - 1)
  const [activeX, activeY] = points[activeIndex]
  const tooltipLeft = Math.min(90, Math.max(10, (activeX / W) * 100))

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="w-full min-w-0">
      <div className="flex gap-1.5 sm:gap-3">
        <div aria-hidden="true" className="relative w-9 shrink-0 text-end text-[10px] font-semibold text-stone-500 tabular-nums sm:w-11 sm:text-[11px]">
          {ticks.map((tick) => (
            <span key={tick} className="absolute inset-x-0 -translate-y-1/2" style={{ top: `${(y(tick) / H) * 100}%` }}>
              {axisLabel(tick)}
            </span>
          ))}
        </div>
        <div className="relative h-[200px] min-w-0 flex-1 sm:h-[230px]">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-full w-full" role="img" aria-label={ariaLabel}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: 'rgb(var(--c-brand-600))' }} stopOpacity="0.18" />
                <stop offset="100%" style={{ stopColor: 'rgb(var(--c-brand-600))' }} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={W}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-line"
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : '3 5'}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            <line
              x1={activeX}
              x2={activeX}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              className="stroke-gold-400"
              strokeWidth="1"
              strokeDasharray="4 5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={line}
              fill="none"
              className="stroke-brand-600"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div
            className="pointer-events-none absolute z-10 rounded-lg bg-stone-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-soft"
            style={{ left: `${tooltipLeft}%`, top: `${(activeY / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}
          >
            <bdi>{format(values[activeIndex])}</bdi> <span className="font-semibold text-stone-300">{currency}</span>
          </div>

          {points.map(([x, py], index) => (
            <button
              key={index}
              type="button"
              aria-label={`${pointLabel} ${displayLabels[index]}: ${currency} ${format(values[index])}`}
              aria-pressed={index === activeIndex}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActive(index)
                }
              }}
              className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              style={{ left: `${(x / W) * 100}%`, top: `${(py / H) * 100}%` }}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none block rounded-full border-2 border-brand-600 ${
                  index === activeIndex ? 'h-3 w-3 bg-brand-600 ring-4 ring-brand-600/10' : 'h-2.5 w-2.5 bg-white'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="ms-[42px] grid sm:ms-[56px]" style={{ gridTemplateColumns: `repeat(${displayLabels.length}, minmax(0, 1fr))` }}>
        {displayLabels.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className={`min-w-0 break-words text-center text-[10px] leading-5 sm:text-[11px] ${
              index === activeIndex ? 'font-extrabold text-brand-600' : 'font-semibold text-stone-500'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export type ChartSeries = { week: { values: number[]; labels: string[] }; month: { values: number[]; labels: string[] } }

// `series` carries the real revenue numbers; without it the panel says there is
// nothing to chart yet instead of drawing sample values.
export function SalesChart({ t, series }: { t: T; series?: ChartSeries }) {
  const [tab, setTab] = useState<'week' | 'month'>('week')
  const { title, subtitle, monthSubtitle, week, month, days, monthLabels, currency, chartLabel, pointLabel } = t.chart
  const number = new Intl.NumberFormat(numberLocale(t.dir === 'rtl' ? 'ar' : 'en'), { maximumFractionDigits: 0 })
  const locale = numberLocale(t.dir === 'rtl' ? 'ar' : 'en')
  const active = series ? series[tab] : null
  const values = active ? active.values : []
  const hasData = values.length > 0 && values.some((value) => value > 0)

  return (
    <section dir={t.dir} className="dashboard-panel flex h-full min-w-0 flex-col p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-stone-800 sm:text-lg">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {tab === 'week'
              ? subtitle(number.format((active?.values ?? []).reduce((sum, value) => sum + value, 0)))
              : monthSubtitle(number.format((active?.values ?? []).reduce((sum, value) => sum + value, 0)))}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-xl bg-cream-50 p-1">
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
              className={`min-h-9 min-w-14 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
                tab === key ? 'bg-brand-600 text-white' : 'text-stone-500 hover:bg-white hover:text-stone-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-end">
        {hasData ? (
          <Chart
            key={tab}
            values={values}
            labels={active ? active.labels : tab === 'week' ? days : monthLabels}
            currency={currency}
            ariaLabel={chartLabel}
            pointLabel={pointLabel}
            locale={locale}
            rtl={t.dir === 'rtl'}
          />
        ) : (
          <p className="m-auto py-10 text-sm font-semibold text-stone-500">{t.home.noSales}</p>
        )}
      </div>
    </section>
  )
}
