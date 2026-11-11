import { expect, test, type Page } from '@playwright/test'
import { staffLoginResponse } from '../src/test/fixtures'
import { translations, type Lang } from '../src/i18n'

async function signIn(page: Page, lang: Lang) {
  await page.route('**/api/v1/auth/**', async (route) => {
    if (route.request().url().endsWith('/login')) {
      expect(route.request().postDataJSON()).toEqual({ email: 'owner@example.test', password: 'fixture-only' })
      await route.fulfill({ json: staffLoginResponse('Owner') })
    } else {
      await route.fulfill({ json: { isSuccess: true } })
    }
  })
  await page.goto('/')
  if (lang === 'en') await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: translations[lang].auth.submit, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: translations[lang].dashboard.overview })).toBeVisible()
}

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`dashboard layout ${lang} ${width}px`, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.setViewportSize({ width, height: 1000 })
      await signIn(page, lang)
      const t = translations[lang]
      await expect(page.locator('html')).toHaveAttribute('dir', t.dir)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      for (const name of [t.chart.title, t.topItems.title, t.orders.title]) {
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
      }
      await expect(page.getByText(t.auth.previewTitle, { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await expect(page.getByRole('navigation')).toHaveCount(1)
      await expect(page.getByRole('button', { name: t.logout, exact: true })).toBeVisible()
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: testInfo.outputPath(`dashboard-${lang}-${width}.png`), fullPage: true })
      }
      expect(errors).toEqual([])
    })
  }
}

for (const width of [390, 1440]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`dashboard interactions ${lang} ${width}px`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      await signIn(page, lang)
      const t = translations[lang]
      const dialog = page.getByRole('dialog')
      const isOpen = page.getByRole('switch', { name: t.actions.toggleOpen })
      await isOpen.click()
      await expect(isOpen).toHaveAttribute('aria-checked', 'false')
      await isOpen.click()
      await expect(isOpen).toHaveAttribute('aria-checked', 'true')

      await page.getByRole('button', { name: t.chart.month, exact: true }).click()
      await expect(page.getByText(t.chart.monthSubtitle, { exact: true })).toBeVisible()
      const points = page.getByRole('button', { name: new RegExp(`^${t.chart.pointLabel} `) })
      await expect(points).toHaveCount(4)
      await points.nth(2).focus()
      await points.nth(2).press('Enter')
      await expect(points.nth(2)).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: t.chart.week, exact: true }).click()
      await expect(points).toHaveCount(7)

      const search = page.getByRole('searchbox', { name: t.searchPlaceholder })
      await search.fill('no-such-customer')
      await search.press('Enter')
      await expect(page.getByText(t.search.empty, { exact: true })).toBeVisible()
      await page.getByRole('button', { name: t.actions.clearSearch, exact: true }).click()
      await search.fill('ORD-2841')
      await page.locator('#orders').getByRole('button', { name: /ORD-2841/ }).click()
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: t.orderDetails.startPreparing, exact: true }).click()
      await dialog.getByRole('button', { name: t.orderDetails.markDone, exact: true }).click()
      await expect(dialog.getByRole('button', { name: t.orderDetails.markDone, exact: true })).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page.getByRole('region', { name: t.dashboard.queue }).locator('dd')).toHaveText(['0', '1', '6'])
      await page.getByRole('button', { name: t.actions.clearSearch, exact: true }).click()

      await page.getByRole('button', { name: `${t.stats.salesToday} — ${t.actions.viewDetails}`, exact: true }).click()
      await expect(dialog.getByRole('heading', { name: t.stats.salesToday, exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await page.locator('#orders').getByRole('button', { name: t.orders.viewAll, exact: true }).click()
      await dialog.getByRole('button', { name: t.orders.status.done, exact: true }).click()
      await expect(dialog.getByRole('button', { name: t.orders.status.done, exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(dialog.getByText(`6 ${t.ordersDialog.results}`, { exact: true })).toBeVisible()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: `${t.actions.viewDetails} — ${t.topItems.title}`, exact: true }).click()
      await dialog.getByRole('button', { name: t.topItemsDialog.sortByName, exact: true }).click()
      await expect(dialog.getByRole('button', { name: t.topItemsDialog.sortByName, exact: true })).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: new RegExp(`^${t.calendar.title}:`) }).click()
      await dialog.getByRole('button', { name: t.calendar.nextMonth, exact: true }).click()
      await dialog.getByRole('button', { name: t.calendar.previousMonth, exact: true }).click()
      await dialog.locator('button[aria-pressed="false"]').nth(15).click()
      await expect(dialog).toHaveCount(0)

      await page.getByRole('button', { name: t.actions.notifications, exact: true }).click()
      await dialog.getByRole('button', { name: t.actions.markAllRead, exact: true }).click()
      await expect(dialog.getByRole('button', { name: t.actions.markAllRead, exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: t.nav.settings, exact: true }).click()
      const restaurantName = 'Restaurant'.repeat(6)
      await dialog.getByLabel(t.settings.restaurantName, { exact: true }).fill(restaurantName)
      await dialog.getByRole('button', { name: t.settings.save, exact: true }).click()
      await expect(dialog).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.getByRole('button', { name: t.actions.help, exact: true }).click()
      await expect(dialog.getByRole('heading', { name: t.guide.title, exact: true })).toBeVisible()
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: t.nav.langToggle, exact: true }).click()
      const other = translations[lang === 'ar' ? 'en' : 'ar']
      await expect(page.locator('html')).toHaveAttribute('dir', other.dir)
      await expect(page.getByRole('heading', { name: other.dashboard.overview, exact: true })).toBeVisible()
      await page.getByRole('button', { name: other.logout, exact: true }).click()
      await expect(page.getByLabel(other.auth.password, { exact: true })).toHaveValue('')
      await expect(page.getByRole('button', { name: other.roles.owner, exact: true })).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
}
