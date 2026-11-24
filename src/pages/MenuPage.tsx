import { useEffect, useState } from 'react'
import type { Api } from '../api'
import type { MenuCategory, MenuItem } from '../api/types'
import type { Lang, T } from '../i18n'
import { formatOrderTotal } from '../orders'
import { PageHeading } from '../components/PageHeading'
import {
  BowlIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CupIcon,
  FlameIcon,
  PlusIcon,
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
  const [selected, setSelected] = useState<string | null>(null)
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

  const activeId = selected ?? categories?.[0]?.id ?? null
  const activeCategory = categories?.find((category) => category.id === activeId) ?? categories?.[0] ?? null
  const Chevron = t.dir === 'rtl' ? ChevronLeftIcon : ChevronRightIcon

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
              className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <UtensilsIcon className="h-4 w-4" />
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {categories?.map((category) => {
              const isActive = activeId === category.id
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(category.id)}
                    aria-pressed={isActive}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${
                      isActive
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : 'border-line bg-white text-stone-700 hover:border-gold-300 hover:bg-cream-50'
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isActive ? 'bg-white/15 text-white' : 'bg-[#FBF1D8] text-[#806116]'}`}>
                      <CategoryIcon categoryId={category.id} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{categoryName(category, lang)}</span>
                      <span className={`mt-0.5 block text-[11px] font-semibold ${isActive ? 'text-white/80' : 'text-stone-500'}`}>
                        {category.count} {t.menuPage.item}
                      </span>
                    </span>
                    <Chevron className={`h-4 w-4 shrink-0 ${isActive ? 'text-white/80' : 'text-stone-400'}`} />
                  </button>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => onToast(t.menuPage.addComingSoon)}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t.menuPage.addCategory}
          </button>
        </aside>

        <section className="min-w-0">
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

          {state === 'ready' && activeCategory && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {activeCategory.items.map((item) => (
                <li key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  <div className="relative aspect-[4/3] bg-[#FBF1D8]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-4xl opacity-50" aria-hidden="true">
                        {categoryEmoji(activeCategory.id)}
                      </span>
                    )}
                    {!item.available && (
                      <span className="absolute start-3 top-3 rounded-full bg-stone-600/90 px-2.5 py-1 text-[11px] font-bold text-white">
                        {t.menuPage.unavailable}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="break-words text-sm font-extrabold leading-6 text-stone-800">{itemName(item, lang)}</h3>
                    <p className="mt-1 text-sm font-extrabold tabular-nums text-brand-600">{formatOrderTotal(item.price, lang)}</p>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className={`text-[11px] font-bold ${item.available ? 'text-mint-600' : 'text-stone-400'}`}>
                        {item.available ? t.menuPage.available : t.menuPage.unavailable}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.available}
                        aria-label={itemName(item, lang)}
                        onClick={() => void toggleAvailability(item)}
                        disabled={Boolean(pending[item.id])}
                        className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-60 ${item.available ? 'bg-[#D99A2B]' : 'bg-stone-300'}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${item.available ? 'start-6' : 'start-1'}`} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {state === 'ready' && activeCategory && activeCategory.items.length === 0 && (
            <p className="dashboard-panel p-6 text-center text-sm font-semibold text-stone-500">{t.menuPage.noItems}</p>
          )}
        </section>
      </div>
    </div>
  )
}
