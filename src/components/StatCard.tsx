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
      className={`dashboard-panel group flex min-w-0 flex-col items-start p-3.5 text-start transition-colors hover:border-[#D9B45A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2 sm:p-5 ${orderClass}`}
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
      </span>
      <span className="flex w-full flex-wrap items-baseline gap-x-1.5 gap-y-0 text-2xl font-extrabold leading-tight tracking-tight text-[#302B28] tabular-nums sm:text-3xl">
        <bdi>{value}</bdi>
        {suffix && <span className="text-xs font-semibold tracking-normal text-[#756B62] sm:text-sm">{suffix}</span>}
      </span>
      <span className="mt-auto w-full pt-3">
        <span className="flex items-center justify-between gap-2 border-t border-[#E9E1D7] pt-2.5">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${
              up ? 'text-[#1E9E6A]' : 'text-[#C2281A]'
            }`}
          >
            {up ? <ArrowUpIcon className="h-3.5 w-3.5" /> : <ArrowDownIcon className="h-3.5 w-3.5" />}
            <bdi>{delta}</bdi>
          </span>
          <EyeIcon className="h-4 w-4 shrink-0 text-[#8B8177] transition-colors group-hover:text-[#C2281A]" />
        </span>
      </span>
    </button>
  )
}
