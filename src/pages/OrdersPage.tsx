import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminOrderDetails, Api } from '../api'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import type { LiveOrder, LiveOrderPayment, LiveOrderStatus } from '../types'
import { formatOrderTotal, mapLiveOrderStatus, transitionCodeFor } from '../orders'
import { useOrdersHub, type OrdersHubConfig, type OrderPlacedNotificationPayload } from '../realtime/ordersHub'
import { useLiveOrders } from '../useOrders'
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
  // SignalR hub settings for live "OrderPlaced" events; null in mock mode.
  ordersHub?: OrdersHubConfig | null
  // Permission keys from the signed-in session (API reference section 5).
  // Action buttons the user is not entitled to are hidden; the backend still
  // enforces the same permissions server-side.
  permissions?: readonly string[]
}

const COLUMNS: LiveOrderStatus[] = ['new', 'preparing', 'ready', 'delivered']

const COLUMN_STYLE: Record<LiveOrderStatus, { border: string; surface: string; badge: string }> = {
  new: { border: 'border-t-brand-500', surface: 'bg-brand-50/40', badge: 'bg-brand-50 text-brand-700' },
  preparing: { border: 'border-t-gold-400', surface: 'bg-gold-50/40', badge: 'bg-gold-50 text-gold-800' },
  ready: { border: 'border-t-mint-600', surface: 'bg-mint-100/30', badge: 'bg-mint-100 text-[#176B4B]' },
  delivered: { border: 'border-t-stone-300', surface: 'bg-cream-50', badge: 'bg-cream-100 text-stone-500' },
}

