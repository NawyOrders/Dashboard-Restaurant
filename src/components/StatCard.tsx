import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from '../icons'

type Props = {
  label: string
  value: string
  suffix?: string
  delta: string
  up: boolean
  icon: ReactNode
  iconBg: string
  orderClass: string
}

export function StatCard({ label, value, suffix, delta, up, icon, iconBg, orderClass }: Props) {
  return (
    <div
      className={`bg-white rounded-4xl shadow-card p-5 flex flex-col items-center text-center gap-2 sm:flex-row sm:items-center sm:text-start sm:gap-4 ${orderClass}`}
    >
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center shrink-0 sm:order-last ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start">
        <p className="text-sm font-semibold text-stone-500 mb-1 truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-stone-800 leading-tight">
          {value}{' '}
          {suffix && <span className="text-sm font-bold text-stone-400">{suffix}</span>}
        </p>
        <span
          className={`inline-flex items-center gap-1 mt-2 text-[11px] font-bold rounded-full px-2.5 py-1 ${
            up ? 'bg-mint-100 text-mint-600' : 'bg-brand-50 text-brand-500'
          }`}
        >
          {up ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
          {delta}
        </span>
      </div>
    </div>
  )
}
