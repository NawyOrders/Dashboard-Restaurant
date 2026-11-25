import { expect, test, type Page } from '@playwright/test'
import { staffLoginResponse } from '../src/test/fixtures'
import { translations, type Lang } from '../src/i18n'

async function signIn(page: Page, lang: Lang) {
  await page.route('**/api/v1/auth/**', async (route) => {
    if (route.request().url().endsWith('/login')) await route.fulfill({ json: staffLoginResponse('Owner') })
    else await route.fulfill({ json: { isSuccess: true } })
  })
  await page.goto('/')
  if (lang === 'en') await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: translations[lang].auth.submit, exact: true }).click()
}

const bottomBars = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('nav')].filter((el) => {
    const style = getComputedStyle(el)
    return style.position === 'fixed' && el.getBoundingClientRect().bottom >= innerHeight - 1
  }).length)

for (const width of [390, 768, 1023]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`menu button toggles the sidebar drawer ${lang} ${width}px`, async ({ page }) => {
      const t = translations[lang]
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, lang)
      const menu = page.getByRole('button', { name: t.actions.menu, exact: true })
      await expect(menu).toBeVisible()
      expect(await bottomBars(page)).toBe(0)
      await expect(page.getByRole('dialog')).toHaveCount(0)

      await menu.click()
      const drawer = page.getByRole('dialog', { name: t.nav.label })
      await expect(drawer).toBeVisible()
      await expect(drawer.getByRole('button', { name: t.nav.orders })).toBeVisible()
      await expect(drawer.getByRole('button', { name: t.nav.settings })).toBeVisible()

      await drawer.getByRole('button', { name: t.actions.menu, exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)

      await menu.click()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)

      await menu.click()
      await page.getByRole('dialog').getByRole('button', { name: t.nav.orders }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page).toHaveURL(/\/orders$/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

test('desktop keeps the fixed sidebar and has no menu button', async ({ page }) => {
  const t = translations.en
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page, 'en')
  await expect(page.getByRole('navigation', { name: t.nav.label })).toBeVisible()
  await expect(page.getByRole('button', { name: t.actions.menu, exact: true })).toBeHidden()
})
