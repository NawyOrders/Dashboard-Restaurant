import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { PaymentMethodName, RestaurantPaymentMethodConfig } from '../api/types'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { PageHeading } from '../components/PageHeading'
import { BanknoteIcon, CreditCardIcon, SpinnerIcon, WalletIcon } from '../icons'
import { BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Switch } from '../manage/kit'
import { manageCopy } from '../manage/text'

export type PaymentsPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  onToast: (message: string) => void
}

const ICONS: Record<PaymentMethodName, typeof BanknoteIcon> = { Cash: BanknoteIcon, InstaPay: CreditCardIcon, MobileWallet: WalletIcon }

export default function PaymentsPage({ lang, api, permissions, onToast }: PaymentsPageProps) {
  const c = manageCopy[lang]
  const p = c.payments
  const canManage = can(permissions, PERMISSIONS.restaurantSettingsManage)
  const canView = canManage || can(permissions, PERMISSIONS.restaurantSettingsView)
  const [methods, setMethods] = useState<RestaurantPaymentMethodConfig[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setState('loading')
    api.listPaymentMethods()
      .then((list) => {
        if (cancelled) return
        setMethods(list)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, canView, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  if (!canView) return <EmptyPanel text={c.noAccess} />

  return (
    <div>
      <PageHeading title={p.title} subtitle={p.subtitle} />
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {methods.map((method) => (
            <MethodCard
              key={method.paymentMethod}
              lang={lang}
              method={method}
              canManage={canManage}
              onSave={async (input) => {
                const saved = await api.updatePaymentMethod(method.paymentMethod, input)
                setMethods((list) => list.map((item) => (item.paymentMethod === saved.paymentMethod ? saved : item)))
                onToast(c.saved)
              }}
              onError={() => onToast(c.saveError)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MethodCard({ lang, method, canManage, onSave, onError }: {
  lang: Lang
  method: RestaurantPaymentMethodConfig
  canManage: boolean
  onSave: (input: Partial<RestaurantPaymentMethodConfig>) => Promise<void>
  onError: () => void
}) {
  const p = manageCopy[lang].payments
  const isCash = method.paymentMethod === 'Cash'
  const Icon = ICONS[method.paymentMethod]
  const id = method.paymentMethod
  const [draft, setDraft] = useState({
    nameAr: method.nameAr,
    nameEn: method.nameEn,
    accountIdentifier: method.accountIdentifier ?? '',
    instructionsAr: method.instructionsAr ?? '',
    instructionsEn: method.instructionsEn ?? '',
    isEnabled: method.isEnabled,
  })
  const [saving, setSaving] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const patch = (next: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...next }))

  const submit = async () => {
    if (!draft.nameAr.trim() || !draft.nameEn.trim() || draft.instructionsAr.length > 500 || draft.instructionsEn.length > 500) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setSaving(true)
    try {
      await onSave({
        nameAr: draft.nameAr.trim(),
        nameEn: draft.nameEn.trim(),
        accountIdentifier: isCash ? null : draft.accountIdentifier.trim() || null,
        instructionsAr: draft.instructionsAr.trim() || null,
        instructionsEn: draft.instructionsEn.trim() || null,
        isEnabled: isCash ? true : draft.isEnabled,
        requiresVerificationProof: !isCash,
      })
    } catch {
      onError()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="dashboard-panel h-fit p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-stone-800">{p.methods[method.paymentMethod]}</h2>
          <p className="mt-0.5 text-xs text-stone-500">{isCash ? p.cashLocked : p.proofLocked}</p>
        </div>
      </div>
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {invalid && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{p.invalid}</p>}
        <Switch checked={isCash ? true : draft.isEnabled} label={`${p.methods[method.paymentMethod]}: ${p.enabled}`} disabled={isCash || !canManage} onChange={() => patch({ isEnabled: !draft.isEnabled })} />
        <Field id={`${id}-name-ar`} label={p.nameAr}>
          <input id={`${id}-name-ar`} type="text" maxLength={200} value={draft.nameAr} disabled={!canManage} onChange={(event) => patch({ nameAr: event.target.value })} className={INPUT} />
        </Field>
        <Field id={`${id}-name-en`} label={p.nameEn}>
          <input id={`${id}-name-en`} type="text" maxLength={200} dir="ltr" value={draft.nameEn} disabled={!canManage} onChange={(event) => patch({ nameEn: event.target.value })} className={`${INPUT} text-start`} />
        </Field>
        {!isCash && (
          <Field id={`${id}-account`} label={p.account}>
            <input id={`${id}-account`} type="text" maxLength={100} dir="ltr" value={draft.accountIdentifier} disabled={!canManage} onChange={(event) => patch({ accountIdentifier: event.target.value })} className={`${INPUT} text-start`} />
          </Field>
        )}
        <Field id={`${id}-ins-ar`} label={p.instructionsAr}>
          <textarea id={`${id}-ins-ar`} rows={2} maxLength={500} value={draft.instructionsAr} disabled={!canManage} onChange={(event) => patch({ instructionsAr: event.target.value })} className={INPUT} />
        </Field>
        <Field id={`${id}-ins-en`} label={p.instructionsEn}>
          <textarea id={`${id}-ins-en`} rows={2} maxLength={500} dir="ltr" value={draft.instructionsEn} disabled={!canManage} onChange={(event) => patch({ instructionsEn: event.target.value })} className={`${INPUT} text-start`} />
        </Field>
        {canManage && (
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving && <SpinnerIcon className="h-4 w-4" />}
            {p.save}
          </button>
        )}
      </form>
    </section>
  )
}
