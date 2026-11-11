import { useEffect, useRef } from 'react'
import type { T } from '../i18n'
import type { AuthUser } from '../auth'
import { formatFullDate } from '../calendar'
import { BellIcon, CalendarIcon, CloseIcon, InfoIcon, LogoutIcon, SearchIcon } from '../icons'

type Props = {
  t: T
  user: AuthUser
  query: string
  unreadCount: number
  selectedDate: Date
  onQueryChange: (query: string) => void
  onSearchSubmit: () => void
  onToggleLang: () => void
  onLogout: () => void
  onOpenNotifications: () => void
  onOpenCalendar: () => void
  onOpenGuide: () => void
}

export function Topbar({
  t, user, query, unreadCount, selectedDate, onQueryChange, onSearchSubmit,
  onToggleLang, onLogout, onOpenNotifications, onOpenCalendar, onOpenGuide,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const dateLabel = formatFullDate(selectedDate, t.dir === 'rtl' ? 'ar-EG' : 'en-US')
  const roleLabels: Record<string, string> = { Owner: t.roles.owner, BranchManager: t.roles.manager, Staff: t.roles.staff }
  const roleLabel = user.roles.map((role) => roleLabels[role] ?? role).join(', ') || t.auth.staffOnly
  const iconButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#E9E1D7] bg-white text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E1D7] pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 max-[379px]:basis-full" title={`${user.email} — ${roleLabel}`}>
          <div aria-hidden="true" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream-100 font-bold text-brand-700">
            {user.name.trim().charAt(0)}
            <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#1E9E6A]" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold leading-snug text-stone-800"><bdi>{user.name}</bdi></p>
              <span className="max-w-full truncate rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700" title={roleLabel}>
                <bdi>{roleLabel}</bdi>
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-stone-500"><bdi>{user.email}</bdi></p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 max-[379px]:ms-auto">
          <button type="button" onClick={onOpenNotifications} aria-label={t.actions.notifications} title={t.actions.notifications} className={`${iconButton} relative hidden lg:grid`}>
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unreadCount}</span>}
          </button>
          <button type="button" onClick={onOpenGuide} aria-label={t.actions.help} title={t.actions.help} className={iconButton}>
            <InfoIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={onLogout} aria-label={t.logout} title={t.logout} className={iconButton}>
            <LogoutIcon className="h-5 w-5" />
          </button>
          <button type="button" onClick={onToggleLang} lang={t.dir === 'rtl' ? 'en' : 'ar'} dir="auto" className="min-h-11 rounded-xl bg-cream-100 px-3 text-xs font-bold text-stone-700 transition-colors hover:bg-cream-200">
            {t.nav.langToggle}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <form role="search" className="relative min-w-0 flex-1" onSubmit={(event) => { event.preventDefault(); onSearchSubmit() }}>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-500" />
          <input ref={searchRef} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} aria-keyshortcuts="/" className="min-h-11 w-full min-w-0 rounded-xl border border-[#E9E1D7] bg-cream-50 py-2.5 pe-12 ps-10 text-base text-stone-800 placeholder:text-sm placeholder:text-stone-500 [&::-webkit-search-cancel-button]:hidden" />
          {!query && (
            <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#E9E1D7] bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-500 sm:block" title={t.search.shortcut}>
              /
            </kbd>
          )}
          {query && <button type="button" onClick={() => onQueryChange('')} aria-label={t.actions.clearSearch} title={t.actions.clearSearch} className="absolute end-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-stone-500 hover:text-brand-600"><CloseIcon className="h-4 w-4" /></button>}
        </form>
        <button type="button" onClick={onOpenCalendar} aria-label={`${t.calendar.title}: ${dateLabel}`} aria-haspopup="dialog" title={t.calendar.title} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#E9E1D7] bg-white px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-cream-50 sm:shrink-0">
          <CalendarIcon className="h-4 w-4 shrink-0 text-brand-600" />
          <span>{dateLabel}</span>
        </button>
      </div>
    </header>
  )
}
