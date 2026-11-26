import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { BranchDetails, BranchStatus, BranchWorkingHour, DeliverySettings } from '../api/branches'
import { BRANCH_STATUSES, DAYS_OF_WEEK } from '../api/branches'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { EditIcon, MapPinIcon, PhoneIcon, PlusIcon, SpinnerIcon, TruckIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Pill, Switch } from '../manage/kit'
import { manageCopy } from '../manage/text'

export type BranchesPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  onToast: (message: string) => void
}

const defaultHours = (): BranchWorkingHour[] =>
  DAYS_OF_WEEK.map((dayOfWeek) => ({ dayOfWeek, isClosed: false, openTime: '09:00', closeTime: '23:00', closesNextDay: false }))

type Draft = {
  nameAr: string
  nameEn: string
  address: string
  phone: string
  latitude: string
  longitude: string
  status: BranchStatus
  isActive: boolean
  isPrimary: boolean
  sortOrder: string
  workingHours: BranchWorkingHour[]
}

function draftOf(branch: BranchDetails | null): Draft {
  if (!branch) {
    return { nameAr: '', nameEn: '', address: '', phone: '', latitude: '', longitude: '', status: 'Open', isActive: true, isPrimary: false, sortOrder: '0', workingHours: defaultHours() }
  }
  const hours = DAYS_OF_WEEK.map((day) => branch.workingHours.find((hour) => hour.dayOfWeek === day) ?? { dayOfWeek: day, isClosed: true, openTime: null, closeTime: null, closesNextDay: false })
  return {
    nameAr: branch.nameAr,
    nameEn: branch.nameEn,
    address: branch.address,
    phone: branch.phone ?? '',
    latitude: branch.latitude == null ? '' : String(branch.latitude),
    longitude: branch.longitude == null ? '' : String(branch.longitude),
    status: branch.status,
    isActive: branch.isActive,
    isPrimary: branch.isPrimary,
    sortOrder: String(branch.sortOrder),
    workingHours: hours.map((hour) => ({ ...hour, openTime: hour.openTime?.slice(0, 5) ?? null, closeTime: hour.closeTime?.slice(0, 5) ?? null })),
  }
}

