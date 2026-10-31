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
  onClick: () => void
  detailsLabel: string
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
  onClick,
  detailsLabel,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — ${detailsLabel}`}
      aria-label={`${label} — ${detailsLabel}`}
      className={`group flex flex-col items-center gap-2 rounded-4xl bg-white p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 active:translate-y-0 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:text-start ${orderClass}`}
    >
      <div
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl sm:order-last sm:h-16 sm:w-16 ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center sm:items-start">
        <p className="mb-0.5 w-full truncate text-xs font-semibold text-stone-500 sm:mb-1 sm:text-sm">
          {label}
        </p>
        <p className="text-xl font-black leading-tight text-stone-800 sm:text-3xl">
          {value} {suffix && <span className="text-xs font-bold text-stone-400 sm:text-sm">{suffix}</span>}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
              up ? 'bg-mint-100 text-mint-600' : 'bg-brand-50 text-brand-500'
            }`}
          >
            {up ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {delta}
          </span>
          <span className="hidden items-center gap-0.5 text-stone-300 group-hover:text-brand-400 sm:inline-flex">
            <EyeIcon className="h-3.5 w-3.5" />
          </span>
        </span>
      </div>
    </button>
  )
}