const PRIMARY_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
const OUTLINE_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
const GOLD_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-bold text-on-gold transition-colors hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-200'
const MINT_BUTTON = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-mint-600 px-4 text-sm font-bold text-white transition-colors hover:bg-[#178257] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-100'

function PaymentIcon({ method, className }: { method: LiveOrderPayment; className?: string }) {
  if (method === 'cash') return <BanknoteIcon className={className} />
  if (method === 'instapay') return <CreditCardIcon className={className} />
  return <WalletIcon className={className} />
}

export default function OrdersPage({ t, lang, api, onToast, ordersHub = null, permissions = [] }: OrdersPageProps) {
  const canAccept = can(permissions, PERMISSIONS.ordersAccept)
  const canReject = can(permissions, PERMISSIONS.ordersReject)
  const canUpdateStatus = can(permissions, PERMISSIONS.ordersStatusUpdate)
  const canViewReceipt = can(permissions, PERMISSIONS.paymentsView)
  const canConfirmProof = can(permissions, PERMISSIONS.paymentsProofConfirm)
  const canRejectProof = can(permissions, PERMISSIONS.paymentsProofReject)
  const orderPlaced = useOrdersHub(ordersHub)
  const announceOrderPlaced = useCallback(
    (payload: OrderPlacedNotificationPayload) => {
      onToast(`${t.liveOrders.newOrder} · ${payload.orderNumber}`)
    },
    [onToast, t],
  )
  const { state, orders: remoteOrders, reload } = useLiveOrders(api, lang, orderPlaced, announceOrderPlaced)
  const activeCount = remoteOrders.filter((order) => order.status !== 'delivered').length
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [rejected, setRejected] = useState<string[]>([])
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Rejected (2), cancelled (7) and closed (8) orders leave the board.
  const [details, setDetails] = useState<Record<string, AdminOrderDetails>>({})

  // The list endpoint omits lines and phone; fetch details for the detailed
  // (new-column) cards only.
  useEffect(() => {
    const fresh = remoteOrders.filter((order) => order.statusCode === 0 && order.orderId)
    if (!fresh.length) return
    const controller = new AbortController()
    for (const order of fresh) {
      api
        .getOrderDetails(order.orderId ?? order.id, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setDetails((current) => ({ ...current, [order.id]: result }))
        })
        .catch(() => {
          // Keep the list data when the details call fails.
        })
    }
    return () => controller.abort()
  }, [api, remoteOrders])

  // Rejected (2), cancelled (7) and closed (8) orders leave the board.
  const orders = useMemo(
    () =>
      remoteOrders.flatMap((order) => {
        const statusCode = overrides[order.id] ?? order.statusCode ?? 0
        const status = mapLiveOrderStatus(statusCode)
        if (!status || rejected.includes(order.id)) return []
        const paymentStatus = paymentOverrides[order.id] ?? order.paymentStatus
        const base = { ...order, statusCode, status, paymentStatus, paymentConfirmed: paymentStatus === 3 }
        const detail = details[order.id]
        if (!detail) return [base]
        return [{
          ...base,
          customer: detail.customerName?.trim() || order.customer,
          phone: detail.contactPhone ?? undefined,
          itemCount: detail.items.reduce((sum, item) => sum + item.quantity, 0),
          lines: detail.items.map((item) => ({
            name: item.sizeName ? `${item.itemName} (${item.sizeName})` : item.itemName,
            extras: `×${item.quantity}`,
          })),
          paymentConfirmed:
            paymentStatus === 3 || (paymentOverrides[order.id] === undefined && detail.payment?.paymentStatus === 3),
        }]
      }),
    [remoteOrders, overrides, rejected, paymentOverrides, details],
  )

  const grouped = useMemo(() => {
    const groups: Record<LiveOrderStatus, LiveOrder[]> = { new: [], preparing: [], ready: [], delivered: [] }
    for (const order of orders) groups[order.status].push(order)
    return groups
  }, [orders])

  const run = async (order: LiveOrder, action: () => Promise<void>, apply: () => void, toast: string) => {
    setError(null)
    setPending((current) => ({ ...current, [order.id]: true }))
    try {
      await action()
      apply()
      onToast(toast)
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

  const accept = (order: LiveOrder) =>
    run(
      order,
      () => api.acceptOrder(order.orderId ?? order.id),
      () => setOverrides((current) => ({ ...current, [order.id]: 1 })),
      t.liveOrders.moved,
    )

  const reject = (order: LiveOrder) => {
    // The API requires a non-empty rejection reason.
    const reason = window.prompt(t.liveOrders.rejectReasonPrompt)?.trim()
    if (!reason) return
    void run(
      order,
      () => api.rejectOrder(order.orderId ?? order.id, reason),
      () => setRejected((current) => [...current, order.id]),
      t.liveOrders.rejected,
    )
  }

  const confirmProof = (order: LiveOrder) =>
    run(
      order,
      () => api.confirmPayment(order.orderId ?? order.id),
      () => setPaymentOverrides((current) => ({ ...current, [order.id]: 3 })),
      t.liveOrders.paymentConfirmedToast,
    )

  const rejectProof = (order: LiveOrder) => {
    // The API requires a non-empty reason (max 1000 characters).
    const reason = window.prompt(t.liveOrders.proofReasonPrompt)?.trim()
    if (!reason) return
    void run(
      order,
      () => api.rejectPaymentProof(order.orderId ?? order.id, reason),
      () => setPaymentOverrides((current) => ({ ...current, [order.id]: 4 })),
      t.liveOrders.proofRejectedToast,
    )
  }

  const receipt = async (order: LiveOrder) => {
    if (!order.orderId) {
      onToast(t.liveOrders.receiptHint)
      return
    }
    try {
      const html = await api.getOrderReceiptHtml(order.orderId)
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      onToast(t.liveOrders.receiptHint)
    }
  }

  const advance = (order: LiveOrder) => {
    const next = transitionCodeFor(overrides[order.id] ?? order.statusCode ?? 0, order.fulfilment)
    if (next == null) return
    void run(
      order,
      () => api.transitionOrderStatus(order.orderId ?? order.id, next),
      () => setOverrides((current) => ({ ...current, [order.id]: next })),
      t.liveOrders.moved,
    )
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
          <p className="mt-1 text-sm text-stone-500">{t.liveOrders.subtitle(activeCount)}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-stone-600">
          <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
          {t.liveOrders.ordersCount(orders.length)}
        </span>
      </div>

      {state === 'error' && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          <span>{t.liveOrders.loadError}</span>
          <button type="button" onClick={reload} className="rounded-lg px-3 py-2 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
            {t.actions.retry}
          </button>
        </div>
      )}

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
                      canAccept={canAccept}
                      canReject={canReject}
                      canViewReceipt={canViewReceipt}
                      canConfirmProof={canConfirmProof}
                      canRejectProof={canRejectProof}
                      onConfirmProof={() => void confirmProof(order)}
                      onRejectProof={() => rejectProof(order)}
                      onAccept={() => void accept(order)}
                      onReject={() => reject(order)}
                      onReceipt={() => void receipt(order)}
                    />
                  ) : (
                    <CompactOrderCard
                      key={order.id}
                      order={order}
                      t={t}
                      lang={lang}
                      isPending={Boolean(pending[order.id])}
                      canAdvance={canUpdateStatus}
                      onAdvance={() => void advance(order)}
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

function DetailedOrderCard({ order, t, lang, isPending, canAccept, canReject, canViewReceipt, canConfirmProof, canRejectProof, onConfirmProof, onRejectProof, onAccept, onReject, onReceipt }: {
  order: LiveOrder
  t: T
  lang: Lang
  isPending: boolean
  canAccept: boolean
  canReject: boolean
  canViewReceipt: boolean
  canConfirmProof: boolean
  canRejectProof: boolean
  onConfirmProof: () => void
  onRejectProof: () => void
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
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold-300 to-gold-500 text-lg" aria-hidden="true">
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
              {order.payment !== 'cash' && canViewReceipt && (
                <button type="button" onClick={onReceipt} className="mt-1 block text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
                  {t.liveOrders.viewReceipt}
                </button>
              )}
            </span>
          </div>
        )}
        {order.paymentStatus === 2 && order.payment !== 'cash' && (
          <div className="mt-2">
            <p className="text-[11px] text-stone-600">{t.liveOrders.proofSubmitted}</p>
            {(canConfirmProof || canRejectProof) && (
              <div className="mt-2 flex flex-col gap-2">
                {canConfirmProof && (
                  <button type="button" onClick={onConfirmProof} disabled={isPending} className={MINT_BUTTON}>
                    {t.liveOrders.confirmPayment}
                  </button>
                )}
                {canRejectProof && (
                  <button type="button" onClick={onRejectProof} disabled={isPending} className={OUTLINE_BUTTON}>
                    {t.liveOrders.rejectProof}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {(canAccept || canReject) && (
        <div className="mt-3 flex flex-col gap-2">
          {canAccept && (
            <button type="button" onClick={onAccept} disabled={isPending} className={PRIMARY_BUTTON}>
              {isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
              {t.liveOrders.accept}
            </button>
          )}
          {canReject && (
            <button type="button" onClick={onReject} disabled={isPending} className={OUTLINE_BUTTON}>
              {t.liveOrders.reject}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function CompactOrderCard({ order, t, lang, isPending, canAdvance, onAdvance }: {
  order: LiveOrder
  t: T
  lang: Lang
  isPending: boolean
  canAdvance: boolean
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
        {order.status === 'preparing' && canAdvance && (
          <button
            type="button"
            onClick={onAdvance}
            disabled={isPending}
            className={GOLD_BUTTON}
          >
            {isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            {order.statusCode === 1 ? t.liveOrders.preparing : t.liveOrders.markReady}
          </button>
        )}
        {order.status === 'ready' && canAdvance && (
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

