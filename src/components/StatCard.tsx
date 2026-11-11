import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, EyeIcon } from '../icons'

type Props = {
  label: string
  value: string
  suffix?: string
  delta: string
  up: boolean
  icon: ReactNode
  iconBg: string
  orderClass: string
  spark: number[]
  onClick: () => void
  detailsLabel: string
}

function sparklinePath(values: number[], width = 96, height = 28): string {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : width
  return values
    .map((value, index) => {
      const x = index * step
      const y = height - ((value - min) / span) * (height - 4) - 2
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function StatCard({
  label,
  value,
  suffix,
  delta,
  up,
  icon,
  iconBg,
  orderClass,
  spark,
  onClick,
  detailsLabel,
}: Props) {
  const line = sparklinePath(spark)
  const area = line ? `${line} L96 28 L0 28 Z` : ''
  const gradientId = `spark-${orderClass}`
  const trendColor = up ? 'text-[#1E9E6A]' : 'text-[#C2281A]'

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — ${detailsLabel}`}
      aria-label={`${label} — ${detailsLabel}`}
      className={`dashboard-panel group flex min-w-0 flex-col items-start p-3.5 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D9B45A] hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2 sm:p-5 ${orderClass}`}
    >
      <span className="mb-3 flex w-full items-center gap-2.5">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg [&>svg]:h-5 [&>svg]:w-5 ${iconBg}`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-xs font-semibold leading-5 text-[#756B62] sm:text-sm">
          {label}
        </span>
        <EyeIcon className="h-4 w-4 shrink-0 text-[#8B8177] transition-colors group-hover:text-[#C2281A]" />
      </span>
      <span className="flex w-full flex-wrap items-baseline gap-x-1.5 gap-y-0 text-2xl font-extrabold leading-tight tracking-tight text-[#302B28] tabular-nums sm:text-3xl">
        <bdi>{value}</bdi>
        {suffix && <span className="text-xs font-semibold tracking-normal text-[#756B62] sm:text-sm">{suffix}</span>}
      </span>
      <span className="mt-auto w-full pt-3">
        <span className="flex items-end justify-between gap-2 border-t border-[#E9E1D7] pt-2.5">
          <span className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${trendColor}`}>
            {up ? <ArrowUpIcon className="h-3.5 w-3.5" /> : <ArrowDownIcon className="h-3.5 w-3.5" />}
            <bdi>{delta}</bdi>
          </span>
          <svg
            viewBox="0 0 96 28"
            className={`h-7 w-20 shrink-0 ${trendColor}`}
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {area && <path d={area} fill={`url(#${gradientId})`} />}
            {line && (
              <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </span>
      </span>
    </button>
  )
}