export default function BranchesPage({ t, lang, api, permissions, onToast }: BranchesPageProps) {
  const c = manageCopy[lang]
  const b = c.branches
  const canManage = can(permissions, PERMISSIONS.branchesManage)
  const canView = canManage || can(permissions, PERMISSIONS.branchesView)
  const [branches, setBranches] = useState<BranchDetails[]>([])
  const [delivery, setDelivery] = useState<DeliverySettings | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<{ branch: BranchDetails | null } | null>(null)

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setState('loading')
    Promise.all([api.listBranches({ pageSize: 100 }), api.getDeliverySettings()])
      .then(([page, settings]) => {
        if (cancelled) return
        setBranches([...page.items].sort((x, y) => x.sortOrder - y.sortOrder))
        setDelivery(settings)
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
  const name = (branch: BranchDetails) => (lang === 'ar' ? branch.nameAr || branch.nameEn : branch.nameEn || branch.nameAr)

  return (
    <div>
      <PageHeading
        title={b.title}
        subtitle={b.subtitle}
        action={
          canManage && (
            <button type="button" onClick={() => setEditing({ branch: null })} className={BTN_PRIMARY}>
              <PlusIcon className="h-4 w-4" />
              {b.add}
            </button>
          )
        }
      />
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            {branches.length === 0 && <EmptyPanel text={b.empty} />}
            <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {branches.map((branch) => (
                <li key={branch.id} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words text-sm font-extrabold leading-6 text-stone-800">{name(branch)}</h3>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {branch.isPrimary && <Pill tone="gold">{b.primary}</Pill>}
                      {!branch.isActive && <Pill tone="muted">{b.inactive}</Pill>}
                      <Pill tone={branch.status === 'Open' ? 'good' : 'bad'}>{b.statuses[branch.status]}</Pill>
                    </div>
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-xs text-stone-500"><MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />{branch.address}</p>
                  {branch.phone && <p className="mt-1 flex items-center gap-2 text-xs text-stone-500"><PhoneIcon className="h-4 w-4 shrink-0" /><span dir="ltr">{branch.phone}</span></p>}
                  <ul className="mt-3 grid grid-cols-1 gap-0.5 border-t border-line pt-3 text-[11px] text-stone-600 sm:grid-cols-2">
                    {branch.workingHours.map((hour) => (
                      <li key={hour.dayOfWeek} className="flex justify-between gap-2">
                        <span className="font-bold">{b.days[hour.dayOfWeek]}</span>
                        <span dir="ltr" className="tabular-nums">{hour.isClosed ? b.closed : `${hour.openTime?.slice(0, 5)} - ${hour.closeTime?.slice(0, 5)}`}</span>
                      </li>
                    ))}
                  </ul>
                  {canManage && (
                    <div className="mt-3 flex justify-end">
                      <button type="button" onClick={() => setEditing({ branch })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                        <EditIcon className="h-4 w-4" />
                        {c.edit}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
          {delivery && <DeliveryCard lang={lang} api={api} settings={delivery} canManage={canManage} onSaved={(next) => { setDelivery(next); onToast(c.saved) }} onError={() => onToast(c.saveError)} />}
        </div>
      )}
      {editing && (
        <BranchForm
          key={editing.branch?.id ?? 'new'}
          t={t}
          lang={lang}
          api={api}
          branch={editing.branch}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null)
            onToast(c.saved)
            reload()
          }}
        />
      )}
    </div>
  )
}

function DeliveryCard({ lang, api, settings, canManage, onSaved, onError }: {
  lang: Lang
  api: Api
  settings: DeliverySettings
  canManage: boolean
  onSaved: (next: DeliverySettings) => void
  onError: () => void
}) {
  const b = manageCopy[lang].branches
  const [base, setBase] = useState(String(settings.baseDeliveryFee))
  const [perKm, setPerKm] = useState(String(settings.deliveryFeePerKm))
  const [radius, setRadius] = useState(settings.maxDeliveryRadiusKm == null ? '' : String(settings.maxDeliveryRadiusKm))
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      onSaved(await api.updateDeliverySettings({
        baseDeliveryFee: Number(base),
        deliveryFeePerKm: Number(perKm),
        maxDeliveryRadiusKm: radius.trim() === '' ? null : Number(radius),
      }))
    } catch {
      onError()
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="dashboard-panel h-fit p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><TruckIcon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-stone-800">{b.delivery}</h2>
          <p className="mt-0.5 text-xs text-stone-500">{b.deliverySub}</p>
        </div>
      </div>
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void save() }}>
        <Field id="delivery-base" label={b.baseFee}>
          <input id="delivery-base" type="number" min="0" step="0.01" value={base} disabled={!canManage} onChange={(event) => setBase(event.target.value)} className={INPUT} />
        </Field>
        <Field id="delivery-km" label={b.feePerKm}>
          <input id="delivery-km" type="number" min="0" step="0.01" value={perKm} disabled={!canManage} onChange={(event) => setPerKm(event.target.value)} className={INPUT} />
        </Field>
        <Field id="delivery-radius" label={b.maxRadius} hint={b.maxRadiusHint}>
          <input id="delivery-radius" type="number" min="0" step="0.1" value={radius} disabled={!canManage} onChange={(event) => setRadius(event.target.value)} className={INPUT} />
        </Field>
        {canManage && (
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving && <SpinnerIcon className="h-4 w-4" />}
            {b.saveDelivery}
          </button>
        )}
      </form>
    </section>
  )
}

