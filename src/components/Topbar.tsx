import type { T } from '../i18n'
import { BellIcon, CalendarIcon, SearchIcon } from '../icons'

type Props = {
  t: T
  onToggleLang: () => void
}

export function Topbar({ t, onToggleLang }: Props) {
  return (
    <header className="bg-white rounded-4xl shadow-card px-4 sm:px-6 py-4 mt-6 me-6 ms-6 lg:ms-0">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shrink-0">
          <div className="w-full h-full rounded-full bg-gold-300 grid place-items-center overflow-hidden">
            <span className="text-brand-700 font-black">م</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xl hidden sm:block">
          <SearchIcon className="w-[18px] h-[18px] absolute top-1/2 -translate-y-1/2 start-4 text-stone-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full bg-cream-50 border border-cream-200 rounded-2xl ps-11 pe-4 py-2.5 text-sm text-stone-600 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        {/* Date */}
        <div className="hidden md:flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-600 whitespace-nowrap">
          <CalendarIcon className="w-4 h-4 text-stone-400" />
          {t.today}
        </div>

        {/* Notification */}
        <button
          aria-label={t.notif}
          className="w-11 h-11 rounded-2xl bg-cream-50 border border-cream-200 grid place-items-center text-stone-500 hover:bg-cream-100 transition-colors relative shrink-0"
        >
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-2.5 end-2.5 w-2 h-2 rounded-full bg-brand-500" />
        </button>

        <div className="flex-1" />

        {/* Greeting */}
        <div className="hidden md:block text-end">
          <h2 className="font-extrabold text-stone-800 leading-tight">{t.greeting}</h2>
          <p className="text-xs text-mint-600 font-semibold">{t.greetingSub}</p>
        </div>

        {/* Lang toggle */}
        <button
          onClick={onToggleLang}
          className="px-3.5 py-2 rounded-xl bg-cream-100 text-stone-600 text-xs font-bold hover:bg-cream-200 transition-colors whitespace-nowrap shrink-0"
        >
          {t.nav.langToggle}
        </button>
      </div>

      {/* Mobile search */}
      <div className="relative sm:hidden mt-3">
        <SearchIcon className="w-[18px] h-[18px] absolute top-1/2 -translate-y-1/2 start-4 text-stone-400" />
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          className="w-full bg-cream-50 border border-cream-200 rounded-2xl ps-11 pe-4 py-2.5 text-sm text-stone-600 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {/* Mobile date */}
      <div className="sm:hidden mt-3 w-fit flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-stone-600">
        <CalendarIcon className="w-4 h-4 text-stone-400" />
        {t.today}
      </div>
    </header>
  )
}
