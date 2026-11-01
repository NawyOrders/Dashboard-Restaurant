import type { T } from '../i18n'
import {
  BellIcon,
  ChartIcon,
  ClipboardIcon,
  GearIcon,
  HomeIcon,
  UtensilsIcon,
} from '../icons'

type Props = {
  t: T
}

function NavBadge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={`text-[11px] font-bold min-w-[20px] h-5 inline-flex items-center justify-center rounded-full px-1.5 ${
        active ? 'bg-white/25 text-white' : 'bg-brand-100 text-brand-600'
      }`}
    >
      {count}
    </span>
  )
}

export function Sidebar({ t }: Props) {
  const items = [
    { key: 'orders', icon: ClipboardIcon, badge: 12 },
    { key: 'menu', icon: UtensilsIcon, badge: 11 },
    { key: 'reports', icon: ChartIcon, badge: 5 },
  ] as const

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-white rounded-4xl shadow-card p-6 gap-2 my-6 ms-6 h-fit sticky top-6">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center shadow-soft shrink-0">
          <span className="text-white font-black text-lg leading-none">كرم</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-lg text-stone-800 leading-tight truncate">{t.brandName}</h1>
          <p className="text-xs text-stone-400">{t.brandSub}</p>
        </div>
      </div>

      {/* Open switch */}
      <div className="flex items-center justify-between bg-cream-50 rounded-2xl px-4 py-3 mb-4">
        <span className="text-sm font-bold text-stone-700">{t.nav.open}</span>
        <button
          aria-label={t.nav.open}
          className="w-12 h-7 rounded-full bg-mint-600 relative transition-colors cursor-default"
        >
          <span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow start-6 transition-all" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1.5">
        <a
          href="#"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-gradient-to-l from-brand-500 to-brand-600 text-white shadow-soft font-bold"
        >
          <HomeIcon className="w-5 h-5" />
          <span className="flex-1">{t.nav.home}</span>
        </a>
        {items.map(({ key, icon: Icon, badge }) => (
          <a
            key={key}
            href="#"
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-stone-500 hover:bg-cream-100 hover:text-stone-700 font-semibold transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="flex-1">{t.nav[key]}</span>
            <NavBadge count={badge} />
          </a>
        ))}
      </nav>

      {/* Settings */}
      <div className="mt-auto pt-4">
        <a
          href="#"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-gradient-to-l from-gold-300 to-gold-400 text-stone-800 font-bold hover:from-gold-400 hover:to-gold-500 transition-colors"
        >
          <GearIcon className="w-5 h-5" />
          <span className="flex-1">{t.nav.settings}</span>
        </a>
        <p className="text-[11px] text-stone-400 mt-2 px-4">{t.nav.settingsSub}</p>
      </div>
    </aside>
  )
}

export function BottomNav({ t }: Props) {
  const items = [
    { key: 'home', icon: HomeIcon, active: true, badge: 0 },
    { key: 'orders', icon: ClipboardIcon, active: false, badge: 12 },
    { key: 'menu', icon: UtensilsIcon, active: false, badge: 0 },
    { key: 'reports', icon: ChartIcon, active: false, badge: 0 },
    { key: 'settings', icon: GearIcon, active: false, badge: 0 },
  ] as const

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-cream-200 shadow-[0_-4px_20px_rgba(160,31,19,0.08)]">
      <div className="grid grid-cols-5">
        {items.map(({ key, icon: Icon, active, badge }) => (
          <a key={key} href="#" className="flex flex-col items-center py-2.5">
            <span
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-bold ${
                active
                  ? 'bg-gradient-to-l from-brand-500 to-brand-600 text-white shadow-soft'
                  : 'text-stone-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {t.nav[key]}
              {badge > 0 && (
                <span className="text-[9px] font-black min-w-[16px] h-4 inline-flex items-center justify-center rounded-full px-1 bg-brand-500 text-white">
                  {badge}
                </span>
              )}
            </span>
          </a>
        ))}
      </div>
    </nav>
  )
}

export function MobileHeader({ t }: Props) {
  return (
    <div className="lg:hidden bg-white rounded-4xl shadow-card px-4 py-3 mx-6 mt-6 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shrink-0">
        <div className="w-full h-full rounded-full bg-gold-300 grid place-items-center overflow-hidden">
          <span className="text-brand-700 font-black">م</span>
        </div>
      </div>
      <button
        aria-label={t.notif}
        className="w-10 h-10 rounded-xl bg-cream-50 border border-cream-200 grid place-items-center text-stone-500 relative shrink-0"
      >
        <BellIcon className="w-5 h-5" />
        <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-brand-500" />
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <button
          aria-label={t.nav.open}
          className="w-10 h-6 rounded-full bg-mint-600 relative cursor-default"
        >
          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow start-4 transition-all" />
        </button>
        <span className="text-xs font-bold text-stone-600">{t.nav.open}</span>
      </div>
      <div className="flex-1" />
      <div className="text-end">
        <p className="font-extrabold text-stone-800 leading-tight">{t.brandName}</p>
        <p className="text-[11px] text-stone-400">{t.brandSub}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center shrink-0 shadow-soft">
        <span className="text-white font-black text-xs">كرم</span>
      </div>
    </div>
  )
}
