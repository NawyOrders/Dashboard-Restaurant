import type { T } from '../i18n'
import { formatFullDate } from '../calendar'
import { BellIcon, CalendarIcon, CloseIcon, InfoIcon, SearchIcon } from '../icons'

type Props = {
  t: T
  query: string
  unreadCount: number
  isOpen: boolean
  selectedDate: Date
  onQueryChange: (query: string) => void
  onSearchSubmit: () => void
  onToggleLang: () => void
  onOpenNotifications: () => void
  onOpenCalendar: () => void
  onOpenGuide: () => void
}

function SearchField({
  t,
  value,
  onChange,
  onSubmit,
  className = '',
}: {
  t: T
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  className?: string
}) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className={`relative min-w-0 ${className}`}
    >
      <SearchIcon className="absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t.searchPlaceholder}
        aria-label={t.searchPlaceholder}
        className="w-full rounded-2xl border border-cream-200 bg-cream-50 py-2.5 pe-11 ps-11 text-sm text-stone-600 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-200 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.actions.clearSearch}
          title={t.actions.clearSearch}
          className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-stone-400 transition-colors hover:bg-cream-200 hover:text-stone-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}

export function Topbar({
  t,
  query,
  unreadCount,
  isOpen,
  selectedDate,
  onQueryChange,
  onSearchSubmit,
  onToggleLang,
  onOpenNotifications,
  onOpenCalendar,
  onOpenGuide,
}: Props) {
  const dateLabel = formatFullDate(selectedDate, t.dir === 'rtl' ? 'ar-EG' : 'en-US')
  const dateButtonClass =
    'flex items-center gap-2 whitespace-nowrap rounded-2xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'

  return (
    <header className="mx-4 mt-3 rounded-4xl bg-white px-4 py-3 shadow-card sm:mx-6 sm:mt-4 sm:px-6 sm:py-4 lg:mt-6">
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-0.5">
          <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-gold-300">
            <span className="font-black text-brand-700">م</span>
          </div>
        </div>

        <SearchField
          t={t}
          value={query}
          onChange={onQueryChange}
          onSubmit={onSearchSubmit}
          className="hidden max-w-xl flex-1 sm:block"
        />

        <button
          type="button"
          onClick={onOpenCalendar}
          aria-label={`${t.calendar.title}: ${dateLabel}`}
          aria-haspopup="dialog"
          title={t.calendar.title}
          className={`hidden lg:flex ${dateButtonClass}`}
        >
          <CalendarIcon className="h-4 w-4 text-stone-400" />
          {dateLabel}
        </button>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={t.actions.notifications}
          title={t.actions.notifications}
          className="relative hidden h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cream-200 bg-cream-50 text-stone-500 transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 lg:grid"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -end-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="hidden flex-1 xl:block" />

        <div className="hidden text-end xl:block">
          <h2 className="font-extrabold leading-tight text-stone-800">{t.greeting}</h2>
          <p className="text-xs font-semibold text-mint-600">
            {isOpen ? t.greetingSub : t.greetingClosed}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label={t.actions.help}
            title={t.actions.help}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cream-200 bg-cream-50 text-stone-500 transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <InfoIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggleLang}
            title={t.nav.langToggle}
            className="min-h-[44px] whitespace-nowrap rounded-xl bg-cream-100 px-3.5 py-2 text-xs font-bold text-stone-600 transition-colors hover:bg-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {t.nav.langToggle}
          </button>
        </div>
      </div>

      <SearchField
        t={t}
        value={query}
        onChange={onQueryChange}
        onSubmit={onSearchSubmit}
        className="mt-3 sm:hidden"
      />

      <button
        type="button"
        onClick={onOpenCalendar}
        aria-label={`${t.calendar.title}: ${dateLabel}`}
        aria-haspopup="dialog"
        title={t.calendar.title}
        className={`mt-3 w-fit text-xs lg:hidden ${dateButtonClass}`}
      >
        <CalendarIcon className="h-4 w-4 text-stone-400" />
        {dateLabel}
      </button>
    </header>
  )
}
