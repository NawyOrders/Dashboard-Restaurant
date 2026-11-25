import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import { ApiError } from '../api/types'
import type { CategorySummary } from '../api/categories'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { ArrowDownIcon, ArrowUpIcon, EditIcon, PlusIcon, SpinnerIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Pill } from '../manage/kit'
import { manageCopy } from '../manage/text'

export type CategoriesPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  onToast: (message: string) => void
}

type Editing = { category: CategorySummary | null; parentId: string | null }

// Menu categories (one level of subcategories). menu.view reads, menu.edit
// shows add, edit, delete and reorder.
export default function CategoriesPage({ t, lang, api, permissions, onToast }: CategoriesPageProps) {
  const c = manageCopy[lang]
  const k = c.categories
  const canView = can(permissions, PERMISSIONS.menuView) || can(permissions, PERMISSIONS.menuEdit)
  const canEdit = can(permissions, PERMISSIONS.menuEdit)
  const [roots, setRoots] = useState<CategorySummary[]>([])
  const [subs, setSubs] = useState<Record<string, CategorySummary[]>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [busy, setBusy] = useState(false)

  const loadSubs = useCallback(
    (id: string) => api.listSubcategories(id).then((list) => setSubs((current) => ({ ...current, [id]: list }))),
    [api],
  )

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setState('loading')
    api
      .listRootCategories()
      .then((list) => {
        if (cancelled) return
        setRoots(list)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, canView, reloadKey])

  const reload = () => {
    setReloadKey((key) => key + 1)
    if (open) void loadSubs(open).catch(() => undefined)
  }

  const toggle = (id: string) => {
    if (open === id) {
      setOpen(null)
      return
    }
    setOpen(id)
    void loadSubs(id).catch(() => onToast(c.loadError))
  }

  const move = async (list: CategorySummary[], index: number, delta: -1 | 1, parentId: string | null) => {
    const next = [...list]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setBusy(true)
    try {
      await api.reorderCategories({ parentId, orderedCategoryIds: next.map((item) => item.id) })
      onToast(c.saved)
      reload()
    } catch {
      onToast(c.saveError)
    } finally {
      setBusy(false)
    }
  }

  if (!canView) return <EmptyPanel text={c.noAccess} />

  const row = (item: CategorySummary, list: CategorySummary[], index: number, parentId: string | null) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className="break-words text-sm font-extrabold text-stone-800">{lang === 'ar' ? item.nameAr : item.nameEn}</h3>
        <p className="text-xs text-stone-500">
          <bdi>{lang === 'ar' ? item.nameEn : item.nameAr}</bdi> · {item.itemCount} {k.items}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!item.isActive && <Pill tone="muted">{k.inactive}</Pill>}
        {canEdit && (
          <>
            <button type="button" aria-label={k.moveUp} disabled={busy || index === 0} onClick={() => void move(list, index, -1, parentId)} className={`${BTN_GHOST} min-h-10 px-2`}>
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button type="button" aria-label={k.moveDown} disabled={busy || index === list.length - 1} onClick={() => void move(list, index, 1, parentId)} className={`${BTN_GHOST} min-h-10 px-2`}>
              <ArrowDownIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setEditing({ category: item, parentId })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
              <EditIcon className="h-4 w-4" />
              {c.edit}
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeading
        title={k.title}
        subtitle={k.subtitle}
        action={
          canEdit ? (
            <button type="button" onClick={() => setEditing({ category: null, parentId: null })} className={BTN_PRIMARY}>
              <PlusIcon className="h-4 w-4" />
              {k.add}
            </button>
          ) : undefined
        }
      />
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <section>
          {roots.length === 0 && <EmptyPanel text={k.empty} />}
          <ul className="grid grid-cols-1 gap-4">
            {roots.map((root, index) => (
              <li key={root.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
                {row(root, roots, index, null)}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" aria-expanded={open === root.id} onClick={() => toggle(root.id)} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                    {k.subcategories}
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => setEditing({ category: null, parentId: root.id })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                      <PlusIcon className="h-4 w-4" />
                      {k.addSub}
                    </button>
                  )}
                </div>
                {open === root.id && (
                  <ul className="mt-3 grid gap-3 border-t border-line pt-3">
                    {(subs[root.id] ?? []).length === 0 && <li className="text-xs text-stone-500">{k.noSubs}</li>}
                    {(subs[root.id] ?? []).map((child, childIndex, list) => (
                      <li key={child.id}>{row(child, list, childIndex, root.id)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && (
        <CategoryForm
          t={t}
          lang={lang}
          api={api}
          editing={editing}
          siblings={editing.parentId ? (subs[editing.parentId] ?? []).length : roots.length}
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

function CategoryForm({ t, lang, api, editing, siblings, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  editing: Editing
  siblings: number
  onClose: () => void
  onDone: (message: string) => void
}) {
  const c = manageCopy[lang]
  const k = c.categories
  const category = editing.category
  const [nameAr, setNameAr] = useState(category?.nameAr ?? '')
  const [nameEn, setNameEn] = useState(category?.nameEn ?? '')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!nameAr.trim() || !nameEn.trim() || nameAr.length > 200 || nameEn.length > 200) {
      setError(k.invalid)
      return
    }
    setSaving(true)
    try {
      if (category) await api.updateCategory(category.id, { nameAr: nameAr.trim(), nameEn: nameEn.trim() })
      else await api.createCategory({ nameAr: nameAr.trim(), nameEn: nameEn.trim(), sortOrder: siblings, parentId: editing.parentId })
      onDone(c.saved)
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!category) return
    setSaving(true)
    try {
      await api.deleteCategory(category.id)
      onDone(c.deleted)
    } catch (caught) {
      setError(caught instanceof ApiError && caught.code === 'conflict' ? k.hasChildren : c.saveError)
      setConfirming(false)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? k.edit : editing.parentId ? k.addSub : k.add}
      closeLabel={t.actions.close}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {category && (
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
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">{error}</p>}
        <Field id="cat-name-ar" label={k.nameAr}>
          <input id="cat-name-ar" type="text" maxLength={200} value={nameAr} onChange={(event) => setNameAr(event.target.value)} className={INPUT} />
        </Field>
        <Field id="cat-name-en" label={k.nameEn}>
          <input id="cat-name-en" type="text" dir="ltr" maxLength={200} value={nameEn} onChange={(event) => setNameEn(event.target.value)} className={INPUT} />
        </Field>
      </form>
    </Modal>
  )
    }
