import { useNavigate } from 'react-router-dom'
import { canAny, PERMISSIONS, type PermissionKey } from '../authz'
import type { Lang } from '../i18n'
import { PageHeading } from '../components/PageHeading'
import { ChevronLeftIcon, ChevronRightIcon, ReceiptIcon } from '../icons'
import { manageCopy } from '../manage/text'

export type ManageModule = {
  path: string
  title: (lang: Lang) => string
  subtitle: (lang: Lang) => string
  permissions: PermissionKey[]
}

// Each management PR adds its module here and a route in App.tsx.
export const MANAGE_MODULES: ManageModule[] = [
  {
    path: '/manage/offers',
    title: (lang) => manageCopy[lang].offers.title,
    subtitle: (lang) => manageCopy[lang].offers.subtitle,
    permissions: [PERMISSIONS.offersView, PERMISSIONS.offersManage],
  },
]

export default function ManagePage({ lang, dir, permissions }: { lang: Lang; dir: 'rtl' | 'ltr'; permissions: readonly string[] }) {
  const c = manageCopy[lang]
  const navigate = useNavigate()
  const Chevron = dir === 'rtl' ? ChevronLeftIcon : ChevronRightIcon
  const visible = MANAGE_MODULES.filter((module) => canAny(permissions, ...module.permissions))
  return (
    <div>
      <PageHeading title={c.hubTitle} subtitle={c.hubSubtitle} />
      {visible.length === 0 && <p className="dashboard-panel p-6 text-center text-sm font-semibold text-stone-500">{c.noAccess}</p>}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((module) => (
          <li key={module.path}>
            <button
              type="button"
              onClick={() => navigate(module.path)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-start shadow-card transition-colors hover:border-gold-300 hover:bg-cream-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><ReceiptIcon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-stone-800">{module.title(lang)}</span>
                <span className="mt-0.5 block text-xs text-stone-500">{module.subtitle(lang)}</span>
              </span>
              <Chevron className="h-4 w-4 shrink-0 text-stone-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
