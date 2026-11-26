import type { ReactNode } from 'react'
import { SpinnerIcon } from '../icons'

// Small shared pieces for the management screens. They reuse the exact
// classes the Settings and Menu pages already use, so the look stays the same.
export const INPUT =
  'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:bg-cream-50 disabled:text-stone-400'

export const BTN_PRIMARY =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-60'

export const BTN_GHOST =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-60'

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-stone-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-stone-500">{hint}</p>}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-60 ${checked ? 'bg-mint-600' : 'bg-stone-300'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-6' : 'start-1'}`} />
    </button>
  )
}

const PILL: Record<string, string> = {
  good: 'bg-mint-100 text-mint-600',
  gold: 'bg-[#FBF1D8] text-[#806116]',
  muted: 'bg-stone-100 text-stone-500',
  bad: 'bg-brand-50 text-brand-700',
}

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${PILL[tone]}`}>{children}</span>
}

export function LoadingPanel({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite" className="dashboard-panel flex items-center gap-3 p-6 text-sm font-semibold text-stone-500">
      <SpinnerIcon className="h-5 w-5 text-brand-600" />
      {text}
    </div>
  )
}

export function ErrorPanel({ text, retry, onRetry }: { text: string; retry: string; onRetry: () => void }) {
  return (
    <div role="alert" className="dashboard-panel flex flex-wrap items-center justify-between gap-3 p-6 text-sm font-semibold text-brand-700">
      <span>{text}</span>
      <button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
        {retry}
      </button>
    </div>
  )
}

export function EmptyPanel({ text }: { text: string }) {
  return <p className="dashboard-panel p-6 text-center text-sm font-semibold text-stone-500">{text}</p>
}

// ISO UTC <-> value of <input type="datetime-local"> (local time, no zone).
export function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
