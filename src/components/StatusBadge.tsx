import type { OrderStatus } from '../types'

export const statusStyle: Record<OrderStatus, string> = {
  new: 'bg-brand-50 text-brand-700',
  preparing: 'bg-[#FBF1D8] text-[#806116]',
  done: 'bg-mint-100 text-[#176B4B]',
}

const dotStyle: Record<OrderStatus, string> = {
  new: 'bg-brand-500',
  preparing: 'bg-gold-500',
  done: 'bg-mint-600',
}

type Props = {
  status: OrderStatus
  label: string
  size?: 'sm' | 'xs'
}

export function StatusBadge({ status, label, size = 'sm' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold ${statusStyle[status]} ${
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle[status]}`} aria-hidden="true" />
      {label}
    </span>
  )
}
