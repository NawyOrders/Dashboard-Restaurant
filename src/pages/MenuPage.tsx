import { useEffect, useMemo, useState } from 'react'
import type { Api } from '../api'
import type { MenuCategory, MenuItem } from '../api/types'
import type { Lang, T } from '../i18n'
import { formatOrderTotal } from '../orders'
import { PageHeading } from '../components/PageHeading'
import {
  BowlIcon,
  CupIcon,
  EditIcon,
  FlameIcon,
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  UtensilsIcon,
} from '../icons'

export type MenuPageProps = {
  t: T
  lang: Lang
  api: Api
  onToast: (message: string) => void
}

type LoadState = 'loading' | 'ready' | 'error'

function categoryName(category: MenuCategory, lang: Lang): string {
  return lang === 'ar' ? category.nameAr : category.nameEn
}

function itemName(item: MenuItem, lang: Lang): string {
  return lang === 'ar' ? item.nameAr : item.nameEn
}

function categoryEmoji(categoryId: string): string {
  if (categoryId === 'grills') return '🍖'
  if (categoryId === 'starters') return '🥗'
  return '🥤'
}

function CategoryIcon({ categoryId, className }: { categoryId: string; className?: string }) {
  if (categoryId === 'grills') return <FlameIcon className={className} />
  if (categoryId === 'starters') return <BowlIcon className={className} />
  return <CupIcon className={className} />
}

