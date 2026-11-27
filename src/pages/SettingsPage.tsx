import { useState, type ReactNode } from 'react'
import type {
  RestaurantNotificationSettings,
  RestaurantPaymentSettings,
  RestaurantSettings,
  RestaurantWorkingHours,
} from '../api/types'
import type { T } from '../i18n'
import { PageHeading } from '../components/PageHeading'
import { manageCopy } from '../manage/text'
import {
  BanknoteIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  SpinnerIcon,
  StoreIcon,
  VolumeIcon,
  WalletIcon,
} from '../icons'

export type SettingsPageProps = {
  t: T
  lang: string
  storageKey: string
  onToast: (message: string) => void
  // Opens the management hub (offers and the other admin modules).
  onOpenManage?: () => void
  // Set-up pages (branches, payments, roles) shown above the settings cards.
  adminLinks?: ReactNode
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

export default function SettingsPage({ t, lang, storageKey, onToast, onOpenManage, adminLinks }: SettingsPageProps) {
  const [settings, setSettings] = useState<RestaurantSettings>(() =>
    readSettings(storageKey, t.settingsPage.defaults),
  )
  const [saving, setSaving] = useState(false)

  const patch = (partial: Partial<RestaurantSettings>) => setSettings((current) => ({ ...current, ...partial }))
  const patchNotifications = (partial: Partial<RestaurantNotificationSettings>) =>
    setSettings((current) => ({ ...current, notifications: { ...current.notifications, ...partial } }))
  const patchPayments = (partial: Partial<RestaurantPaymentSettings>) =>
    setSettings((current) => ({ ...current, payments: { ...current.payments, ...partial } }))
  const patchHours = (partial: Partial<RestaurantWorkingHours>) =>
    setSettings((current) => ({ ...current, workingHours: { ...current.workingHours, ...partial } }))

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
          <>
            {onOpenManage && (
              <button
                type="button"
                onClick={onOpenManage}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                {manageCopy[lang === 'ar' ? 'ar' : 'en'].hubTitle}
              </button>
            )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {saving ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
            {t.settingsPage.save}
          </button>
          </>
        }
      />

      {adminLinks}

      <div className="grid gap-4 lg:grid-cols-2">
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
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <Field id="settings-name" label={t.settingsPage.restaurantName}>
                  <input
                    id="settings-name"
                    type="text"
                    value={settings.restaurantName}
                    onChange={(event) => patch({ restaurantName: event.target.value })}
                    className={INPUT}
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field id="settings-phone" label={t.settingsPage.branchPhone}>
                  <input
                    id="settings-phone"
                    type="tel"
                    dir="ltr"
                    value={settings.branchPhone}
                    onChange={(event) => patch({ branchPhone: event.target.value })}
                    className={`${INPUT} text-start tabular-nums`}
                  />
                </Field>
              </div>
              <div className="sm:col-span-6">
                <Field id="settings-address" label={t.settingsPage.address}>
                  <textarea
                    id="settings-address"
                    rows={2}
                    value={settings.address}
                    onChange={(event) => patch({ address: event.target.value })}
                    className={`${INPUT} min-h-20 resize-y py-2.5`}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="settings-delivery" label={t.settingsPage.deliveryFee}>
                  <div className="relative">
                    <input
                      id="settings-delivery"
                      type="number"
                      min={0}
                      step={1}
                      value={settings.deliveryFee}
                      onChange={(event) => patch({ deliveryFee: Number(event.target.value) || 0 })}
                      className={`${INPUT} pe-14 tabular-nums`}
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">{currency}</span>
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="settings-minimum" label={t.settingsPage.minimumOrder}>
                  <div className="relative">
                    <input
                      id="settings-minimum"
                      type="number"
                      min={0}
                      step={1}
                      value={settings.minimumOrder}
                      onChange={(event) => patch({ minimumOrder: Number(event.target.value) || 0 })}
                      className={`${INPUT} pe-14 tabular-nums`}
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">{currency}</span>
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="settings-prep" label={t.settingsPage.prepTime}>
                  <div className="relative">
                    <input
                      id="settings-prep"
                      type="number"
                      min={0}
                      step={1}
                      value={settings.prepTimeMinutes}
                      onChange={(event) => patch({ prepTimeMinutes: Number(event.target.value) || 0 })}
                      className={`${INPUT} pe-20 tabular-nums`}
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">{t.settingsPage.minutes}</span>
                  </div>
                </Field>
              </div>
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
                onChange={() => patchHours({ autoClose: !settings.workingHours.autoClose })}
              />
              <div className="grid gap-4 pt-4 sm:grid-cols-2">
                <p className="text-xs font-bold text-stone-600 sm:col-span-2">{t.settingsPage.weekdays}</p>
                <Field id="settings-weekdays-from" label={t.settingsPage.from}>
                  <input
                    id="settings-weekdays-from"
                    type="text"
                    value={settings.workingHours.weekdaysFrom}
                    onChange={(event) => patchHours({ weekdaysFrom: event.target.value })}
                    className={INPUT}
                  />
                </Field>
                <Field id="settings-weekdays-to" label={t.settingsPage.to}>
                  <input
                    id="settings-weekdays-to"
                    type="text"
                    value={settings.workingHours.weekdaysTo}
                    onChange={(event) => patchHours({ weekdaysTo: event.target.value })}
                    className={INPUT}
                  />
                </Field>
                <p className="text-xs font-bold text-stone-600 sm:col-span-2">{t.settingsPage.friday}</p>
                <Field id="settings-friday-from" label={t.settingsPage.from}>
                  <input
                    id="settings-friday-from"
                    type="text"
                    value={settings.workingHours.fridayFrom}
                    onChange={(event) => patchHours({ fridayFrom: event.target.value })}
                    className={INPUT}
                  />
                </Field>
                <Field id="settings-friday-to" label={t.settingsPage.to}>
                  <input
                    id="settings-friday-to"
                    type="text"
                    value={settings.workingHours.fridayTo}
                    onChange={(event) => patchHours({ fridayTo: event.target.value })}
                    className={INPUT}
                  />
                </Field>
              </div>
            </div>
          </SettingsCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
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
                onChange={() => patchNotifications({ repeatSound: !settings.notifications.repeatSound })}
              />
              <ToggleRow
                title={t.settingsPage.autoPrint}
                hint={t.settingsPage.autoPrintHint}
                checked={settings.notifications.autoPrint}
                onChange={() => patchNotifications({ autoPrint: !settings.notifications.autoPrint })}
              />
              <ToggleRow
                title={t.settingsPage.notifyDispatch}
                hint={t.settingsPage.notifyDispatchHint}
                checked={settings.notifications.notifyOnDispatch}
                onChange={() => patchNotifications({ notifyOnDispatch: !settings.notifications.notifyOnDispatch })}
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
                leading={<BanknoteIcon className="h-4 w-4" />}
                leadingClass="bg-[#FBF1D8] text-[#806116]"
                checked={settings.payments.cash}
                onChange={() => patchPayments({ cash: !settings.payments.cash })}
              />
              <ToggleRow
                title={t.settingsPage.instapay}
                leading={<CreditCardIcon className="h-4 w-4" />}
                leadingClass="bg-[#F3E8FF] text-[#7B2CBF]"
                checked={settings.payments.instapay}
                onChange={() => patchPayments({ instapay: !settings.payments.instapay })}
              />
              {settings.payments.instapay && (
                <div className="py-3">
                  <Field id="settings-instapay" label={t.settingsPage.instapayHandle}>
                    <input
                      id="settings-instapay"
                      type="text"
                      dir="ltr"
                      value={settings.payments.instapayHandle}
                      onChange={(event) => patchPayments({ instapayHandle: event.target.value })}
                      className={`${INPUT} text-start`}
                    />
                  </Field>
                </div>
              )}
              <ToggleRow
                title={t.settingsPage.wallets}
                leading={<WalletIcon className="h-4 w-4" />}
                leadingClass="bg-[#FBF1D8] text-[#806116]"
                checked={settings.payments.wallets}
                onChange={() => patchPayments({ wallets: !settings.payments.wallets })}
              />
              {settings.payments.wallets && (
                <div className="py-3">
                  <Field id="settings-wallets" label={t.settingsPage.walletProviders}>
                    <input
                      id="settings-wallets"
                      type="text"
                      value={settings.payments.walletProviders}
                      onChange={(event) => patchPayments({ walletProviders: event.target.value })}
                      className={INPUT}
                    />
                  </Field>
                </div>
              )}
            </div>
          </SettingsCard>
        </div>
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

function ToggleRow({ title, hint, leading, leadingClass, checked, onChange }: {
  title: string
  hint?: string
  leading?: ReactNode
  leadingClass?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {leading && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${leadingClass ?? 'bg-cream-100 text-stone-600'}`}>
            {leading}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-800">{title}</p>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{hint}</p>}
        </div>
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
