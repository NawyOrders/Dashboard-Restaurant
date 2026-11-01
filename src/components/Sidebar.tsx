import type { T } from '../i18n'
import type { SectionKey } from '../types'
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
  active: SectionKey
  isOpen: boolean
  brandName: string
  brandSub: string
  orderBadge: number
  unreadCount: number
  onToggleOpen: () => void
  onNavigate: (key: SectionKey) => void
  onOpenSettings: () => void
  onOpenNotifications?: () => void
}

function NavBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
        active ? 'bg-white/25 text-white' : 'bg-brand-100 text-brand-600'
      }`}
    >
      {count}
    </span>
  )
}

function OpenSwitch({
  t,
  isOpen,
  onToggle,
}: {
  t: T
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOpen}
      aria-label={t.actions.toggleOpen}
      title={t.actions.toggleOpen}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
        isOpen ? 'bg-mint-600' : 'bg-stone-300'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          isOpen ? 'start-6' : 'start-1'
        }`}
      />
    </button>
  )
}

export function Sidebar({
  t,
  active,
  isOpen,
  brandName,
  brandSub,
  orderBadge,
  onToggleOpen,
  onNavigate,
  onOpenSettings,
}: Props) {
  const items: { key: SectionKey; icon: typeof HomeIcon; badge: number }[] = [
    { key: 'orders', icon: ClipboardIcon, badge: orderBadge },
    { key: 'menu', icon: UtensilsIcon, badge: 11 },
    { key: 'reports', icon: ChartIcon, badge: 5 },
  ]

  const itemClass = (isActive: boolean) =>
    `flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${
      isActive
        ? 'bg-gradient-to-l from-brand-500 to-brand-600 text-white shadow-soft'
        : 'text-stone-500 hover:bg-cream-100 hover:text-stone-700'
    }`

  return (
    <aside className="sticky top-6 my-6 ms-6 hidden h-fit w-72 shrink-0 flex-col gap-2 rounded-4xl bg-white p-6 shadow-card lg:flex">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-soft">
          <span className="text-lg font-black leading-none text-white">كرم</span>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold leading-tight text-stone-800">{brandName}</h1>
          <p className="truncate text-xs text-stone-400">{brandSub}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-cream-50 px-4 py-3">
        <span className="text-sm font-bold text-stone-700">
          {isOpen ? t.nav.open : t.nav.closed}
        </span>
        <OpenSwitch t={t} isOpen={isOpen} onToggle={onToggleOpen} />
      </div>

      <nav className="flex flex-col gap-1.5" aria-label={t.nav.label}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-current={active === 'home' ? 'page' : undefined}
          title={`${t.nav.home}`}
          className={itemClass(active === 'home')}
        >
          <HomeIcon className="h-5 w-5" />
          <span className="flex-1 text-start">{t.nav.home}</span>
        </button>
        {items.map(({ key, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            aria-current={active === key ? 'page' : undefined}
            title={`${t.nav[key]}`}
            className={itemClass(active === key)}
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1 text-start">{t.nav[key]}</span>
            <NavBadge count={badge} active={active === key} />
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onOpenSettings}
          title={t.actions.settings}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-l from-gold-300 to-gold-400 px-4 py-3.5 font-bold text-stone-800 transition-colors hover:from-gold-400 hover:to-gold-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <GearIcon className="h-5 w-5" />
          <span className="flex-1 text-start">{t.nav.settings}</span>
        </button>
        <p className="mt-2 px-4 text-[11px] text-stone-400">{t.nav.settingsSub}</p>
      </div>
    </aside>
  )
}

export function BottomNav({ t, active, orderBadge, onNavigate, onOpenSettings }: Props) {
  const items: { key: SectionKey; icon: typeof HomeIcon; badge: number }[] = [
    { key: 'home', icon: HomeIcon, badge: 0 },
    { key: 'orders', icon: ClipboardIcon, badge: orderBadge },
    { key: 'menu', icon: UtensilsIcon, badge: 0 },
    { key: 'reports', icon: ChartIcon, badge: 0 },
  ]

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(160,31,19,0.08)] backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5">
        {items.map(({ key, icon: Icon, badge }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={isActive ? 'page' : undefined}
              title={`${t.nav[key]}`}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors focus:outline-none focus-visible:bg-cream-50 ${
                isActive ? 'text-brand-600' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white">
                    {badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate text-[10px] font-bold">{t.nav[key]}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-500" />}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenSettings}
          title={t.actions.settings}
          className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-stone-400 transition-colors hover:text-stone-600 focus:outline-none focus-visible:bg-cream-50"
        >
          <GearIcon className="h-5 w-5" />
          <span className="max-w-full truncate text-[10px] font-bold">{t.nav.settings}</span>
        </button>
      </div>
    </nav>
  )
}

export function MobileHeader({
  t,
  isOpen,
  brandName,
  brandSub,
  unreadCount,
  onToggleOpen,
  onOpenNotifications,
}: Props) {
  return (
    <header className="mx-4 mt-4 flex items-center gap-2.5 rounded-4xl bg-white px-3 py-2.5 shadow-card sm:mx-6 sm:mt-6 sm:gap-3 sm:px-4 sm:py-3 lg:hidden">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-soft sm:h-10 sm:w-10">
        <span className="text-[11px] font-black text-white sm:text-xs">كرم</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold leading-tight text-stone-800">{brandName}</p>
        <p className="truncate text-[10px] text-stone-400 sm:text-[11px]">{brandSub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden text-[11px] font-bold text-stone-600 min-[380px]:inline">
          {isOpen ? t.nav.open : t.nav.closed}
        </span>
        <OpenSwitch t={t} isOpen={isOpen} onToggle={onToggleOpen} />
      </div>
      <button
        type="button"
        onClick={onOpenNotifications}
        aria-label={t.actions.notifications}
        title={t.actions.notifications}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cream-200 bg-cream-50 text-stone-500 transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
