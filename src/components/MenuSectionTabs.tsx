import { canAny } from '../authz'
import type { Lang } from '../i18n'
import { MANAGE_MODULES } from '../manage/modules'

// The three pages that make up menu management. They share one tab bar so
// Categories and Add-ons are reached from inside Menu items.
export const MENU_SECTION_PATHS = ['/manage/menu-items', '/manage/categories', '/manage/addons'] as const

type Props = {
  lang: Lang
  permissions: readonly string[]
  currentPath: string
  onNavigate: (path: string) => void
  label: string
}

export function MenuSectionTabs({ lang, permissions, currentPath, onNavigate, label }: Props) {
  const tabs = MENU_SECTION_PATHS.flatMap((path) => {
    const module = MANAGE_MODULES.find((item) => item.path === path)
    return module && canAny(permissions, ...module.permissions) ? [{ path, title: module.title(lang) }] : []
  })
  if (tabs.length < 2) return null
  return (
    <nav aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = currentPath === tab.path
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => onNavigate(tab.path)}
            aria-current={isActive ? 'page' : undefined}
            className={`min-h-11 rounded-full px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
              isActive ? 'bg-brand-600 text-white shadow-card' : 'border border-line bg-white text-stone-600 hover:bg-cream-50 hover:text-brand-700'
            }`}
          >
            {tab.title}
          </button>
        )
      })}
    </nav>
  )
}
