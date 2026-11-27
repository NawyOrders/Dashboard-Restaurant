import { canAny } from '../authz'
import type { Lang } from '../i18n'
import { ChevronLeftIcon, ChevronRightIcon, SlidersIcon, StoreIcon, WalletIcon } from '../icons'
import { MANAGE_MODULES } from '../manage/modules'

// Set-up pages that are changed rarely. They live under Settings instead of the sidebar.
export const SETTINGS_ADMIN_PATHS = ['/manage/branches', '/manage/payments', '/manage/roles'] as const

const ICONS: Record<string, typeof StoreIcon> = {
  '/manage/branches': StoreIcon,
  '/manage/payments': WalletIcon,
  '/manage/roles': SlidersIcon,
}

type Props = {
  lang: Lang
  dir: 'rtl' | 'ltr'
  permissions: readonly string[]
  onNavigate: (path: string) => void
}

export function SettingsAdminLinks({ lang, dir, permissions, onNavigate }: Props) {
  const Chevron = dir === 'rtl' ? ChevronLeftIcon : ChevronRightIcon
  const links = SETTINGS_ADMIN_PATHS.flatMap((path) => {
    const module = MANAGE_MODULES.find((item) => item.path === path)
    return module && canAny(permissions, ...module.permissions)
      ? [{ path, title: module.title(lang), subtitle: module.subtitle(lang) }]
      : []
  })
  if (links.length === 0) return null
  return (
    <ul className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {links.map((link) => {
        const Icon = ICONS[link.path] ?? StoreIcon
        return (
          <li key={link.path}>
            <button
              type="button"
              onClick={() => onNavigate(link.path)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-start shadow-card transition-colors hover:border-gold-300 hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-stone-800">{link.title}</span>
                <span className="mt-0.5 block text-xs text-stone-500">{link.subtitle}</span>
              </span>
              <Chevron className="h-4 w-4 shrink-0 text-stone-400" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
