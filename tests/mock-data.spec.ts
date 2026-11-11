import { expect, test, type Page } from '@playwright/test'
import { staffLoginResponse } from '../src/test/fixtures'
import { translations, type Lang } from '../src/i18n'

async function signIn(page: Page, path: string, lang: Lang) {
  await page.route('**/api/v1/auth/**', async (route) => {
    if (route.request().url().endsWith('/login')) {
      await route.fulfill({ json: staffLoginResponse('Owner') })
    } else {
      await route.fulfill({ json: { isSuccess: true } })
    }
  })
  await page.goto(path)
  if (lang === 'en') await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: translations[lang].auth.submit, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: translations[lang].dashboard.overview })).toBeVisible()
}

test('mock data mode loads orders from the local adapter', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, '/?mock=1', 'en')
  const t = translations.en

  await expect(page.getByText(t.auth.mockTitle, { exact: true })).toBeVisible()
  await expect(page.getByText(t.auth.previewTitle, { exact: true })).toHaveCount(0)
  await expect(page.getByText('#ORD-2841', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: t.orders.loading })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('mock error mode shows a retryable error state', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, '/?mockError=1', 'en')
  const t = translations.en

  await expect(page.getByText(t.auth.mockTitle, { exact: true })).toBeVisible()
  const alert = page.getByRole('alert').filter({ hasText: t.orders.loadError })
  await expect(alert).toBeVisible()
  await expect(alert.getByRole('button', { name: t.orders.retry, exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
