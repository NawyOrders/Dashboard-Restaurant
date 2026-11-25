import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { MenuItem } from '../api/types'
import type { CreateOfferInput, OfferKind, OfferStatus, PromotionalOffer, UpdateOfferInput } from '../api/offers'
import { OFFER_IMAGE_TYPES, OFFER_KINDS, OFFER_STATUSES } from '../api/offers'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { formatOrderTotal } from '../orders'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { EditIcon, PlusIcon, SpinnerIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, fromLocalInput, INPUT, LoadingPanel, Pill, Switch, toLocalInput } from '../manage/kit'
import { manageCopy } from '../manage/text'

export type OffersPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  // True when the API is the real backend: banner bytes are PUT to the signed URL.
  uploadsEnabled: boolean
  onToast: (message: string) => void
}

const TONES: Record<OfferStatus, 'good' | 'gold' | 'muted' | 'bad'> = {
  Active: 'good',
  Scheduled: 'gold',
  Inactive: 'muted',
  Expired: 'bad',
}

// The preview menu uses short ids; the offers API wants UUIDs. Real UUIDs pass through.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function offerItemId(id: string): string {
  if (UUID.test(id)) return id
  const hex = Array.from(id).map((char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  return `00000000-0000-7000-8000-${hex.padStart(12, '0').slice(-12)}`
}

type Row = { menuItemId: string; quantity: number }
type Draft = {
  kind: OfferKind
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  offerPrice: string
  startsAt: string
  endsAt: string
  isActive: boolean
  notifyCustomers: boolean
  rows: Row[]
  file: File | null
}

function emptyDraft(firstItem: string): Draft {
  const start = new Date()
  const end = new Date(start.getTime() + 7 * 86_400_000)
  return {
    kind: 'SingleItem',
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    offerPrice: '',
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
    isActive: true,
    notifyCustomers: false,
    rows: [{ menuItemId: firstItem, quantity: 1 }],
    file: null,
  }
}

function draftFromOffer(offer: PromotionalOffer): Draft {
  return {
    kind: offer.kind,
    titleAr: offer.titleAr,
    titleEn: offer.titleEn,
    descriptionAr: offer.descriptionAr ?? '',
    descriptionEn: offer.descriptionEn ?? '',
    offerPrice: String(offer.offerPrice),
    startsAt: toLocalInput(offer.startsAtUtc),
    endsAt: toLocalInput(offer.endsAtUtc),
    isActive: offer.isActive,
    notifyCustomers: false,
    rows: offer.items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
    file: null,
  }
}

export default function OffersPage({ t, lang, api, permissions, uploadsEnabled, onToast }: OffersPageProps) {
  const c = manageCopy[lang]
  const o = c.offers
  const canManage = can(permissions, PERMISSIONS.offersManage)
  const canView = canManage || can(permissions, PERMISSIONS.offersView)
  const [offers, setOffers] = useState<PromotionalOffer[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [kind, setKind] = useState<OfferKind | ''>('')
  const [status, setStatus] = useState<OfferStatus | ''>('')
  const [editing, setEditing] = useState<{ offer: PromotionalOffer | null } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setState('loading')
    Promise.all([
      api.listOffers({ kind: kind || undefined, status: status || undefined, pageSize: 100 }),
      api.listMenu(),
    ])
      .then(([page, menu]) => {
        if (cancelled) return
        setOffers(page.items)
        setMenuItems(menu.flatMap((category) => category.items))
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, canView, kind, status, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  const name = (en: string, ar: string) => (lang === 'ar' ? ar || en : en || ar)
  const itemName = (item: PromotionalOffer['items'][number]) => {
    const known = menuItems.find((entry) => offerItemId(entry.id) === item.menuItemId)
    return name(item.menuItemNameEn || known?.nameEn || '', item.menuItemNameAr || known?.nameAr || '') || '—'
  }

  const toggle = async (offer: PromotionalOffer) => {
    if (busyId) return
    setBusyId(offer.id)
    try {
      await api.setOfferStatus(offer.id, { isActive: !offer.isActive })
      onToast(o.toggled)
      reload()
    } catch {
      onToast(c.saveError)
    } finally {
      setBusyId(null)
    }
  }

  if (!canView) return <EmptyPanel text={c.noAccess} />

  return (
    <div>
      <PageHeading
        title={o.title}
        subtitle={o.subtitle}
        action={
          canManage && (
            <button type="button" onClick={() => setEditing({ offer: null })} className={BTN_PRIMARY}>
              <PlusIcon className="h-4 w-4" />
              {o.add}
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-44">
          <Field id="offers-kind" label={o.kind}>
            <select id="offers-kind" value={kind} onChange={(event) => setKind(event.target.value as OfferKind | '')} className={INPUT}>
              <option value="">{o.all}</option>
              {OFFER_KINDS.map((value) => <option key={value} value={value}>{o.kinds[value]}</option>)}
            </select>
          </Field>
        </div>
        <div className="w-44">
          <Field id="offers-status" label={o.status}>
            <select id="offers-status" value={status} onChange={(event) => setStatus(event.target.value as OfferStatus | '')} className={INPUT}>
              <option value="">{o.all}</option>
              {OFFER_STATUSES.map((value) => <option key={value} value={value}>{o.statuses[value]}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && offers.length === 0 && <EmptyPanel text={o.empty} />}
      {state === 'ready' && offers.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <li key={offer.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className="relative aspect-[16/9] bg-[#FBF1D8]">
                {uploadsEnabled && offer.imageUrl && <img src={offer.imageUrl} alt="" className="h-full w-full object-cover" />}
                <span className="absolute start-3 top-3"><Pill tone={TONES[offer.status]}>{o.statuses[offer.status]}</Pill></span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="break-words text-sm font-extrabold leading-6 text-stone-800">{name(offer.titleEn, offer.titleAr)}</h3>
                <p className="mt-0.5 text-xs text-stone-500">
                  {o.kinds[offer.kind]} • {offer.items.map((item) => `${item.quantity}× ${itemName(item)}`).join('، ')}
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-2 text-sm tabular-nums">
                  <span className="font-extrabold text-brand-600">{formatOrderTotal(offer.offerPrice, lang)}</span>
                  <span className="text-xs text-stone-400 line-through">{formatOrderTotal(offer.originalPrice, lang)}</span>
                  <span className="text-xs font-bold text-mint-600">-{offer.discountPercentage}%</span>
                </p>
                {canManage && (
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                    <Switch checked={offer.isActive} label={`${o.active}: ${name(offer.titleEn, offer.titleAr)}`} disabled={busyId === offer.id} onChange={() => void toggle(offer)} />
                    <button type="button" onClick={() => setEditing({ offer })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                      <EditIcon className="h-4 w-4" />
                      {c.edit}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <OfferForm
          key={editing.offer?.id ?? 'new'}
          t={t}
          lang={lang}
          api={api}
          offer={editing.offer}
          menuItems={menuItems}
          uploadsEnabled={uploadsEnabled}
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

function OfferForm({ t, lang, api, offer, menuItems, uploadsEnabled, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  offer: PromotionalOffer | null
  menuItems: MenuItem[]
  uploadsEnabled: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  const c = manageCopy[lang]
  const o = c.offers
  const [draft, setDraft] = useState<Draft>(() => (offer ? draftFromOffer(offer) : emptyDraft(menuItems[0]?.id ?? '')))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }))
  const patchRow = (index: number, next: Partial<Row>) =>
    patch({ rows: draft.rows.map((row, i) => (i === index ? { ...row, ...next } : row)) })
  const itemLabel = (item: MenuItem) => (lang === 'ar' ? item.nameAr : item.nameEn)

  const submit = async () => {
    setError(null)
    const price = Number(draft.offerPrice)
    const startsAtUtc = fromLocalInput(draft.startsAt)
    const endsAtUtc = fromLocalInput(draft.endsAt)
    if (!draft.titleAr.trim() || !draft.titleEn.trim() || !draft.offerPrice || !Number.isFinite(price) || !startsAtUtc || !endsAtUtc) {
      setError(o.invalid)
      return
    }
    if (!offer && !draft.file) {
      setError(o.imageRequired)
      return
    }
    const items = draft.rows.filter((row) => row.menuItemId).map((row) => ({ menuItemId: offerItemId(row.menuItemId), quantity: Number(row.quantity) }))
    const common = {
      kind: draft.kind,
      titleAr: draft.titleAr.trim(),
      titleEn: draft.titleEn.trim(),
      descriptionAr: draft.descriptionAr.trim() || null,
      descriptionEn: draft.descriptionEn.trim() || null,
      offerPrice: price,
      startsAtUtc,
      endsAtUtc,
      isActive: draft.isActive,
      items,
    }
    setSaving(true)
    try {
      let imageKey: string | null = null
      if (draft.file) {
        if (!(OFFER_IMAGE_TYPES as readonly string[]).includes(draft.file.type)) {
          setError(o.uploadError)
          return
        }
        const upload = await api.createOfferImageUploadUrl({ fileName: draft.file.name, contentType: draft.file.type, sizeBytes: draft.file.size })
        if (uploadsEnabled) {
          const put = await fetch(upload.uploadUrl, { method: 'PUT', body: draft.file, headers: { 'Content-Type': draft.file.type } })
          if (!put.ok) {
            setError(o.uploadError)
            return
          }
        }
        imageKey = upload.objectKey
      }
      if (offer) {
        const input: UpdateOfferInput = { ...common, imageKey, imageSource: imageKey ? 'ManualUpload' : null }
        await api.updateOffer(offer.id, input)
      } else {
        const input: CreateOfferInput = { ...common, imageKey: imageKey as string, imageSource: 'ManualUpload', notifyCustomers: draft.notifyCustomers }
        await api.createOffer(input)
      }
      onDone(c.saved)
    } catch {
      setError(c.saveError)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!offer) return
    setSaving(true)
    try {
      await api.deleteOffer(offer.id)
      onDone(c.deleted)
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={offer ? o.edit : o.add}
      closeLabel={t.actions.close}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {offer && (
              <button type="button" disabled={saving} onClick={() => (confirming ? void remove() : setConfirming(true))} className={`${BTN_GHOST} text-brand-700`}>
                {confirming ? c.confirmDelete : c.delete}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={BTN_GHOST}>{c.cancel}</button>
            <button type="button" disabled={saving} onClick={() => void submit()} className={BTN_PRIMARY}>
              {saving && <SpinnerIcon className="h-4 w-4" />}
              {c.save}
            </button>
          </div>
        </div>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 sm:col-span-2">{error}</p>}
        <Field id="offer-kind" label={o.kind}>
          <select id="offer-kind" value={draft.kind} onChange={(event) => patch({ kind: event.target.value as OfferKind })} className={INPUT}>
            {OFFER_KINDS.map((value) => <option key={value} value={value}>{o.kinds[value]}</option>)}
          </select>
        </Field>
        <Field id="offer-price" label={o.price}>
          <input id="offer-price" type="number" min="0" step="0.01" inputMode="decimal" value={draft.offerPrice} onChange={(event) => patch({ offerPrice: event.target.value })} className={INPUT} />
        </Field>
        <Field id="offer-title-ar" label={o.titleAr}>
          <input id="offer-title-ar" type="text" maxLength={200} value={draft.titleAr} onChange={(event) => patch({ titleAr: event.target.value })} className={INPUT} />
        </Field>
        <Field id="offer-title-en" label={o.titleEn}>
          <input id="offer-title-en" type="text" maxLength={200} dir="ltr" value={draft.titleEn} onChange={(event) => patch({ titleEn: event.target.value })} className={`${INPUT} text-start`} />
        </Field>
        <Field id="offer-desc-ar" label={o.descriptionAr}>
          <input id="offer-desc-ar" type="text" value={draft.descriptionAr} onChange={(event) => patch({ descriptionAr: event.target.value })} className={INPUT} />
        </Field>
        <Field id="offer-desc-en" label={o.descriptionEn}>
          <input id="offer-desc-en" type="text" dir="ltr" value={draft.descriptionEn} onChange={(event) => patch({ descriptionEn: event.target.value })} className={`${INPUT} text-start`} />
        </Field>
        <Field id="offer-starts" label={o.starts}>
          <input id="offer-starts" type="datetime-local" value={draft.startsAt} onChange={(event) => patch({ startsAt: event.target.value })} className={INPUT} />
        </Field>
        <Field id="offer-ends" label={o.ends}>
          <input id="offer-ends" type="datetime-local" value={draft.endsAt} onChange={(event) => patch({ endsAt: event.target.value })} className={INPUT} />
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-bold text-stone-600">{o.items}</p>
          <ul className="flex flex-col gap-2">
            {draft.rows.map((row, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                <select aria-label={o.items} value={row.menuItemId} onChange={(event) => patchRow(index, { menuItemId: event.target.value })} className={INPUT}>
                  {menuItems.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}
                  {!menuItems.some((item) => item.id === row.menuItemId) && <option value={row.menuItemId}>{row.menuItemId}</option>}
                </select>
                </div>
                <div className="w-24 shrink-0">
                  <input aria-label={o.quantity} type="number" min="1" step="1" value={row.quantity} onChange={(event) => patchRow(index, { quantity: Number(event.target.value) })} className={INPUT} />
                </div>
                {draft.rows.length > 1 && (
                  <button type="button" aria-label={c.delete} onClick={() => patch({ rows: draft.rows.filter((_, i) => i !== index) })} className={`${BTN_GHOST} px-3`}>×</button>
                )}
              </li>
            ))}
          </ul>
          {draft.kind === 'Combo' && (
            <button type="button" onClick={() => patch({ rows: [...draft.rows, { menuItemId: menuItems[0]?.id ?? '', quantity: 1 }] })} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-dashed border-brand-300 px-3 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
              <PlusIcon className="h-3.5 w-3.5" />
              {o.addItem}
            </button>
          )}
        </div>

        <div className="sm:col-span-2">
          <Field id="offer-image" label={o.image} hint={o.imageHint}>
            <input id="offer-image" type="file" accept={OFFER_IMAGE_TYPES.join(',')} onChange={(event) => patch({ file: event.target.files?.[0] ?? null })} className={`${INPUT} py-2`} />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
          <span className="text-sm font-bold text-stone-800">{o.active}</span>
          <Switch checked={draft.isActive} label={o.active} onChange={() => patch({ isActive: !draft.isActive })} />
        </div>
        {!offer && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
            <span className="text-sm font-bold text-stone-800">{o.notify}</span>
            <Switch checked={draft.notifyCustomers} label={o.notify} onChange={() => patch({ notifyCustomers: !draft.notifyCustomers })} />
          </div>
        )}
      </form>
    </Modal>
  )
}
