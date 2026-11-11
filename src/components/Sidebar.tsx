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
      className={`inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
        active ? 'bg-[#A01F13]/10 text-[#A01F13]' : 'bg-white/15 text-white'
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
      className="grid h-11 w-14 shrink-0 place-items-center rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A01F13] focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className={`relative block h-7 w-12 rounded-full transition-colors motion-reduce:transition-none ${
          isOpen ? 'bg-mint-600' : 'bg-stone-400'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all motion-reduce:transition-none ${
            isOpen ? 'start-6' : 'start-1'
          }`}
        />
      </span>
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
  const items: { key: SectionKey; icon: typeof HomeIcon; badge?: number }[] = [
    { key: 'orders', icon: ClipboardIcon, badge: orderBadge },
    { key: 'menu', icon: UtensilsIcon },
    { key: 'reports', icon: ChartIcon },
  ]

  const itemClass = (isActive: boolean) =>
    `relative flex min-h-12 w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BF78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#A01F13] ${
      isActive
        ? 'bg-white text-[#A01F13] shadow-sm'
        : 'text-[#FFF8EF] hover:bg-white/10'
    }`

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[240px] shrink-0 flex-col gap-6 overflow-y-auto bg-[#A01F13] p-5 text-[#FFF8EF] lg:flex [&_button:focus-visible]:outline-gold-300">
      <div className="flex shrink-0 items-center gap-3">
        <div aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#E6BF78]/40 text-[#E6BF78]">
          <UtensilsIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold leading-tight text-white" title={brandName}>{brandName}</p>
          <p className="mt-1 truncate text-xs text-[#FFF8EF]/80" title={brandSub}>{brandSub}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-white/20 bg-black/10 p-3">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#FFF8EF]/70">
          <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-mint-400' : 'bg-stone-400'}`} aria-hidden="true" />
          {t.nav.statusLabel}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-white">{isOpen ? t.nav.open : t.nav.closed}</span>
          <OpenSwitch t={t} isOpen={isOpen} onToggle={onToggleOpen} />
        </div>
        <p className="text-[11px] leading-relaxed text-[#FFF8EF]/70">{isOpen ? t.greetingSub : t.greetingClosed}</p>
      </div>

      <nav className="flex flex-col gap-2" aria-label={t.nav.label}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-current={active === 'home' ? 'page' : undefined}
          title={`${t.nav.home}`}
          className={itemClass(active === 'home')}
        >
          {active === 'home' && <span aria-hidden="true" className="absolute inset-y-2 start-1 w-1 rounded-full bg-[#A01F13]" />}
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
            {active === key && <span aria-hidden="true" className="absolute inset-y-2 start-1 w-1 rounded-full bg-[#A01F13]" />}
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 break-words text-start">{t.nav[key]}</span>
            {badge !== undefined && <NavBadge count={badge} active={active === key} />}
          </button>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/20 pt-4">
        <button
          type="button"
          onClick={onOpenSettings}
          title={t.actions.settings}
          className={itemClass(false)}
        >
          <GearIcon className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 break-words text-start">{t.nav.settings}</span>
        </button>
        <p className="mt-1 px-4 text-xs leading-relaxed text-[#FFF8EF]/80">{t.nav.settingsSub}</p>
      </div>
    </aside>
  )
}

export function BottomNav({ t, active, orderBadge, onNavigate, onOpenSettings }: Props) {
  const items: { key: SectionKey; icon: typeof HomeIcon; badge?: number }[] = [
    { key: 'home', icon: HomeIcon },
    { key: 'orders', icon: ClipboardIcon, badge: orderBadge },
    { key: 'menu', icon: UtensilsIcon },
    { key: 'reports', icon: ChartIcon },
  ]
  const itemClass = (isActive: boolean) =>
    `flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A01F13] ${
      isActive ? 'bg-cream-50 text-[#A01F13]' : 'text-stone-600 hover:bg-cream-50 hover:text-[#A01F13]'
    }`

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E9E1D7] bg-white pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-1">
        {items.map(({ key, icon: Icon, badge }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={isActive ? 'page' : undefined}
              title={`${t.nav[key]}`}
              className={itemClass(isActive)}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A01F13] px-1 text-[10px] font-bold tabular-nums text-white">
                    {badge}
                  </span>
                )}
              </span>
              <span className="max-w-full break-words text-center text-xs font-bold leading-tight">{t.nav[key]}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenSettings}
          title={t.actions.settings}
          className={itemClass(false)}
        >
          <GearIcon className="h-5 w-5" />
          <span className="max-w-full break-words text-center text-xs font-bold leading-tight">{t.nav.settings}</span>
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
    <header className="mb-4 flex min-w-0 items-center gap-2 rounded-2xl border border-[#E9E1D7] bg-white p-3 lg:hidden">
      <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#A01F13] text-[#E6BF78]">
        <UtensilsIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold leading-tight text-stone-800" title={brandName}>{brandName}</p>
        <p className="mt-0.5 truncate text-xs text-stone-500" title={brandSub}>{brandSub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="hidden text-xs font-bold text-stone-600 min-[380px]:inline">
          {isOpen ? t.nav.open : t.nav.closed}
        </span>
        <OpenSwitch t={t} isOpen={isOpen} onToggle={onToggleOpen} />
      </div>
      <button
        type="button"
        onClick={onOpenNotifications}
        aria-label={t.actions.notifications}
        title={t.actions.notifications}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#E9E1D7] text-stone-600 transition-colors hover:bg-cream-50 hover:text-[#A01F13] motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A01F13]"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#A01F13] px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
