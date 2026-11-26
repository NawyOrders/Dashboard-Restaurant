import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { AddOn } from '../api/addOns'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { EditIcon, PlusIcon, SpinnerIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Pill, Switch } from '../manage/kit'
import { manageCopy } from '../manage/text'
import { formatOrderTotal } from '../orders'

export type AddOnsPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  onToast: (message: string) => void
}

type ItemChoice = { id: string; label: string }
const PAGE_SIZE = 20

// Menu add-ons. All endpoints need menu.edit, so the screen is for menu.edit only.
export default function AddOnsPage({ t, lang, api, permissions, onToast }: AddOnsPageProps) {
  const c = manageCopy[lang]
  const a = c.addons
  const allowed = can(permissions, PERMISSIONS.menuEdit)
  const [list, setList] = useState<AddOn[]>([])
  const [choices, setChoices] = useState<ItemChoice[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [onlyActive, setOnlyActive] = useState(false)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<{ addOn: AddOn | null } | null>(null)

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    setState('loading')
    Promise.all([
      api.listAddOns({ pageNumber: 1, pageSize: PAGE_SIZE * page, ...(onlyActive ? { isActive: true } : {}) }),
      api.listMenu(),
    ])
      .then(([result, menu]) => {
        if (cancelled) return
        setList(result.items)
        setHasNext(result.hasNextPage)
        setChoices(menu.flatMap((category) => category.items).map((item) => ({ id: item.id, label: lang === 'ar' ? item.nameAr : item.nameEn })))
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, allowed, lang, page, onlyActive, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  if (!allowed) return <EmptyPanel text={c.noAccess} />
  const itemName = (id: string) => choices.find((choice) => choice.id === id)?.label ?? ''

  return (
    <div>
      <PageHeading
        title={a.title}
        subtitle={a.subtitle}
        action={
          <button type="button" onClick={() => setEditing({ addOn: null })} className={BTN_PRIMARY}>
            <PlusIcon className="h-4 w-4" />
            {a.add}
          </button>
        }
      />
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2">
        <Switch checked={onlyActive} onChange={() => { setPage(1); setOnlyActive((value) => !value) }} label={a.onlyActive} />
        <span className="text-sm font-bold text-stone-700">{a.onlyActive}</span>
      </div>
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <section>
          {list.length === 0 && <EmptyPanel text={a.empty} />}
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {list.map((addOn) => (
              <li key={addOn.id} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-sm font-extrabold text-stone-800">{lang === 'ar' ? addOn.nameAr : addOn.nameEn}</h3>
                  <Pill tone={addOn.isActive ? 'good' : 'muted'}>{addOn.isActive ? a.active : a.inactive}</Pill>
                </div>
                <p className="text-xs text-stone-500">{itemName(addOn.menuItemId)}</p>
                <p className="text-sm font-extrabold tabular-nums text-brand-600">{formatOrderTotal(addOn.price, lang)}</p>
                <div>
                  <button type="button" onClick={() => setEditing({ addOn })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                    <EditIcon className="h-4 w-4" />
                    {c.edit}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {hasNext && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => setPage((value) => value + 1)} className={BTN_GHOST}>{a.more}</button>
            </div>
          )}
        </section>
      )}
      {editing && (
        <AddOnForm
          t={t}
          lang={lang}
          api={api}
          addOn={editing.addOn}
          choices={choices}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null)
            onToast(message)
            reload()
          }}
        />
      )}
    </div>
  )
}

function AddOnForm({ t, lang, api, addOn, choices, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  addOn: AddOn | null
  choices: ItemChoice[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const c = manageCopy[lang]
  const a = c.addons
  const [itemId, setItemId] = useState(addOn?.menuItemId ?? choices[0]?.id ?? '')
  const [nameAr, setNameAr] = useState(addOn?.nameAr ?? '')
  const [nameEn, setNameEn] = useState(addOn?.nameEn ?? '')
  const [price, setPrice] = useState(addOn ? String(addOn.price) : '')
  const [active, setActive] = useState(addOn?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (work: () => Promise<unknown>, message: string) => {
    setSaving(true)
    try {
      await work()
      onDone(message)
    } catch {
      setError(c.saveError)
      setConfirming(false)
      setSaving(false)
    }
  }

  const submit = () => {
    const value = Number(price)
    if (!itemId || !nameAr.trim() || !nameEn.trim() || nameAr.length > 200 || nameEn.length > 200 || price.trim() === '' || !Number.isFinite(value) || value < 0) {
      setError(a.invalid)
      return
    }
    if (addOn) {
      // PATCH: send only what changed.
      const patch = {
        ...(nameAr.trim() !== addOn.nameAr ? { nameAr: nameAr.trim() } : {}),
        ...(nameEn.trim() !== addOn.nameEn ? { nameEn: nameEn.trim() } : {}),
        ...(value !== addOn.price ? { price: value } : {}),
        ...(active !== addOn.isActive ? { isActive: active } : {}),
      }
      if (Object.keys(patch).length === 0) {
        onClose()
        return
      }
      void run(() => api.updateAddOn(addOn.menuItemId, addOn.id, patch), c.saved)
    } else {
      void run(() => api.createAddOn(itemId, { nameAr: nameAr.trim(), nameEn: nameEn.trim(), price: value }), c.saved)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={addOn ? a.edit : a.add}
      closeLabel={t.actions.close}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {addOn && (
              <button type="button" disabled={saving} onClick={() => (confirming ? void run(() => api.deleteAddOn(addOn.menuItemId, addOn.id), c.deleted) : setConfirming(true))} className={`${BTN_GHOST} text-brand-700`}>
                {confirming ? c.confirmDelete : c.delete}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={BTN_GHOST}>{c.cancel}</button>
            <button type="button" disabled={saving} onClick={submit} className={BTN_PRIMARY}>
              {saving && <SpinnerIcon className="h-4 w-4" />}
              {c.save}
            </button>
          </div>
        </div>
      }
    >
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">{error}</p>}
        {choices.length === 0 && <p className="rounded-xl bg-cream-50 px-3 py-2 text-xs text-stone-600">{a.noItems}</p>}
        <Field id="addon-item" label={a.item}>
          <select id="addon-item" value={itemId} disabled={Boolean(addOn)} onChange={(event) => setItemId(event.target.value)} className={INPUT}>
            {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
          </select>
        </Field>
        <Field id="addon-name-ar" label={a.nameAr}>
          <input id="addon-name-ar" type="text" maxLength={200} value={nameAr} onChange={(event) => setNameAr(event.target.value)} className={INPUT} />
        </Field>
        <Field id="addon-name-en" label={a.nameEn}>
          <input id="addon-name-en" type="text" dir="ltr" maxLength={200} value={nameEn} onChange={(event) => setNameEn(event.target.value)} className={INPUT} />
        </Field>
        <Field id="addon-price" label={a.price}>
          <input id="addon-price" type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" value={price} onChange={(event) => setPrice(event.target.value)} className={INPUT} />
        </Field>
        {addOn && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
            <span className="text-sm font-bold text-stone-700">{a.active}</span>
            <Switch checked={active} onChange={() => setActive((value) => !value)} label={a.active} />
          </div>
        )}
      </form>
    </Modal>
  )
}
