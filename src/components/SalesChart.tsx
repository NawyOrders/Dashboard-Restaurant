import { useState } from 'react'
import type { T } from '../i18n'

const VALUES = [14800, 12480, 9900, 10600, 8900, 9700, 8300]

function Chart({ days, currency }: { days: string[]; currency: string }) {
  const W = 640
  const H = 260
  const PAD_X = 8
  const PAD_TOP = 24
  const PAD_BOTTOM = 32
  const max = 16000
  const stepX = (W - PAD_X * 2) / (days.length - 1)
  const y = (v: number) => PAD_TOP + (1 - v / max) * (H - PAD_TOP - PAD_BOTTOM)
  const points = VALUES.map((v, i) => [PAD_X + i * stepX, y(v)] as const)
  const line = points.map(([x, py], i) => `${i === 0 ? 'M' : 'L'}${x},${py}`).join(' ')
  const area = `${line} L${points[points.length - 1][0]},${H - PAD_BOTTOM} L${points[0][0]},${H - PAD_BOTTOM} Z`
  const ticks = [0, 4000, 8000, 12000, 16000]

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="relative min-w-[480px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="sales chart">
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D93B2B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#D93B2B" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <line
              key={t}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y(t)}
              y2={y(t)}
              stroke="#F5E7D3"
              strokeWidth="1"
            />
          ))}
          <path d={area} fill="url(#areaFill)" />
          <path d={line} fill="none" stroke="#D93B2B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map(([x, py], i) => (
            <g key={i}>
              <circle cx={x} cy={py} r="5" fill="#fff" stroke="#D93B2B" strokeWidth="2.5" />
            </g>
          ))}
        </svg>
        {/* Tooltip on Thursday (index 1) */}
        <div
          className="absolute bg-stone-800 text-white text-[11px] font-bold rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none hidden sm:block"
          style={{ insetInlineStart: `${(points[1][0] / W) * 100}%`, top: `${(points[1][1] / H) * 100 - 12}%`, transform: 'translate(-50%, -100%)' }}
        >
          {currency} 12,480
        </div>
        <div className="flex justify-between min-w-[480px] px-1 mt-1">
          {days.map((d) => (
            <span key={d} className="text-[11px] text-stone-400 font-semibold w-12 text-center">
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SalesChart({ t }: { t: T }) {
  const [tab, setTab] = useState<'week' | 'month'>('week')
  const { title, subtitle, week, month, days, currency } = t.chart

  return (
    <section className="bg-white rounded-4xl shadow-card p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <h3 className="font-extrabold text-stone-800 text-lg">{title}</h3>
          <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex bg-cream-100 rounded-xl p-1">
          {(
            [
              { key: 'week', label: week },
              { key: 'month', label: month },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tab === key ? 'bg-brand-600 text-white shadow' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-end">
        <Chart days={days} currency={currency} />
      </div>
    </section>
  )
}
