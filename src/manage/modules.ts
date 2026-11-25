import { PERMISSIONS, type PermissionKey } from '../authz'
import type { Lang } from '../i18n'
import { manageCopy } from './text'

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
  {
    path: '/manage/branches',
    title: (lang) => manageCopy[lang].branches.title,
    subtitle: (lang) => manageCopy[lang].branches.subtitle,
    permissions: [PERMISSIONS.branchesView, PERMISSIONS.branchesManage],
  },
  {
    path: '/manage/payments',
    title: (lang) => manageCopy[lang].payments.title,
    subtitle: (lang) => manageCopy[lang].payments.subtitle,
    permissions: [PERMISSIONS.restaurantSettingsView, PERMISSIONS.restaurantSettingsManage],
  },
  {
    path: '/manage/staff',
    title: (lang) => manageCopy[lang].staff.title,
    subtitle: (lang) => manageCopy[lang].staff.subtitle,
    permissions: [PERMISSIONS.staffView, PERMISSIONS.staffManage],
  },
  {
    path: '/manage/roles',
    title: (lang) => manageCopy[lang].roles.title,
    subtitle: (lang) => manageCopy[lang].roles.subtitle,
    permissions: [PERMISSIONS.staffManage],
  },
  {
    path: '/manage/categories',
    title: (lang) => manageCopy[lang].categories.title,
    subtitle: (lang) => manageCopy[lang].categories.subtitle,
    permissions: [PERMISSIONS.menuView, PERMISSIONS.menuEdit],
  },
]