export default function MenuPage({ t, lang, api, onToast }: MenuPageProps) {
  const [categories, setCategories] = useState<MenuCategory[] | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [selected, setSelected] = useState('all')
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    setState('loading')
    api
      .listMenu()
      .then((data) => {
        if (cancelled) return
        setCategories(data)
        setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, reloadKey])

  const totalCount = useMemo(
    () => categories?.reduce((sum, category) => sum + category.count, 0) ?? 0,
    [categories],
  )

  const normalizedSearch = search.trim().toLowerCase()

  const visibleCategories = useMemo(() => {
    if (!categories) return []
    return categories
      .filter((category) => selected === 'all' || category.id === selected)
      .map((category) => {
        if (!normalizedSearch) return category
        return {
          ...category,
          items: category.items.filter((item) =>
            itemName(item, lang).toLowerCase().includes(normalizedSearch),
          ),
        }
      })
      .filter((category) => !normalizedSearch || category.items.length > 0)
  }, [categories, selected, normalizedSearch, lang])

  const toggleAvailability = async (item: MenuItem) => {
    if (pending[item.id]) return
    const next = !item.available
    const name = itemName(item, lang)

    setPending((current) => ({ ...current, [item.id]: true }))
    setCategories((current) =>
      current
        ? current.map((category) => ({
            ...category,
            items: category.items.map((entry) =>
              entry.id === item.id ? { ...entry, available: next } : entry,
            ),
          }))
        : current,
    )

    try {
      await api.updateMenuItemAvailability(item.id, next)
      onToast(`${name} — ${next ? t.menuPage.available : t.menuPage.unavailable}`)
    } catch {
      setCategories((current) =>
        current
          ? current.map((category) => ({
              ...category,
              items: category.items.map((entry) =>
                entry.id === item.id ? { ...entry, available: item.available } : entry,
              ),
            }))
          : current,
      )
      onToast(t.menuPage.toggleError)
    } finally {
      setPending((current) => {
        const updated = { ...current }
        delete updated[item.id]
        return updated
      })
    }
  }

  return (
    <div>
      <PageHeading
        title={t.menuPage.title}
        subtitle={t.menuPage.subtitle}
        action={
          <button
            type="button"
            onClick={() => onToast(t.menuPage.addComingSoon)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <PlusIcon className="h-4 w-4" />
            {t.menuPage.addItem}
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="dashboard-panel h-fit p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-stone-800">{t.menuPage.categories}</h2>
            <button
              type="button"
              onClick={() => onToast(t.menuPage.addComingSoon)}
              aria-label={t.menuPage.addCategory}
              title={t.menuPage.addCategory}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          <ul className="flex flex-col gap-1.5">
            <li>
              <button
                type="button"
                onClick={() => setSelected('all')}
                aria-pressed={selected === 'all'}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${selected === 'all' ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-cream-50'}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected === 'all' ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600'}`}>
                  <UtensilsIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.menuPage.allItems}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selected === 'all' ? 'bg-white/20 text-white' : 'bg-cream-100 text-stone-500'}`}>
                  {totalCount}
                </span>
              </button>
            </li>
            {categories?.map((category) => {
              const isActive = selected === category.id
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(category.id)}
                    aria-pressed={isActive}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${isActive ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-cream-50'}`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-white/15 text-white' : 'bg-[#FBF1D8] text-[#806116]'}`}>
                      <CategoryIcon categoryId={category.id} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{categoryName(category, lang)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-cream-100 text-stone-500'}`}>
                      {category.count}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => onToast(t.menuPage.addComingSoon)}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-200 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t.menuPage.addCategory}
          </button>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.menuPage.search}
                aria-label={t.menuPage.search}
                className="min-h-11 w-full rounded-xl border border-line bg-white py-2.5 pe-10 ps-10 text-sm text-stone-800 placeholder:text-stone-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelected('all')
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-stone-600 transition-colors hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              {t.actions.viewAll}
            </button>
          </div>

          {state === 'loading' && (
            <div role="status" aria-live="polite" className="dashboard-panel flex items-center gap-3 p-6 text-sm font-semibold text-stone-500">
              <SpinnerIcon className="h-5 w-5 text-brand-600" />
              {t.menuPage.loading}
            </div>
          )}

          {state === 'error' && (
            <div role="alert" className="dashboard-panel flex flex-wrap items-center justify-between gap-3 p-6 text-sm font-semibold text-brand-700">
              <span>{t.menuPage.loadError}</span>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                {t.menuPage.retry}
              </button>
            </div>
          )}

          {state === 'ready' && visibleCategories.length === 0 && (
            <p className="dashboard-panel p-6 text-center text-sm font-semibold text-stone-500">{t.menuPage.noItems}</p>
          )}

          {state === 'ready' &&
            visibleCategories.map((category) => (
              <div key={category.id} className="dashboard-panel mb-4 overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FBF1D8] text-[#806116]">
                      <CategoryIcon categoryId={category.id} className="h-4 w-4" />
                    </span>
                    <h3 className="truncate text-base font-extrabold text-stone-800">{categoryName(category, lang)}</h3>
                    <span className="shrink-0 rounded-full bg-cream-100 px-2 py-0.5 text-[11px] font-bold text-stone-500">
                      {category.items.length} {t.menuPage.item}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToast(t.menuPage.addComingSoon)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    {t.menuPage.addItem}
                  </button>
                </div>

                <ul className="divide-y divide-line">
                  {category.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-200 to-[#E8C77A] text-xl" aria-hidden="true">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          categoryEmoji(category.id)
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-stone-800">{itemName(item, lang)}</p>
                        <p className="mt-0.5 text-xs font-semibold tabular-nums text-stone-500">
                          {formatOrderTotal(item.price, lang)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`hidden text-[11px] font-bold sm:block ${item.available ? 'text-mint-600' : 'text-stone-400'}`}>
                          {item.available ? t.menuPage.available : t.menuPage.unavailable}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.available}
                          aria-label={itemName(item, lang)}
                          onClick={() => void toggleAvailability(item)}
                          disabled={Boolean(pending[item.id])}
                          className={`relative h-7 w-12 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-60 ${item.available ? 'bg-mint-600' : 'bg-stone-300'}`}
                        >
                          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${item.available ? 'start-6' : 'start-1'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToast(t.menuPage.editComingSoon)}
                          aria-label={`${t.menuPage.edit} ${itemName(item, lang)}`}
                          title={t.menuPage.edit}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      </div>
    </div>
  )
}
