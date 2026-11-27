import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PERMISSIONS, canAny } from './authz'
import { MenuSectionTabs, MENU_SECTION_PATHS } from './components/MenuSectionTabs'
import { SettingsAdminLinks, SETTINGS_ADMIN_PATHS } from './components/SettingsAdminLinks'
import { MANAGE_MODULES } from './manage/modules'
import ManagePage from './pages/ManagePage'

afterEach(cleanup)

const ALL = Object.values(PERMISSIONS) as string[]

// Every permission any module looks at, so the matrix covers real gates.
const RELEVANT = [...new Set(MANAGE_MODULES.flatMap((m) => m.permissions))] as string[]

function subsets<T>(items: T[]): T[][] {
  return items.reduce<T[][]>((acc, item) => acc.concat(acc.map((s) => [...s, item])), [[]])
}

function moduleFor(path: string) {
  const found = MANAGE_MODULES.find((m) => m.path === path)
  if (!found) throw new Error(`missing module ${path}`)
  return found
}

describe('permission matrix: a link is visible exactly when the user holds one of its permissions', () => {
  const groups = SETTINGS_ADMIN_PATHS.flatMap((p) => moduleFor(p).permissions)
  const combos = subsets([...new Set(groups)] as string[])

  it.each(combos.map((c) => [c.join(',') || '(none)', c] as const))('settings links for [%s]', (_label, permissions) => {
    const { container } = render(<SettingsAdminLinks lang="en" dir="ltr" permissions={permissions} onNavigate={vi.fn()} />)
    const expected = SETTINGS_ADMIN_PATHS.filter((p) => canAny(permissions, ...moduleFor(p).permissions))
    expect(container.querySelectorAll('li')).toHaveLength(expected.length)
    for (const path of SETTINGS_ADMIN_PATHS) {
      const title = moduleFor(path).title('en')
      const shown = screen.queryByRole('button', { name: new RegExp(title) }) !== null
      expect(shown).toBe(expected.includes(path))
    }
    cleanup()
  })

  const menuPerms = [...new Set(MENU_SECTION_PATHS.flatMap((p) => moduleFor(p).permissions))] as string[]
  it.each(subsets(menuPerms).map((c) => [c.join(',') || '(none)', c] as const))('menu tabs for [%s]', (_label, permissions) => {
    const { container } = render(<MenuSectionTabs lang="en" permissions={permissions} currentPath="/manage/categories" onNavigate={vi.fn()} label="Menu" />)
    const allowed = MENU_SECTION_PATHS.filter((p) => canAny(permissions, ...moduleFor(p).permissions))
    // One tab alone is not a tab bar, so it is hidden.
    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(allowed.length < 2 ? 0 : allowed.length)
    cleanup()
  })

  it('management hub shows one card per module the user holds, for every single permission', () => {
    for (const permission of RELEVANT) {
      const expected = MANAGE_MODULES.filter((m) => canAny([permission], ...m.permissions)).length
      const { unmount } = render(
        <MemoryRouter>
          <ManagePage lang="en" dir="ltr" permissions={[permission]} />
        </MemoryRouter>,
      )
      expect(screen.queryAllByRole('button')).toHaveLength(expected)
      unmount()
    }
  })
})

describe('permission input edge cases', () => {
  it('treats null, undefined and empty lists as no access', () => {
    for (const value of [null, undefined, [] as string[]]) {
      expect(canAny(value, PERMISSIONS.branchesView)).toBe(false)
    }
  })

  it('ignores unknown, empty and differently-cased permission strings', () => {
    const odd = ['', ' ', 'branches.view', PERMISSIONS.branchesView.toUpperCase(), 'Branches.View ', '*', 'admin']
    const { container } = render(<SettingsAdminLinks lang="en" dir="ltr" permissions={odd} onNavigate={vi.fn()} />)
    const exact = odd.includes(PERMISSIONS.branchesView)
    expect(container.querySelectorAll('li')).toHaveLength(exact ? 1 : 0)
  })

  it('does not change the permission list it is given', () => {
    const permissions = Object.freeze([...ALL]) as readonly string[]
    expect(() => render(<SettingsAdminLinks lang="en" dir="ltr" permissions={permissions} onNavigate={vi.fn()} />)).not.toThrow()
    expect(permissions).toEqual(ALL)
  })

  it('handles duplicated permissions without duplicating links', () => {
    const doubled = [...ALL, ...ALL]
    const { container } = render(<SettingsAdminLinks lang="en" dir="ltr" permissions={doubled} onNavigate={vi.fn()} />)
    expect(container.querySelectorAll('li')).toHaveLength(SETTINGS_ADMIN_PATHS.length)
  })

  it('renders both languages and directions for every permitted link with non-empty text', () => {
    for (const [lang, dir] of [['en', 'ltr'], ['ar', 'rtl']] as const) {
      const { container, unmount } = render(<SettingsAdminLinks lang={lang} dir={dir} permissions={ALL} onNavigate={vi.fn()} />)
      for (const button of container.querySelectorAll('button')) {
        expect((button.textContent ?? '').trim().length).toBeGreaterThan(0)
      }
      unmount()
    }
  })

  it('module list has unique paths and every module requires at least one permission', () => {
    const paths = MANAGE_MODULES.map((m) => m.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const m of MANAGE_MODULES) expect(m.permissions.length).toBeGreaterThan(0)
  })

  it('every settings and menu path is a real management module', () => {
    for (const path of [...SETTINGS_ADMIN_PATHS, ...MENU_SECTION_PATHS]) expect(MANAGE_MODULES.some((m) => m.path === path)).toBe(true)
  })

  it('settings links and menu tabs do not overlap', () => {
    const overlap = SETTINGS_ADMIN_PATHS.filter((p) => (MENU_SECTION_PATHS as readonly string[]).includes(p))
    expect(overlap).toEqual([])
  })
})
