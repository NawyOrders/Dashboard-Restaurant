import { useId, useState } from 'react'
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
  const gradientId = useId()
  const W = 640
  const H = 260
  const PAD_X = W / (values.length * 2)
  const PAD_TOP = 24
  const PAD_BOTTOM = 24
  const max = Math.ceil((Math.max(...values) * 1.15) / 4000) * 4000
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

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="w-full min-w-0">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg bg-[#FDF8F1] px-3 py-2.5"
      >
        <span className="text-xs font-semibold leading-5 text-[#756B62]">
          {pointLabel} · {labels[activeIndex]}
        </span>
        <span className="inline-flex items-baseline gap-1.5 text-lg font-extrabold text-[#302B28] tabular-nums">
          <bdi>{format(values[activeIndex])}</bdi>
          <span className="text-xs font-semibold text-[#756B62]">{currency}</span>
        </span>
      </div>
      <div className="flex gap-1.5 sm:gap-3">
        <div aria-hidden="true" className="relative w-10 shrink-0 text-end text-[11px] font-semibold text-[#756B62] tabular-nums sm:w-12 sm:text-xs">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute inset-x-0 -translate-y-1/2"
              style={{ top: `${(y(tick) / H) * 100}%` }}
            >
              {format(tick)}
            </span>
          ))}
        </div>
        <div className="relative h-[216px] min-w-0 flex-1 sm:h-[240px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-full w-full"
            role="img"
            aria-label={ariaLabel}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C2281A" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#C2281A" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={W}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#E9E1D7"
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : '3 5'}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            <line
              x1={points[activeIndex][0]}
              x2={points[activeIndex][0]}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="#D9B45A"
              strokeWidth="1"
              strokeDasharray="4 5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={line}
              fill="none"
              stroke="#C2281A"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map(([x, py], index) => (
            <button
              key={index}
              type="button"
              aria-label={`${pointLabel} ${labels[index]}: ${currency} ${format(values[index])}`}
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
              className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2"
              style={{ left: `${(x / W) * 100}%`, top: `${(py / H) * 100}%` }}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none block rounded-full border-2 border-[#C2281A] ${
                  index === activeIndex
                    ? 'h-3 w-3 bg-[#C2281A] ring-4 ring-[#C2281A]/10'
                    : 'h-2.5 w-2.5 bg-white'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="ms-[46px] grid sm:ms-[60px]" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((label, index) => (
          <span
            key={label}
            className={`min-w-0 break-words text-center text-[11px] leading-5 sm:text-xs ${
              index === activeIndex ? 'font-extrabold text-[#C2281A]' : 'font-semibold text-[#756B62]'
            }`}
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
    <section dir={t.dir} className="dashboard-panel flex h-full min-w-0 flex-col p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#E9E1D7] pb-4">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-7 text-[#302B28] sm:text-lg">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#756B62]">
            {tab === 'week' ? subtitle : monthSubtitle}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-xl bg-[#FDF8F1] p-1">
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
              className={`min-h-11 min-w-11 rounded-lg px-4 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2 ${
                tab === key ? 'bg-[#C2281A] text-white' : 'text-[#756B62] hover:bg-white hover:text-[#302B28]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-end">
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
