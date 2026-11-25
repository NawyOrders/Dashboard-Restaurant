import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { CategorySummary } from '../api/categories'
import type { CreateMenuItemInput, MenuItemSizeInput } from '../api/menuItems'
import { OFFER_IMAGE_TYPES } from '../api/offers'
import type { MenuItem } from '../api/types'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { EditIcon, PlusIcon, SpinnerIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Pill, Switch } from '../manage/kit'
import { manageCopy } from '../manage/text'
import { formatOrderTotal } from '../orders'

export type MenuItemsPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  uploadsEnabled: boolean
  onToast: (message: string) => void
}

type CategoryChoice = { id: string; label: string }
type SizeDraft = { nameAr: string; nameEn: string; price: string; isDefault: boolean }

// Menu items. The reference has no single-item read, so the list comes from
// the menu read (GET /menu/categories feeds the choices, the menu read feeds
// the cards) and the form sends exactly what the reference allows.
export default function MenuItemsPage({ t, lang, api, permissions, uploadsEnabled, onToast }: MenuItemsPageProps) {
  const c = manageCopy[lang]
  const m = c.items
  const canView = can(permissions, PERMISSIONS.menuView) || can(permissions, PERMISSIONS.menuEdit)
  const canEdit = can(permissions, PERMISSIONS.menuEdit)
  const [items, setItems] = useState<MenuItem[]>([])
  const [choices, setChoices] = useState<CategoryChoice[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<{ item: MenuItem | null } | null>(null)
  // Items created in this session, so they show even before the menu read includes them.
  const [created, setCreated] = useState<MenuItem[]>([])

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setState('loading')
    const name = (category: CategorySummary) => (lang === 'ar' ? category.nameAr : category.nameEn)
    Promise.all([
      api.listMenu(),
      api.listRootCategories().then(async (roots) => {
        const out: CategoryChoice[] = []
        for (const root of roots) {
          out.push({ id: root.id, label: name(root) })
          if (root.hasSubCategories) {
            for (const child of await api.listSubcategories(root.id)) out.push({ id: child.id, label: `${name(root)} / ${name(child)}` })
          }
        }
        return out
      }),
    ])
      .then(([menu, options]) => {
        if (cancelled) return
        setItems(menu.flatMap((category) => category.items))
        setChoices(options)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, canView, lang, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  if (!canView) return <EmptyPanel text={c.noAccess} />

  const all = [...items, ...created.filter((entry) => !items.some((item) => item.id === entry.id))]
  const editable = (item: MenuItem) => canEdit && choices.some((choice) => choice.id === item.categoryId)

  return (
    <div>
      <PageHeading
        title={m.title}
        subtitle={m.subtitle}
        action={
          canEdit ? (
            <button type="button" onClick={() => setEditing({ item: null })} className={BTN_PRIMARY}>
              <PlusIcon className="h-4 w-4" />
              {m.add}
            </button>
          ) : undefined
        }
      />
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <section>
          {all.length === 0 && <EmptyPanel text={m.empty} />}
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {all.map((item) => (
              <li key={item.id} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-50">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-extrabold text-stone-800">{lang === 'ar' ? item.nameAr : item.nameEn}</h3>
                    <p className="text-xs text-stone-500"><bdi>{lang === 'ar' ? item.nameEn : item.nameAr}</bdi></p>
                    <p className="mt-1 text-sm font-extrabold tabular-nums text-brand-600">{formatOrderTotal(item.price, lang)}</p>
                  </div>
                </div>
                {!item.available && <div><Pill tone="muted">{m.hidden}</Pill></div>}
                {editable(item) && (
                  <div>
                    <button type="button" onClick={() => setEditing({ item })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                      <EditIcon className="h-4 w-4" />
                      {c.edit}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && (
        <ItemForm
          t={t}
          lang={lang}
          api={api}
          item={editing.item}
          choices={choices}
          uploadsEnabled={uploadsEnabled}
          onClose={() => setEditing(null)}
          onDone={(message, entry) => {
            setEditing(null)
            onToast(message)
            if (entry) setCreated((list) => [...list.filter((existing) => existing.id !== entry.id), entry])
            reload()
          }}
        />
      )}
    </div>
  )
}

function ItemForm({ t, lang, api, item, choices, uploadsEnabled, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  item: MenuItem | null
  choices: CategoryChoice[]
  uploadsEnabled: boolean
  onClose: () => void
  onDone: (message: string, entry?: MenuItem) => void
}) {
  const c = manageCopy[lang]
  const m = c.items
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? choices[0]?.id ?? '')
  const [nameAr, setNameAr] = useState(item?.nameAr ?? '')
  const [nameEn, setNameEn] = useState(item?.nameEn ?? '')
  const [descAr, setDescAr] = useState('')
  const [descEn, setDescEn] = useState('')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [visible, setVisible] = useState(item?.available ?? true)
  const [sizes, setSizes] = useState<SizeDraft[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patchSize = (index: number, patch: Partial<SizeDraft>) =>
    setSizes((list) => list.map((size, position) => (position === index ? { ...size, ...patch } : patch.isDefault ? { ...size, isDefault: false } : size)))

  const submit = async () => {
    const basePrice = Number(price)
    const sizeInputs: MenuItemSizeInput[] = sizes.map((size, index) => ({
      nameAr: size.nameAr.trim(),
      nameEn: size.nameEn.trim(),
      price: Number(size.price),
      sortOrder: index,
      isDefault: size.isDefault,
    }))
    const sizesOk = sizeInputs.every((size) => size.nameAr && size.nameEn && size.price >= 0 && Number.isFinite(size.price)) &&
      new Set(sizeInputs.map((size) => size.nameEn.toLowerCase())).size === sizeInputs.length
    if (!categoryId || !nameAr.trim() || !nameEn.trim() || price.trim() === '' || !Number.isFinite(basePrice) || basePrice < 0 || !sizesOk) {
      setError(m.invalid)
      return
    }
    setSaving(true)
    try {
      let imageKey: string | null = null
      if (file) {
        if (!(OFFER_IMAGE_TYPES as readonly string[]).includes(file.type)) {
          setError(m.uploadError)
          setSaving(false)
          return
        }
        const upload = await api.createMenuItemImageUploadUrl({ fileName: file.name, contentType: file.type, sizeBytes: file.size })
        if (uploadsEnabled) {
          const put = await fetch(upload.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          if (!put.ok) {
            setError(m.uploadError)
            setSaving(false)
            return
          }
        }
        imageKey = upload.objectKey
      }
      const input: CreateMenuItemInput = {
        categoryId,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        basePrice,
        sortOrder: 0,
        descriptionAr: descAr.trim() || null,
        descriptionEn: descEn.trim() || null,
        imageKey,
        isVisibleToCustomers: visible,
        // Create sends the sizes; edit sends null so existing sizes are kept.
        sizes: item ? null : sizeInputs,
      }
      const saved = item ? await api.updateMenuItem(item.id, input) : await api.createMenuItem(input)
      onDone(c.saved, { id: saved.id, nameAr: saved.nameAr, nameEn: saved.nameEn, price: saved.basePrice, available: saved.isVisibleToCustomers, imageUrl: saved.imageUrl, categoryId: saved.categoryId })
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  const act = async (run: () => Promise<unknown>, message: string) => {
    setSaving(true)
    try {
      await run()
      onDone(message)
    } catch {
      setError(c.saveError)
      setConfirming(false)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? m.edit : m.add}
      closeLabel={t.actions.close}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {item && (
              <button type="button" disabled={saving} onClick={() => (confirming ? void act(() => api.deleteMenuItem(item.id), c.deleted) : setConfirming(true))} className={`${BTN_GHOST} text-brand-700`}>
                {confirming ? c.confirmDelete : c.delete}
              </button>
            )}
            {item?.imageUrl && (
              <button type="button" disabled={saving} onClick={() => void act(() => api.removeMenuItemImage(item.id), c.saved)} className={BTN_GHOST}>
                {m.removeImage}
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
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">{error}</p>}
        {choices.length === 0 && <p className="rounded-xl bg-cream-50 px-3 py-2 text-xs text-stone-600">{m.noCategories}</p>}
        <Field id="item-category" label={m.category}>
          <select id="item-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={INPUT}>
            {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="item-name-ar" label={m.nameAr}>
            <input id="item-name-ar" type="text" maxLength={200} value={nameAr} onChange={(event) => setNameAr(event.target.value)} className={INPUT} />
          </Field>
          <Field id="item-name-en" label={m.nameEn}>
            <input id="item-name-en" type="text" dir="ltr" maxLength={200} value={nameEn} onChange={(event) => setNameEn(event.target.value)} className={INPUT} />
          </Field>
          <Field id="item-desc-ar" label={m.descAr}>
            <textarea id="item-desc-ar" rows={2} maxLength={1000} value={descAr} onChange={(event) => setDescAr(event.target.value)} className={INPUT} />
          </Field>
          <Field id="item-desc-en" label={m.descEn}>
            <textarea id="item-desc-en" rows={2} dir="ltr" maxLength={1000} value={descEn} onChange={(event) => setDescEn(event.target.value)} className={INPUT} />
          </Field>
        </div>
        {item && <p className="text-[11px] text-stone-500">{m.descNote}</p>}
        <Field id="item-price" label={m.price}>
          <input id="item-price" type="number" inputMode="decimal" min={0} step="0.01" dir="ltr" value={price} onChange={(event) => setPrice(event.target.value)} className={INPUT} />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
          <span className="text-sm font-bold text-stone-700">{m.visible}</span>
          <Switch checked={visible} onChange={() => setVisible((value) => !value)} label={m.visible} />
        </div>
        <Field id="item-image" label={m.image}>
          <input id="item-image" type="file" accept={OFFER_IMAGE_TYPES.join(',')} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${INPUT} py-2`} />
        </Field>
        {item ? (
          <p className="text-[11px] text-stone-500">{m.sizesNote}</p>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-stone-600">{m.sizes}</p>
              <button type="button" onClick={() => setSizes((list) => [...list, { nameAr: '', nameEn: '', price: '', isDefault: false }])} className={`${BTN_GHOST} min-h-9 px-3 text-xs`}>
                <PlusIcon className="h-4 w-4" />
                {m.addSize}
              </button>
            </div>
            <div className="grid gap-2">
              {sizes.map((size, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_6rem_auto] sm:items-center">
                  <input aria-label={m.sizeNameAr} value={size.nameAr} onChange={(event) => patchSize(index, { nameAr: event.target.value })} className={INPUT} placeholder={m.sizeNameAr} />
                  <input aria-label={m.sizeNameEn} dir="ltr" value={size.nameEn} onChange={(event) => patchSize(index, { nameEn: event.target.value })} className={INPUT} placeholder={m.sizeNameEn} />
                  <input aria-label={`${m.price} ${index + 1}`} type="number" min={0} step="0.01" dir="ltr" value={size.price} onChange={(event) => patchSize(index, { price: event.target.value })} className={INPUT} />
                  <label className="flex items-center gap-1 text-xs font-bold text-stone-600">
                    <input type="radio" name="size-default" checked={size.isDefault} onChange={() => patchSize(index, { isDefault: true })} />
                    {m.sizeDefault}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
