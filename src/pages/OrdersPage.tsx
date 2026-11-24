import { useMemo, useState } from 'react'
import type { Api } from '../api'
import type { Lang, T } from '../i18n'
import type { LiveOrder, LiveOrderPayment, LiveOrderStatus } from '../types'
import { LIVE_STATUS_CODE, formatOrderTotal } from '../orders'
import {
  BanknoteIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  CreditCardIcon,
  SpinnerIcon,
  WalletIcon,
} from '../icons'

export type OrdersPageProps = {
  t: T
  lang: Lang
  api: Api
  onToast: (message: string) => void
}

const COLUMNS: LiveOrderStatus[] = ['new', 'preparing', 'ready', 'delivered']

const COLUMN_STYLE: Record<LiveOrderStatus, { border: string; surface: string; badge: string }> = {
  new: { border: 'border-t-brand-500', surface: 'bg-brand-50/40', badge: 'bg-brand-50 text-brand-700' },
  preparing: { border: 'border-t-gold-400', surface: 'bg-[#FBF1D8]/40', badge: 'bg-[#FBF1D8] text-[#806116]' },
  ready: { border: 'border-t-mint-600', surface: 'bg-mint-100/30', badge: 'bg-mint-100 text-[#176B4B]' },
  delivered: { border: 'border-t-stone-300', surface: 'bg-cream-50', badge: 'bg-cream-100 text-stone-500' },
}

