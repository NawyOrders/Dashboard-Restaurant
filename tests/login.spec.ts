import { expect, test } from '@playwright/test'
import { staffLoginResponse } from '../src/test/fixtures'
import { translations } from '../src/i18n'

// Every authentication response here is intercepted. These tests never submit
// credentials to the real tenant server and do not prove real-account login.
for (const width of [320, 390, 768, 1280, 1440]) {
  for (const lang of ['ar', 'en'] as const) {
    test(`login layout ${lang} ${width}px`, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      if (lang === 'en') await page.getByRole('button', { name: 'English', exact: true }).click()
      const t = translations[lang]
      await expect(page.locator('html')).toHaveAttribute('dir', t.dir)
      await expect(page.getByLabel(t.auth.email, { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: t.auth.submit, exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const toggle = page.getByRole('button', { name: t.auth.show, exact: true })
      const buttonBox = await toggle.boundingBox()
      const inputBox = await page.getByLabel(t.auth.password, { exact: true }).boundingBox()
      expect(buttonBox!.width).toBeGreaterThanOrEqual(44)
      expect(buttonBox!.x).toBeGreaterThanOrEqual(inputBox!.x)
      expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(inputBox!.x + inputBox!.width)
      await toggle.click()
      await expect(page.getByLabel(t.auth.password, { exact: true })).toHaveAttribute('type', 'text')
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: testInfo.outputPath(`login-${lang}-${width}.png`), fullPage: true })
      }
      expect(errors).toEqual([])
    })
  }
}

for (const lang of ['ar', 'en'] as const) {
  test(`mobile login, identity, logout and relogin ${lang}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route('**/api/v1/auth/**', async (route) => {
      if (route.request().url().endsWith('/login')) {
        expect(route.request().postDataJSON()).toEqual({ email: 'staff@example.test', password: 'fixture-only' })
        await route.fulfill({ json: staffLoginResponse('BranchManager') })
      } else {
        await route.fulfill({ json: { isSuccess: true, data: null } })
      }
    })
    await page.goto('/')
    if (lang === 'en') await page.getByRole('button', { name: 'English', exact: true }).click()
    const t = translations[lang]
    for (let i = 0; i < 2; i++) {
      await page.getByLabel(t.auth.email, { exact: true }).fill('staff@example.test')
      await page.getByLabel(t.auth.password, { exact: true }).fill('fixture-only')
      await page.getByRole('button', { name: t.auth.submit, exact: true }).click()
      await expect(page.getByText(t.auth.previewTitle, { exact: true })).toBeVisible()
      await expect(page.getByText('Test operator', { exact: true })).toBeVisible()
      await expect(page.getByText(t.roles.manager, { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.getByRole('button', { name: t.logout, exact: true }).click()
      await expect(page.getByLabel(t.auth.password, { exact: true })).toHaveValue('')
    }
    expect(errors).toEqual([])
  })
}

test('keyboard validation, server error and retry', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'English', exact: true }).click()
  const t = translations.en
  await page.getByLabel(t.auth.email, { exact: true }).fill('')
  await page.getByLabel(t.auth.password, { exact: true }).fill('')
  await page.getByRole('button', { name: t.auth.submit, exact: true }).click()
  await expect(page.getByLabel(t.auth.email, { exact: true })).toBeFocused()
  await page.getByLabel(t.auth.email, { exact: true }).fill('staff@example.test')
  await page.getByLabel(t.auth.password, { exact: true }).fill('fixture-only')
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ status: 401, json: { isSuccess: false } }))
  await page.getByLabel(t.auth.password, { exact: true }).press('Enter')
  await expect(page.getByRole('alert')).toHaveText(t.auth.error)
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page.getByLabel(t.auth.email, { exact: true })).toBeEnabled()
})

test('reload requires real sign-in, not a stored demo session', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: staffLoginResponse() }))
  await page.goto('/')
  await page.getByLabel(translations.ar.auth.email, { exact: true }).fill('staff@example.test')
  await page.getByLabel(translations.ar.auth.password, { exact: true }).fill('fixture-only')
  await page.getByRole('button', { name: translations.ar.auth.submit, exact: true }).click()
  await expect(page.getByText(translations.ar.auth.previewTitle, { exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('nawy_session'))).toBeNull()
  await page.reload()
  await expect(page.getByLabel(translations.ar.auth.password, { exact: true })).toBeVisible()
})

for (const lang of ['ar', 'en'] as const) {
  test(`development defaults with manual account entry ${lang}`, async ({ page }) => {
    const errors: string[] = []
    const requests: unknown[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 320, height: 740 })
    await page.route('**/api/v1/auth/**', async (route) => {
      if (route.request().url().endsWith('/login')) {
        requests.push(route.request().postDataJSON())
        await route.fulfill({ json: staffLoginResponse('Staff') })
      } else {
        await route.fulfill({ json: { isSuccess: true } })
      }
    })
    await page.goto('/')
    if (lang === 'en') await page.getByRole('button', { name: 'English', exact: true }).click()
    const t = translations[lang]
    await expect(page.getByRole('group')).toHaveCount(0)
    for (const role of ['owner', 'manager', 'staff'] as const) {
      await expect(page.getByRole('button', { name: t.roles[role], exact: true })).toHaveCount(0)
    }
    await expect(page.getByLabel(t.auth.email, { exact: true })).toHaveValue('owner@example.test')
    await expect(page.getByLabel(t.auth.password, { exact: true })).toHaveValue('fixture-only')
    expect(requests).toEqual([])
    for (const role of ['owner', 'manager', 'staff'] as const) {
      await page.getByLabel(t.auth.email, { exact: true }).fill(`${role}@example.test`)
      await page.getByLabel(t.auth.password, { exact: true }).fill('fixture-only')
      await expect(page.getByLabel(t.auth.email, { exact: true })).toHaveValue(`${role}@example.test`)
      await expect(page.getByLabel(t.auth.password, { exact: true })).toHaveAttribute('type', 'password')
      await page.getByRole('button', { name: t.auth.submit, exact: true }).click()
      await expect(page.getByText(t.auth.previewTitle, { exact: true })).toBeVisible()
      await expect(page.getByText(t.roles.staff, { exact: true })).toBeVisible()
      await page.getByRole('button', { name: t.logout, exact: true }).click()
      await expect(page.getByLabel(t.auth.password, { exact: true })).toHaveValue('')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    expect(requests).toEqual(['owner', 'manager', 'staff'].map(role => ({ email: `${role}@example.test`, password: 'fixture-only' })))
    expect(errors).toEqual([])
  })
}
