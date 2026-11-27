import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from '../icons'

type Props = {
  label: string
  value: string
  suffix?: string
  delta: string
  up: boolean
  icon: ReactNode
  iconClass: string
  onClick: () => void
  detailsLabel: string
}

export function StatCard({ label, value, suffix, delta, up, icon, iconClass, onClick, detailsLabel }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — ${detailsLabel}`}
      aria-label={`${label} — ${detailsLabel}`}
      className="dashboard-panel group flex min-w-0 flex-col items-start p-4 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:p-5"
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0 pt-1 text-xs font-semibold leading-5 text-stone-500 sm:text-sm">{label}</span>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-sm [&>svg]:h-6 [&>svg]:w-6 ${iconClass}`}>
          {icon}
        </span>
      </span>
      <span className="mt-3 flex w-full flex-wrap items-baseline gap-x-1.5 gap-y-0 text-2xl font-extrabold leading-tight tracking-tight text-stone-800 tabular-nums sm:text-3xl">
        <bdi>{value}</bdi>
        {suffix && <span className="text-xs font-semibold tracking-normal text-stone-500 sm:text-sm">{suffix}</span>}
      </span>
      <span className={`mt-3 inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums ${up ? 'bg-mint-100 text-[#176B4B]' : 'bg-brand-50 text-brand-700'}`}>
        {up ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
        <bdi>{delta}</bdi>
      </span>
    </button>
  )
}