function BranchForm({ t, lang, api, branch, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  branch: BranchDetails | null
  onClose: () => void
  onDone: () => void
}) {
  const c = manageCopy[lang]
  const b = c.branches
  const [draft, setDraft] = useState<Draft>(() => draftOf(branch))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }))
  const patchHour = (index: number, next: Partial<BranchWorkingHour>) =>
    patch({ workingHours: draft.workingHours.map((hour, i) => (i === index ? { ...hour, ...next } : hour)) })

  const submit = async () => {
    setError(null)
    if (!draft.nameAr.trim() || !draft.nameEn.trim() || !draft.address.trim()) {
      setError(b.invalid)
      return
    }
    const workingHours = draft.workingHours.map((hour) =>
      hour.isClosed ? { dayOfWeek: hour.dayOfWeek, isClosed: true, openTime: null, closeTime: null, closesNextDay: false } : hour,
    )
    const common = {
      nameAr: draft.nameAr.trim(),
      nameEn: draft.nameEn.trim(),
      address: draft.address.trim(),
      phone: draft.phone.trim() || null,
      latitude: draft.latitude.trim() === '' ? null : Number(draft.latitude),
      longitude: draft.longitude.trim() === '' ? null : Number(draft.longitude),
      status: draft.status,
      isActive: draft.isActive,
      isPrimary: draft.isPrimary,
      sortOrder: Number(draft.sortOrder),
      workingHours,
    }
    setSaving(true)
    try {
      if (branch) await api.updateBranch(branch.id, common)
      else await api.createBranch(common)
      onDone()
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={branch ? b.edit : b.add}
      closeLabel={t.actions.close}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_GHOST}>{c.cancel}</button>
          <button type="button" disabled={saving} onClick={() => void submit()} className={BTN_PRIMARY}>
            {saving && <SpinnerIcon className="h-4 w-4" />}
            {c.save}
          </button>
        </div>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 sm:col-span-2">{error}</p>}
        <Field id="branch-name-ar" label={b.nameAr}>
          <input id="branch-name-ar" type="text" maxLength={200} value={draft.nameAr} onChange={(event) => patch({ nameAr: event.target.value })} className={INPUT} />
        </Field>
        <Field id="branch-name-en" label={b.nameEn}>
          <input id="branch-name-en" type="text" maxLength={200} dir="ltr" value={draft.nameEn} onChange={(event) => patch({ nameEn: event.target.value })} className={`${INPUT} text-start`} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="branch-address" label={b.address}>
            <input id="branch-address" type="text" value={draft.address} onChange={(event) => patch({ address: event.target.value })} className={INPUT} />
          </Field>
        </div>
        <Field id="branch-phone" label={b.phone}>
          <input id="branch-phone" type="tel" dir="ltr" value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} className={`${INPUT} text-start`} />
        </Field>
        <Field id="branch-status" label={b.status}>
          <select id="branch-status" value={draft.status} onChange={(event) => patch({ status: event.target.value as BranchStatus })} className={INPUT}>
            {BRANCH_STATUSES.map((value) => <option key={value} value={value}>{b.statuses[value]}</option>)}
          </select>
        </Field>
        <Field id="branch-lat" label={b.latitude}>
          <input id="branch-lat" type="number" step="any" dir="ltr" value={draft.latitude} onChange={(event) => patch({ latitude: event.target.value })} className={INPUT} />
        </Field>
        <Field id="branch-lon" label={b.longitude}>
          <input id="branch-lon" type="number" step="any" dir="ltr" value={draft.longitude} onChange={(event) => patch({ longitude: event.target.value })} className={INPUT} />
        </Field>
        <Field id="branch-sort" label={b.sortOrder}>
          <input id="branch-sort" type="number" min="0" step="1" value={draft.sortOrder} onChange={(event) => patch({ sortOrder: event.target.value })} className={INPUT} />
        </Field>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
            <span className="text-sm font-bold text-stone-800">{b.active}</span>
            <Switch checked={draft.isActive} label={b.active} onChange={() => patch({ isActive: !draft.isActive })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
            <span className="text-sm font-bold text-stone-800">{b.makePrimary}</span>
            <Switch checked={draft.isPrimary} label={b.makePrimary} onChange={() => patch({ isPrimary: !draft.isPrimary })} />
          </div>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-bold text-stone-600">{b.hours}</legend>
          <ul className="flex flex-col gap-2">
            {draft.workingHours.map((hour, index) => (
              <li key={hour.dayOfWeek} className="grid grid-cols-[88px_1fr] items-center gap-2 sm:grid-cols-[100px_auto_1fr_1fr_auto]">
                <span className="text-xs font-bold text-stone-700">{b.days[hour.dayOfWeek]}</span>
                <div className="flex items-center gap-2">
                  <Switch checked={!hour.isClosed} label={`${b.days[hour.dayOfWeek]}: ${b.closed}`} onChange={() => patchHour(index, hour.isClosed ? { isClosed: false, openTime: '09:00', closeTime: '23:00' } : { isClosed: true })} />
                  {hour.isClosed && <span className="text-xs font-bold text-stone-400">{b.closed}</span>}
                </div>
                {!hour.isClosed && (
                  <>
                    <input aria-label={`${b.days[hour.dayOfWeek]} ${b.opens}`} type="time" value={hour.openTime ?? ''} onChange={(event) => patchHour(index, { openTime: event.target.value })} className={INPUT} />
                    <input aria-label={`${b.days[hour.dayOfWeek]} ${b.closes}`} type="time" value={hour.closeTime ?? ''} onChange={(event) => patchHour(index, { closeTime: event.target.value })} className={INPUT} />
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600">
                      <input type="checkbox" checked={hour.closesNextDay} onChange={(event) => patchHour(index, { closesNextDay: event.target.checked })} />
                      {b.nextDay}
                    </label>
                  </>
                )}
              </li>
            ))}
          </ul>
        </fieldset>
      </form>
    </Modal>
  )
        }
