import { useEffect } from 'react'
import type { T } from '../i18n'
import type { SectionKey } from '../types'
import {
  BellIcon,
  ChartIcon,
  ClipboardIcon,
  DotsIcon,
  BowlIcon,
  GearIcon,
  HomeIcon,
  StarIcon,
  UsersIcon,
  UtensilsIcon,
} from '../icons'
import { BrandLogo } from './BrandLogo'

type Props = {
  t: T
  active: SectionKey
  isOpen: boolean
  brandName: string
  brandLogoUrl?: string | null
  brandSub: string
  orderBadge: number
  unreadCount: number
  onToggleOpen: () => void
  onNavigate: (key: SectionKey) => void
  onOpenNotifications?: () => void
  quickLinks?: ReadonlyArray<QuickLink>
  quickLinksLabel?: string
  currentPath?: string
  onNavigatePath?: (path: string) => void
}

export type QuickLink = { path: string; label: string; alsoActiveOn?: readonly string[] }

const QUICK_LINK_ICONS: Record<string, typeof HomeIcon> = {
  '/manage/menu-items': BowlIcon,
  '/manage/offers': StarIcon,
  '/manage/staff': UsersIcon,
}

const NAV_ITEMS: { key: SectionKey; icon: typeof HomeIcon }[] = [
  { key: 'home', icon: HomeIcon },
  { key: 'orders', icon: ClipboardIcon },
  { key: 'menu', icon: UtensilsIcon },
  { key: 'reports', icon: ChartIcon },
]

function NavBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={`inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
        active ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'
      }`}
    >
      {count}
    </span>
  )
}

function OpenSwitch({ t, isOpen, onToggle }: { t: T; isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOpen}
      aria-label={t.actions.toggleOpen}
      title={t.actions.toggleOpen}
      onClick={onToggle}
      className="grid h-10 w-14 shrink-0 place-items-center rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className={`relative block h-6 w-11 rounded-full transition-colors motion-reduce:transition-none ${
          isOpen ? 'bg-mint-600' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all motion-reduce:transition-none ${
            isOpen ? 'start-6' : 'start-1'
          }`}
        />
      </span>
    </button>
  )
}

function SidebarBody({
  t,
  active,
  isOpen,
  brandName,
  brandLogoUrl,
  brandSub,
  orderBadge,
  onToggleOpen,
  onNavigate,
  onClose,
  quickLinks = [],
  quickLinksLabel,
  currentPath = '',
  onNavigatePath,
}: Props & { onClose?: () => void }) {
  const activeQuickPath = quickLinks.find((link) => [link.path, ...(link.alsoActiveOn ?? [])].some((path) => currentPath === path || currentPath.startsWith(`${path}/`)))?.path
  const settingsActive = active === 'settings' && !activeQuickPath
  const itemClass = (isActive: boolean) =>
    `flex min-h-12 w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
      isActive ? 'bg-brand-600 text-white shadow-card' : 'text-stone-600 hover:bg-cream-50 hover:text-brand-700'
    }`

  return (
    <>
      <div className="flex items-center gap-3">
        <BrandLogo name={brandName} logoUrl={brandLogoUrl} />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold leading-tight text-stone-800" title={brandName}>{brandName}</p>
          <p className="mt-0.5 truncate text-xs text-stone-500" title={brandSub}>{brandSub}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream-50/70 px-4 py-3">
        <span className="text-sm font-bold text-stone-700">{isOpen ? t.nav.open : t.nav.closed}</span>
        <OpenSwitch t={t} isOpen={isOpen} onToggle={onToggleOpen} />
      </div>

      <nav className="flex flex-col gap-2" aria-label={t.nav.label}>
        {NAV_ITEMS.map(({ key, icon: Icon }) => {
          const isActive = active === key
          const badge = key === 'orders' ? orderBadge : undefined
          return (
            <button
              key={key}
              type="button"
              onClick={() => { onNavigate(key); onClose?.() }}
              aria-current={isActive ? 'page' : undefined}
              title={t.nav[key]}
              className={itemClass(isActive)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 break-words text-start">{t.nav[key]}</span>
              {badge !== undefined && <NavBadge count={badge} active={isActive} />}
            </button>
          )
        })}
      </nav>

      {quickLinks.length > 0 && onNavigatePath && (
        <nav className="flex flex-col gap-2" aria-label={quickLinksLabel}>
          <p className="px-4 text-xs font-bold text-stone-500">{quickLinksLabel}</p>
          {quickLinks.map((link) => {
            const Icon = QUICK_LINK_ICONS[link.path] ?? GearIcon
            const isActive = activeQuickPath === link.path
            return (
              <button
                key={link.path}
                type="button"
                onClick={() => { onNavigatePath(link.path); onClose?.() }}
                aria-current={isActive ? 'page' : undefined}
                title={link.label}
                className={itemClass(isActive)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 break-words text-start">{link.label}</span>
              </button>
            )
          })}
        </nav>
      )}

      <button
        type="button"
        onClick={() => { onNavigate('settings'); onClose?.() }}
        aria-current={settingsActive ? 'page' : undefined}
        title={t.nav.settings}
        className={`mt-auto flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
          settingsActive
            ? 'border-brand-600 bg-brand-600 text-white shadow-card hover:bg-brand-700'
            : 'border-gold-300/60 bg-[#FBF1D8]/70 hover:bg-[#FBF1D8]'
        }`}
      >
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${settingsActive ? 'bg-white/15 text-white' : 'bg-gold-400/30 text-[#806116]'}`}>
          <GearIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-extrabold ${settingsActive ? 'text-white' : 'text-stone-800'}`}>{t.nav.settings}</span>
          <span className={`mt-0.5 block text-xs ${settingsActive ? 'text-white/80' : 'text-stone-500'}`}>{t.nav.settingsSub}</span>
        </span>
      </button>
    </>
  )
}

export function Sidebar(props: Props) {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[260px] shrink-0 flex-col gap-5 overflow-y-auto border-e border-line bg-white p-5 lg:flex">
      <SidebarBody {...props} />
    </aside>
  )
}

export function MobileDrawer({ open, onClose, ...props }: Props & { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label={props.t.actions.close}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink-900/50 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={props.t.nav.label}
        className="absolute inset-y-0 start-0 flex w-[280px] max-w-[85vw] animate-drawer-in flex-col gap-5 overflow-y-auto rounded-e-3xl border-e border-line bg-white p-4 shadow-soft motion-reduce:animate-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={props.t.actions.menu}
          aria-expanded="true"
          title={props.t.actions.menu}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-cream-50 text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <DotsIcon className="h-5 w-5" />
        </button>
        <SidebarBody {...props} onClose={onClose} />
      </aside>
    </div>
  )
}

export function MobileHeader({
  t,
  isOpen,
  brandName,
  brandLogoUrl,
  brandSub,
  unreadCount,
  onToggleOpen,
  onOpenNotifications,
  onOpenMenu,
  menuOpen,
}: Props & { onOpenMenu: () => void; menuOpen: boolean }) {
  return (
    <header className="mb-4 flex min-w-0 items-center gap-2 rounded-2xl border border-line bg-white p-3 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t.actions.menu}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        title={t.actions.menu}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-stone-600 transition-colors hover:bg-cream-50 hover:text-brand-700 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <DotsIcon className="h-5 w-5" />
      </button>
      <BrandLogo size="sm" name={brandName} logoUrl={brandLogoUrl} />
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
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-stone-600 transition-colors hover:bg-cream-50 hover:text-brand-700 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -top-1 -end-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />}
      </button>
    </header>
  )
}
