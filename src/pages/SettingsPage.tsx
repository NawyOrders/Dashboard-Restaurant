import { useState, type ReactNode } from 'react'
import type { RestaurantSettings } from '../api/types'
import type { Lang, T } from '../i18n'
import { PageHeading } from '../components/PageHeading'
import {
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  SpinnerIcon,
  StoreIcon,
  VolumeIcon,
} from '../icons'

export type SettingsPageProps = {
  t: T
  lang: Lang
  storageKey: string
  onToast: (message: string) => void
}

const INPUT = 'min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readSettings(storageKey: string, fallback: RestaurantSettings): RestaurantSettings {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return fallback
    return {
      ...fallback,
      ...parsed,
      notifications: isRecord(parsed.notifications)
        ? { ...fallback.notifications, ...parsed.notifications }
        : fallback.notifications,
      payments: isRecord(parsed.payments)
        ? { ...fallback.payments, ...parsed.payments }
        : fallback.payments,
      workingHours: isRecord(parsed.workingHours)
        ? { ...fallback.workingHours, ...parsed.workingHours }
        : fallback.workingHours,
    } as RestaurantSettings
  } catch {
    return fallback
  }
}

export default function SettingsPage({ t, storageKey, onToast }: SettingsPageProps) {
  const [settings, setSettings] = useState<RestaurantSettings>(() =>
    readSettings(storageKey, t.settingsPage.defaults),
  )
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(settings))
      onToast(t.settingsPage.saved)
    } catch {
      onToast(t.settingsPage.saveError)
    } finally {
      setSaving(false)
    }
  }

  const currency = t.reports.currency

  return (
    <div>
      <PageHeading
        title={t.settingsPage.title}
        subtitle={t.settingsPage.subtitle}
        action={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {saving ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
            {t.settingsPage.save}
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SettingsCard
            title={t.settingsPage.branch}
            icon={<StoreIcon className="h-5 w-5" />}
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-bold text-[#176B4B]">
                <span className="h-2 w-2 rounded-full bg-mint-600" aria-hidden="true" />
                {t.settingsPage.activeBranch}
              </span>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="settings-name" label={t.settingsPage.restaurantName}>
                <input
                  id="settings-name"
                  type="text"
                  value={settings.restaurantName}
                  onChange={(event) => setSettings((current) => ({ ...current, restaurantName: event.target.value }))}
                  className={INPUT}
                />
              </Field>
              <Field id="settings-phone" label={t.settingsPage.branchPhone}>
                <input
                  id="settings-phone"
                  type="tel"
                  dir="ltr"
                  value={settings.branchPhone}
                  onChange={(event) => setSettings((current) => ({ ...current, branchPhone: event.target.value }))}
                  className={`${INPUT} text-start tabular-nums`}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field id="settings-address" label={t.settingsPage.address}>
                  <textarea
                    id="settings-address"
                    rows={2}
                    value={settings.address}
                    onChange={(event) => setSettings((current) => ({ ...current, address: event.target.value }))}
                    className={`${INPUT} min-h-20 resize-y py-2.5`}
                  />
                </Field>
              </div>
              <Field id="settings-delivery" label={t.settingsPage.deliveryFee}>
                <div className="relative">
                  <input
                    id="settings-delivery"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.deliveryFee}
                    onChange={(event) => setSettings((current) => ({ ...current, deliveryFee: Number(event.target.value) || 0 }))}
                    className={`${INPUT} pe-14 tabular-nums`}
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">{currency}</span>
                </div>
              </Field>
              <Field id="settings-minimum" label={t.settingsPage.minimumOrder}>
                <div className="relative">
                  <input
                    id="settings-minimum"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.minimumOrder}
                    onChange={(event) => setSettings((current) => ({ ...current, minimumOrder: Number(event.target.value) || 0 }))}
                    className={`${INPUT} pe-14 tabular-nums`}
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">{currency}</span>
                </div>
              </Field>
              <Field id="settings-prep" label={t.settingsPage.prepTime}>
                <div className="relative">
                  <input
                    id="settings-prep"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.prepTimeMinutes}
                    onChange={(event) => setSettings((current) => ({ ...current, prepTimeMinutes: Number(event.target.value) || 0 }))}
                    className={`${INPUT} pe-20 tabular-nums`}
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">{t.settingsPage.minutes}</span>
                </div>
              </Field>
            </div>
          </SettingsCard>

          <SettingsCard
            title={t.settingsPage.kitchen}
            subtitle={t.settingsPage.kitchenSub}
            icon={<VolumeIcon className="h-5 w-5" />}
          >
            <div className="divide-y divide-line">
              <ToggleRow
                title={t.settingsPage.repeatSound}
                hint={t.settingsPage.repeatSoundHint}
                checked={settings.notifications.repeatSound}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    notifications: { ...current.notifications, repeatSound: !current.notifications.repeatSound },
                  }))
                }
              />
              <ToggleRow
                title={t.settingsPage.autoPrint}
                hint={t.settingsPage.autoPrintHint}
                checked={settings.notifications.autoPrint}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    notifications: { ...current.notifications, autoPrint: !current.notifications.autoPrint },
                  }))
                }
              />
              <ToggleRow
                title={t.settingsPage.notifyDispatch}
                hint={t.settingsPage.notifyDispatchHint}
                checked={settings.notifications.notifyOnDispatch}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    notifications: { ...current.notifications, notifyOnDispatch: !current.notifications.notifyOnDispatch },
                  }))
                }
              />
            </div>
          </SettingsCard>

          <SettingsCard
            title={t.settingsPage.payments}
            subtitle={t.settingsPage.paymentsSub}
            icon={<CreditCardIcon className="h-5 w-5" />}
          >
            <div className="divide-y divide-line">
              <ToggleRow
                title={t.settingsPage.cash}
                checked={settings.payments.cash}
                onChange={() =>
                  setSettings((current) => ({ ...current, payments: { ...current.payments, cash: !current.payments.cash } }))
                }
              />
              <ToggleRow
                title={t.settingsPage.instapay}
                checked={settings.payments.instapay}
                onChange={() =>
                  setSettings((current) => ({ ...current, payments: { ...current.payments, instapay: !current.payments.instapay } }))
                }
              />
              {settings.payments.instapay && (
                <div className="py-3">
                  <Field id="settings-instapay" label={t.settingsPage.instapayHandle}>
                    <input
                      id="settings-instapay"
                      type="text"
                      dir="ltr"
                      value={settings.payments.instapayHandle}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          payments: { ...current.payments, instapayHandle: event.target.value },
                        }))
                      }
                      className={`${INPUT} text-start`}
                    />
                  </Field>
                </div>
              )}
              <ToggleRow
                title={t.settingsPage.wallets}
                checked={settings.payments.wallets}
                onChange={() =>
                  setSettings((current) => ({ ...current, payments: { ...current.payments, wallets: !current.payments.wallets } }))
                }
              />
              {settings.payments.wallets && (
                <div className="py-3">
                  <Field id="settings-wallets" label={t.settingsPage.walletProviders}>
                    <input
                      id="settings-wallets"
                      type="text"
                      value={settings.payments.walletProviders}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          payments: { ...current.payments, walletProviders: event.target.value },
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                </div>
              )}
            </div>
          </SettingsCard>

          <SettingsCard
            title={t.settingsPage.hours}
            subtitle={t.settingsPage.hoursSub}
            icon={<ClockIcon className="h-5 w-5" />}
          >
            <div className="divide-y divide-line">
              <ToggleRow
                title={t.settingsPage.autoClose}
                checked={settings.workingHours.autoClose}
                onChange={() =>
                  setSettings((current) => ({
                    ...current,
                    workingHours: { ...current.workingHours, autoClose: !current.workingHours.autoClose },
                  }))
                }
              />
              <div className="grid gap-4 pt-4 sm:grid-cols-2">
                <p className="text-xs font-bold text-stone-600 sm:col-span-2">{t.settingsPage.weekdays}</p>
                <Field id="settings-weekdays-from" label={t.settingsPage.from}>
                  <input
                    id="settings-weekdays-from"
                    type="text"
                    value={settings.workingHours.weekdaysFrom}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        workingHours: { ...current.workingHours, weekdaysFrom: event.target.value },
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field id="settings-weekdays-to" label={t.settingsPage.to}>
                  <input
                    id="settings-weekdays-to"
                    type="text"
                    value={settings.workingHours.weekdaysTo}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        workingHours: { ...current.workingHours, weekdaysTo: event.target.value },
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <p className="text-xs font-bold text-stone-600 sm:col-span-2">{t.settingsPage.friday}</p>
                <Field id="settings-friday-from" label={t.settingsPage.from}>
                  <input
                    id="settings-friday-from"
                    type="text"
                    value={settings.workingHours.fridayFrom}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        workingHours: { ...current.workingHours, fridayFrom: event.target.value },
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field id="settings-friday-to" label={t.settingsPage.to}>
                  <input
                    id="settings-friday-to"
                    type="text"
                    value={settings.workingHours.fridayTo}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        workingHours: { ...current.workingHours, fridayTo: event.target.value },
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
              </div>
            </div>
          </SettingsCard>
        </div>

        <aside className="dashboard-panel h-fit p-5 lg:sticky lg:top-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <StoreIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-stone-500">{t.settingsPage.summary}</p>
              <p className="truncate text-sm font-extrabold text-stone-800">{settings.restaurantName || t.settingsPage.defaults.restaurantName}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-stone-500">{t.settingsPage.summaryHint}</p>

          <dl className="mt-4 space-y-2.5 text-xs">
            <SummaryRow label={t.settingsPage.branchPhone} value={settings.branchPhone} ltr />
            <SummaryRow label={t.settingsPage.deliveryFee} value={`${settings.deliveryFee} ${currency}`} />
            <SummaryRow label={t.settingsPage.prepTime} value={`${settings.prepTimeMinutes} ${t.settingsPage.minutes}`} />
            <SummaryRow label={t.settingsPage.weekdays} value={`${settings.workingHours.weekdaysFrom} — ${settings.workingHours.weekdaysTo}`} />
          </dl>

          <div className="mt-4 rounded-xl bg-mint-100/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#176B4B]">
              <span className="h-2 w-2 rounded-full bg-mint-600" aria-hidden="true" />
              {t.settingsPage.openNow}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">{t.settingsPage.saveHint}</p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {saving ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
            {t.settingsPage.save}
          </button>
        </aside>
      </div>
    </div>
  )
}

function SettingsCard({ title, subtitle, icon, action, children }: {
  title: string
  subtitle?: string
  icon: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="dashboard-panel p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-stone-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-stone-600">{label}</label>
      {children}
    </div>
  )
}

function ToggleRow({ title, hint, checked, onChange }: {
  title: string
  hint?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-stone-800">{title}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${checked ? 'bg-mint-600' : 'bg-stone-300'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-6' : 'start-1'}`} />
      </button>
    </div>
  )
}

function SummaryRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className={`truncate text-end font-bold text-stone-700 ${ltr ? 'tabular-nums' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  )
}