const PRIMARY_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
const OUTLINE_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
const GOLD_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D99A2B] px-4 text-sm font-bold text-white transition-colors hover:bg-[#C0871F] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-200'
const MINT_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-mint-600 px-4 text-sm font-bold text-white transition-colors hover:bg-[#178257] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-100'
const MUTED_BUTTON = 'inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-cream-100 px-4 text-sm font-bold text-stone-400'

function PaymentIcon({ method, className }: { method: LiveOrderPayment; className?: string }) {
  if (method === 'cash') return <BanknoteIcon className={className} />
  if (method === 'instapay') return <CreditCardIcon className={className} />
  return <WalletIcon className={className} />
}

export default function OrdersPage({ t, lang, api, onToast }: OrdersPageProps) {
  const [overrides, setOverrides] = useState<Record<string, LiveOrderStatus>>({})
  const [rejected, setRejected] = useState<string[]>([])
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const orders = useMemo(
    () =>
      t.liveOrders.itemsList
        .filter((order) => !rejected.includes(order.id))
        .map((order) => ({ ...order, status: overrides[order.id] ?? order.status })),
    [t, overrides, rejected],
  )

  const grouped = useMemo(() => {
    const groups: Record<LiveOrderStatus, LiveOrder[]> = { new: [], preparing: [], ready: [], delivered: [] }
    for (const order of orders) groups[order.status].push(order)
    return groups
  }, [orders])

  const transition = async (order: LiveOrder, next: LiveOrderStatus) => {
    setError(null)
    setPending((current) => ({ ...current, [order.id]: true }))
    try {
      await api.transitionOrderStatus(order.id, LIVE_STATUS_CODE[next])
      setOverrides((current) => ({ ...current, [order.id]: next }))
      onToast(t.liveOrders.moved)
    } catch {
      setError(t.liveOrders.transitionError)
    } finally {
      setPending((current) => {
        const updated = { ...current }
        delete updated[order.id]
        return updated
      })
    }
  }

  const reject = (order: LiveOrder) => {
    setRejected((current) => [...current, order.id])
    onToast(t.liveOrders.rejected)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold leading-tight text-stone-800 sm:text-3xl">{t.liveOrders.title}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-bold text-[#176B4B]">
              <span className="h-2 w-2 rounded-full bg-mint-600" aria-hidden="true" />
              {t.liveOrders.connected}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">{t.liveOrders.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-stone-600">
          <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
          {orders.length} {t.liveOrders.items}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label={t.actions.close} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {COLUMNS.map((status) => {
          const style = COLUMN_STYLE[status]
          const items = grouped[status]
          return (
            <section
              key={status}
              aria-label={t.liveOrders.columns[status]}
              className={`min-w-[280px] shrink-0 rounded-2xl border border-line border-t-4 p-3 lg:min-w-0 ${style.border} ${style.surface}`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-stone-700">{t.liveOrders.columns[status]}</h2>
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${style.badge}`}>
                  {items.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {items.map((order) =>
                  status === 'new' ? (
                    <DetailedOrderCard
                      key={order.id}
                      order={order}
                      t={t}
                      lang={lang}
                      isPending={Boolean(pending[order.id])}
                      onAccept={() => void transition(order, 'preparing')}
                      onReject={() => reject(order)}
                      onReceipt={() => onToast(t.liveOrders.receiptHint)}
                    />
                  ) : (
                    <CompactOrderCard
                      key={order.id}
                      order={order}
                      t={t}
                      lang={lang}
                      isPending={Boolean(pending[order.id])}
                      onAdvance={() => void transition(order, status === 'preparing' ? 'ready' : 'delivered')}
                      onPreparing={() => onToast(t.liveOrders.preparing)}
                    />
                  ),
                )}
                {items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line bg-white/60 p-4 text-center text-xs font-semibold text-stone-500">
                    {t.liveOrders.empty}
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function DetailedOrderCard({ order, t, lang, isPending, onAccept, onReject, onReceipt }: {
  order: LiveOrder
  t: T
  lang: Lang
  isPending: boolean
  onAccept: () => void
  onReject: () => void
  onReceipt: () => void
}) {
  return (
    <article className="rounded-2xl border-2 border-brand-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <bdi className="text-sm font-extrabold tabular-nums text-stone-600">{order.id}</bdi>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">
          <BellIcon className="h-4 w-4" />
        </span>
      </div>

      <h3 className="mt-2 text-lg font-extrabold leading-tight text-stone-800">{order.customer}</h3>
      {order.phone && (
        <p className="mt-0.5 text-xs text-stone-500">
          <span>{lang === 'ar' ? 'رقم العميل : ' : 'Customer Phone: '}</span>
          <bdi dir="ltr" className="tabular-nums font-medium">{order.phone}</bdi>
        </p>
      )}
      <p className="mt-1 text-xs text-stone-500">
        {order.itemCount} {t.liveOrders.items} · {t.liveOrders[order.fulfilment]}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {order.lines.map((line, index) => (
          <li key={`${order.id}-${index}`} className="flex items-center gap-2 rounded-xl bg-cream-50 p-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold-300 to-[#D99A2B] text-lg" aria-hidden="true">
              🍔
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-stone-700">{line.name}</span>
              {line.extras && <span className="block truncate text-[10px] text-stone-500">{line.extras}</span>}
              {line.notes && <span className="block truncate text-[10px] text-brand-600">{line.notes}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
          <ClockIcon className="h-3.5 w-3.5" />
          {t.liveOrders.since} {order.minutes} {t.liveOrders.minute}
        </span>
        <span className="text-base font-extrabold tabular-nums text-brand-600">{formatOrderTotal(order.total, lang)}</span>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-white p-2.5">
        <p className="text-[11px] font-bold text-stone-500">{t.liveOrders.payment}</p>
        <p className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-stone-700">
          <PaymentIcon method={order.payment} className="h-4 w-4 text-brand-600" />
          {t.liveOrders[order.payment]}
        </p>
        {order.paymentConfirmed && (
          <div className="mt-2 flex items-start gap-2 text-[11px] text-stone-600">
            <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-600" />
            <span>
              {t.liveOrders.paymentConfirmed}
              {order.payment !== 'cash' && (
                <button type="button" onClick={onReceipt} className="mt-1 block text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
                  {t.liveOrders.viewReceipt}
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button type="button" onClick={onAccept} disabled={isPending} className={PRIMARY_BUTTON}>
          {isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
          {t.liveOrders.accept}
        </button>
        <button type="button" onClick={onReject} disabled={isPending} className={OUTLINE_BUTTON}>
          {t.liveOrders.reject}
        </button>
      </div>
    </article>
  )
}

function CompactOrderCard({ order, t, lang, isPending, onAdvance, onPreparing }: {
  order: LiveOrder
  t: T
  lang: Lang
  isPending: boolean
  onAdvance: () => void
  onPreparing: () => void
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <bdi className="text-sm font-extrabold tabular-nums text-stone-600">{order.id}</bdi>
      <h3 className="mt-2 text-base font-extrabold leading-tight text-stone-800">{order.customer}</h3>
      <p className="mt-0.5 text-xs text-stone-500">
        {order.itemCount} {t.liveOrders.items} · {t.liveOrders[order.fulfilment]}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
          <ClockIcon className="h-3.5 w-3.5" />
          {t.liveOrders.since} {order.minutes} {t.liveOrders.minute}
        </span>
        <span className="text-base font-extrabold tabular-nums text-brand-600">{formatOrderTotal(order.total, lang)}</span>
      </div>

      <div className="mt-3">
        {order.status === 'preparing' && (
          <button
            type="button"
            onClick={onAdvance}
            disabled={isPending}
            className={GOLD_BUTTON}
          >
            {isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            {order.id === '#1041' ? t.liveOrders.preparing : t.liveOrders.markReady}
          </button>
        )}
        {order.status === 'ready' && (
          <button type="button" onClick={onAdvance} disabled={isPending} className={MINT_BUTTON}>
            {isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            {t.liveOrders.deliver}
          </button>
        )}
        {order.status === 'delivered' && (
          <div className="flex justify-center pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-4 py-1.5 text-xs font-bold text-stone-500">
              <CheckCircleIcon className="h-4 w-4 text-stone-400" />
              {t.liveOrders.completed}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
