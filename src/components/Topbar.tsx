import { useEffect, useRef } from 'react'
import type { T } from '../i18n'
import type { AuthUser } from '../auth'
import type { SectionKey } from '../types'
import { formatFullDate, toDateKey } from '../calendar'
import { numberLocale } from '../orders'
import { BellIcon, CalendarIcon, CloseIcon, LogoutIcon, SearchIcon } from '../icons'

type Props = {
  t: T
  user: AuthUser
  active: SectionKey
  isOpen: boolean
  brandName: string
  query: string
  unreadCount: number
  selectedDate: Date
  onQueryChange: (query: string) => void
  onSearchSubmit: () => void
  onToggleLang: () => void
  onLogout: () => void
  onOpenNotifications: () => void
}

export function Topbar({
  t,
  user,
  active,
  isOpen,
  brandName,
  query,
  unreadCount,
  selectedDate,
  onQueryChange,
  onSearchSubmit,
  onToggleLang,
  onLogout,
  onOpenNotifications,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const dateLabel = formatFullDate(selectedDate, numberLocale(t.dir === 'rtl' ? 'ar' : 'en'))
  const roleLabels: Record<string, string> = { Owner: t.roles.owner, BranchManager: t.roles.manager, Staff: t.roles.staff }
  const roleLabel = user.roles.map((role) => roleLabels[role] ?? role).join(', ') || t.auth.staffOnly
  const iconButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="dashboard-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="order-1 min-w-0 flex-1 lg:w-[290px] lg:flex-none">
          <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-500">
            <span className={`inline-flex h-2 w-2 rounded-full ${isOpen ? 'bg-mint-600' : 'bg-stone-400'}`} aria-hidden="true" />
            {isOpen ? t.greetingSub : t.greetingClosed}
          </p>
          {active === 'home' ? (
            <h1 className="text-xl font-extrabold leading-tight text-stone-800 sm:text-2xl">
              {brandName} <span aria-hidden="true">👋</span>
            </h1>
          ) : (
            <p className="text-xl font-extrabold leading-tight text-stone-800 sm:text-2xl">
              {brandName} <span aria-hidden="true">👋</span>
            </p>
          )}
        </div>

        <form
          role="search"
          className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            onSearchSubmit()
          }}
        >
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-500" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              aria-keyshortcuts="/"
              className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-cream-50 py-2.5 pe-12 ps-10 text-base text-stone-800 placeholder:text-sm placeholder:text-stone-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {!query && (
              <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-500 sm:block" title={t.search.shortcut}>
                /
              </kbd>
            )}
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label={t.actions.clearSearch}
                title={t.actions.clearSearch}
                className="absolute end-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-stone-500 hover:text-brand-600"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        <div className="order-2 flex shrink-0 items-center gap-1.5 sm:order-3">
          <time
            dateTime={toDateKey(selectedDate)}
            className="hidden min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-stone-600 min-[420px]:flex"
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-brand-600" />
            <span>{dateLabel}</span>
          </time>
          <button type="button" onClick={onOpenNotifications} aria-label={t.actions.notifications} title={t.actions.notifications} className={`${iconButton} relative`}>
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute -top-1 -end-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />}
          </button>
          <button type="button" onClick={onToggleLang} lang={t.dir === 'rtl' ? 'en' : 'ar'} dir="auto" className="hidden min-h-11 rounded-xl bg-cream-100 px-3 text-xs font-bold text-stone-700 transition-colors hover:bg-cream-200 sm:block">
            {t.nav.langToggle}
          </button>
          <button type="button" onClick={onLogout} aria-label={t.logout} title={t.logout} className={iconButton}>
            <LogoutIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold leading-tight text-stone-800"><bdi>{user.name}</bdi></p>
              <p className="truncate text-[11px] text-stone-500" title={roleLabel}><bdi>{roleLabel}</bdi></p>
            </div>
            <div aria-hidden="true" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-sm font-black text-brand-700 ring-2 ring-white">
              {user.name.trim().charAt(0)}
              <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-mint-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
