import { useState } from 'react'
import type { Lang, T } from '../i18n'
import type { OrderRow, OrderStatus, Profile, StatKey } from '../types'
import { ORDER_STATUSES, filterOrders, parseItems } from '../orders'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import {
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  ReceiptIcon,
  SearchIcon,
  SearchXIcon,
  UtensilsIcon,
} from '../icons'

const primaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cream-100 px-4 py-2.5 text-sm font-bold text-stone-600 transition-colors hover:bg-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'
const inputClass =
  'w-full min-h-11 rounded-xl border border-[#D9C9B5] bg-white px-3.5 py-3 text-base text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-200'

export function OrderDetails({
  t,
  order,
  status,
  onClose,
  onUpdateStatus,
}: {
  t: T
  order: OrderRow
  status: OrderStatus
  onClose: () => void
  onUpdateStatus: (status: OrderStatus) => void
}) {
  const items = parseItems(order.items)
  const currentIndex = ORDER_STATUSES.indexOf(status)
  const next: OrderStatus | null =
    status === 'new' ? 'preparing' : status === 'preparing' ? 'done' : null

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={`${t.orderDetails.title} · ${order.id}`}
      subtitle={order.customer}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton} title={t.actions.close}>
            {t.actions.close}
          </button>
          {next && (
            <button
              type="button"
              onClick={() => onUpdateStatus(next)}
              className={primaryButton}
              title={next === 'preparing' ? t.orderDetails.startPreparing : t.orderDetails.markDone}
            >
              <CheckIcon className="h-4 w-4" />
              {next === 'preparing' ? t.orderDetails.startPreparing : t.orderDetails.markDone}
            </button>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl bg-cream-50 p-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-lg font-black text-brand-700">
          {order.customer.trim().charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold text-stone-800">{order.customer}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
            <ClockIcon className="h-3.5 w-3.5" />
            {order.time}
          </p>
        </div>
        <StatusBadge status={status} label={t.orders.status[status]} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-cream-200 p-3">
          <p className="text-[11px] font-bold text-stone-400">{t.orderDetails.payment}</p>
          <p className="mt-1 text-sm font-bold text-stone-700">{t.orderDetails.paymentValue}</p>
        </div>
        <div className="rounded-2xl border border-cream-200 p-3">
          <p className="text-[11px] font-bold text-stone-400">{t.orderDetails.total}</p>
          <p className="mt-1 text-sm font-black text-brand-600">{order.total}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-stone-700">{t.orderDetails.itemsTitle}</h3>
          <span className="text-[11px] font-bold text-stone-400">
            {items.length} {t.orderDetails.count}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-cream-200 px-3 py-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-black text-brand-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-stone-600">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-extrabold text-stone-700">{t.orderDetails.timeline}</h3>
        <ol className="mt-3 flex items-center">
          {ORDER_STATUSES.map((step, index) => {
            const complete = index <= currentIndex
            return (
              <li key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${
                      complete ? 'bg-brand-500 text-white' : 'bg-cream-100 text-stone-400'
                    }`}
                  >
                    {complete ? <CheckIcon className="h-4 w-4" /> : index + 1}
                  </span>
                  <span
                    className={`max-w-[5.5rem] text-center text-[10px] font-bold leading-tight ${
                      complete ? 'text-stone-700' : 'text-stone-400'
                    }`}
                  >
                    {t.orders.status[step]}
                  </span>
                </div>
                {index < ORDER_STATUSES.length - 1 && (
                  <span
                    className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${
                      index < currentIndex ? 'bg-brand-400' : 'bg-cream-200'
                    }`}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-5 rounded-2xl bg-cream-50 p-3">
        <p className="text-[11px] font-bold text-stone-400">{t.orderDetails.notes}</p>
        <p className="mt-1 text-xs font-semibold text-stone-600">{t.orderDetails.notesValue}</p>
      </div>
    </Modal>
  )
}

export function OrdersDialog({
  t,
  rows,
  statuses,
  initialQuery,
  onClose,
  onSelect,
}: {
  t: T
  rows: OrderRow[]
  statuses: Record<string, OrderStatus>
  initialQuery: string
  onClose: () => void
  onSelect: (order: OrderRow) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const filtered = filterOrders(rows, statuses, query, filter)
  const filters: (OrderStatus | 'all')[] = ['all', ...ORDER_STATUSES]

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={t.ordersDialog.title}
      subtitle={t.ordersDialog.subtitle}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-stone-500">
            {filtered.length} {t.ordersDialog.results}
          </span>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t.actions.close}
          </button>
        </div>
      }
    >
      <div className="relative">
        <SearchIcon className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.ordersDialog.searchPlaceholder}
          aria-label={t.ordersDialog.searchPlaceholder}
          className={`${inputClass} ps-10`}
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((value) => {
          const label = value === 'all' ? t.ordersDialog.all : t.orders.status[value]
          const active = filter === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={active}
              className={`min-h-11 shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'bg-cream-100 text-stone-500 hover:bg-cream-200 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
          <SearchXIcon className="h-10 w-10 text-stone-300" />
          <p className="text-sm font-bold text-stone-500">{t.ordersDialog.empty}</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {filtered.map((row) => {
            const status = statuses[row.id] ?? (row.status as OrderStatus)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row)}
                  title={`${t.actions.viewDetails} ${row.id}`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-cream-200 p-3 text-start transition-colors hover:border-brand-100 hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-100 text-stone-500">
                    <ReceiptIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-extrabold text-stone-700">{row.id}</span>
                      <StatusBadge status={status} label={t.orders.status[status]} size="xs" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-bold text-stone-600">
                      {row.customer}
                    </span>
                    <span className="block truncate text-[11px] text-stone-400">{row.items}</span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block text-sm font-extrabold text-stone-700">{row.total}</span>
                    <span className="mt-1 block text-[10px] text-stone-400">{row.time}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

export function StatDetails({
  t,
  stat,
  onClose,
  onViewOrders,
}: {
  t: T
  stat: { key: StatKey; label: string; value: string; suffix?: string; delta: string; up: boolean }
  onClose: () => void
  onViewOrders: () => void
}) {
  const numeric = Number(stat.value.replace(/[^\d.]/g, '')) || 0
  const percent = Math.abs(Number.parseFloat(stat.delta)) || 0
  const previous = stat.up ? numeric / (1 + percent / 100) : numeric / (1 - percent / 100)
  const max = Math.max(numeric, previous, 1)
  const locale = t.dir === 'rtl' ? 'ar-EG' : 'en-US'
  const format = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={stat.label}
      subtitle={`${t.statDetails.title} · ${t.statDetails.period}`}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t.actions.close}
          </button>
          {stat.key === 'newOrders' && (
            <button type="button" onClick={onViewOrders} className={primaryButton}>
              <ReceiptIcon className="h-4 w-4" />
              {t.statDetails.viewOrders}
            </button>
          )}
        </div>
      }
    >
      <div className="rounded-2xl bg-gradient-to-br from-cream-50 to-cream-100 p-4 text-center">
        <p className="text-xs font-bold text-stone-400">{t.statDetails.today}</p>
        <p className="mt-1 text-3xl font-black text-stone-800">
          {stat.value}{' '}
          {stat.suffix && <span className="text-base font-bold text-stone-400">{stat.suffix}</span>}
        </p>
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            stat.up ? 'bg-mint-100 text-mint-600' : 'bg-brand-50 text-brand-500'
          }`}
        >
          {stat.up ? '▲' : '▼'} {stat.delta}
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold leading-relaxed text-stone-500">
        {t.statDetails.desc[stat.key]}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {[
          { label: t.statDetails.today, value: numeric, tone: 'bg-brand-500' },
          { label: t.statDetails.yesterday, value: previous, tone: 'bg-cream-300' },
        ].map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="text-stone-500">{row.label}</span>
              <span className="text-stone-700">
                {format(row.value)} {stat.suffix ?? ''}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream-100">
              <div
                className={`h-full rounded-full transition-all ${row.tone}`}
                style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export function TopItemsDialog({
  t,
  items,
  onClose,
}: {
  t: T
  items: { name: string; count: number }[]
  onClose: () => void
}) {
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count')
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const sorted = [...items].sort((a, b) =>
    sortBy === 'count' ? b.count - a.count : a.name.localeCompare(b.name),
  )
  const max = Math.max(...items.map((item) => item.count), 1)
  const locale = t.dir === 'rtl' ? 'ar-EG' : 'en-US'

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={t.topItemsDialog.title}
      subtitle={t.topItemsDialog.subtitle}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-stone-500">
            {t.topItemsDialog.total}: {new Intl.NumberFormat(locale).format(total)}
          </span>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t.actions.close}
          </button>
        </div>
      }
    >
      <div className="flex gap-2">
        {(
          [
            { key: 'count', label: t.topItemsDialog.sortByCount },
            { key: 'name', label: t.topItemsDialog.sortByName },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortBy(key)}
            aria-pressed={sortBy === key}
            className={`min-h-11 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors ${
              sortBy === key
                ? 'bg-brand-600 text-white'
                : 'bg-cream-100 text-stone-500 hover:bg-cream-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-3.5">
        {sorted.map((item, index) => {
          const share = total > 0 ? (item.count / total) * 100 : 0
          return (
            <li key={item.name}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cream-100 text-[11px] font-black text-stone-500">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-stone-700">
                  {item.name}
                </span>
                <span className="shrink-0 text-xs font-bold text-stone-500">
                  {new Intl.NumberFormat(locale).format(item.count)} {t.topItemsDialog.orders}
                </span>
                <span className="w-12 shrink-0 text-end text-xs font-black text-brand-600">
                  {share.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-cream-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600"
                  style={{ width: `${Math.max(3, (item.count / max) * 100)}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-[11px] font-semibold text-stone-400">{t.topItemsDialog.share}</p>
    </Modal>
  )
}

export function NotificationsDialog({
  t,
  readIds,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: {
  t: T
  readIds: string[]
  onClose: () => void
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}) {
  const items = t.notifications.items
  const unread = items.filter((item) => item.unread && !readIds.includes(item.id)).length

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={t.notifications.title}
      subtitle={t.notifications.subtitle}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unread === 0}
            className={secondaryButton}
          >
            <CheckIcon className="h-4 w-4" />
            {t.actions.markAllRead}
          </button>
          <button type="button" onClick={onClose} className={primaryButton}>
            {t.actions.close}
          </button>
        </div>
      }
    >
      {unread === 0 && (
        <p className="mb-3 rounded-xl bg-mint-100 px-3 py-2 text-center text-xs font-bold text-mint-600">
          {t.notifications.read} ✓
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const isUnread = item.unread && !readIds.includes(item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onMarkRead(item.id)}
                title={isUnread ? t.actions.markRead : t.notifications.read}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-start transition-colors ${
                  isUnread
                    ? 'border-brand-100 bg-brand-50/50 hover:bg-brand-50'
                    : 'border-cream-200 hover:bg-cream-50'
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isUnread ? 'bg-brand-500' : 'bg-cream-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-stone-700">{item.title}</span>
                    <span className="shrink-0 text-[10px] font-semibold text-stone-400">
                      {item.time}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-500">{item.body}</span>
                  <span
                    className={`mt-1 inline-block text-[10px] font-bold ${
                      isUnread ? 'text-brand-500' : 'text-stone-400'
                    }`}
                  >
                    {isUnread ? t.notifications.unread : t.notifications.read}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

export function SettingsDialog({
  t,
  lang,
  isOpen,
  profile,
  onClose,
  onToggleOpen,
  onLangChange,
  onSave,
}: {
  t: T
  lang: Lang
  isOpen: boolean
  profile: Profile
  onClose: () => void
  onToggleOpen: () => void
  onLangChange: (lang: Lang) => void
  onSave: (profile: Profile) => void
}) {
  const [name, setName] = useState(profile.name ?? t.brandName)
  const [phone, setPhone] = useState(profile.phone ?? '+20 100 000 0000')
  const [address, setAddress] = useState(profile.address ?? '')

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={t.settings.title}
      subtitle={t.settings.subtitle}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t.actions.cancel}
          </button>
          <button type="submit" form="settings-form" disabled={!name.trim()} className={primaryButton}>
            <CheckIcon className="h-4 w-4" />
            {t.settings.save}
          </button>
        </div>
      }
    >
      <form
        id="settings-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          onSave({ name: name.trim(), phone: phone.trim(), address: address.trim() })
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label htmlFor="settings-name" className="mb-1.5 block text-xs font-bold text-stone-500">
            {t.settings.restaurantName}
          </label>
          <div className="relative">
            <UtensilsIcon className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.settings.namePlaceholder}
              maxLength={60}
              required
              className={`${inputClass} ps-10`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="settings-phone" className="mb-1.5 block text-xs font-bold text-stone-500">
            {t.settings.phone}
          </label>
          <div className="relative">
            <PhoneIcon className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="settings-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t.settings.phonePlaceholder}
              maxLength={24}
              className={`${inputClass} ps-10 text-start`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="settings-address" className="mb-1.5 block text-xs font-bold text-stone-500">
            {t.settings.address}
          </label>
          <div className="relative">
            <MapPinIcon className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="settings-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t.settings.addressPlaceholder}
              maxLength={120}
              className={`${inputClass} ps-10`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="settings-lang" className="mb-1.5 block text-xs font-bold text-stone-500">
            {t.settings.language}
          </label>
          <select
            id="settings-lang"
            value={lang}
            onChange={(event) => onLangChange(event.target.value as Lang)}
            className={inputClass}
          >
            <option value="ar">{t.settings.languageAr}</option>
            <option value="en">{t.settings.languageEn}</option>
          </select>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-cream-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-stone-700">{t.settings.status}</p>
            <p className="text-[11px] font-semibold text-stone-400">
              {isOpen ? t.nav.open : t.nav.closed}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            aria-label={t.actions.toggleOpen}
            title={t.actions.toggleOpen}
            onClick={onToggleOpen}
            className="grid h-11 w-14 shrink-0 place-items-center rounded-full"
          >
            <span aria-hidden="true" className={`relative h-7 w-12 rounded-full transition-colors ${isOpen ? 'bg-mint-600' : 'bg-stone-300'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${isOpen ? 'start-6' : 'start-1'}`} />
            </span>
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function GuideDialog({ t, onClose }: { t: T; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={t.guide.title}
      subtitle={t.guide.subtitle}
      size="md"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={primaryButton}>
            {t.actions.close}
          </button>
        </div>
      }
    >
      <ol className="flex flex-col gap-2">
        {t.guide.items.map((item, index) => (
          <li
            key={item.name}
            className="flex gap-3 rounded-2xl border border-cream-200 p-3 transition-colors hover:bg-cream-50"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-black text-brand-600">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-stone-700">{item.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{item.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
