import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import CategoriesPage from './CategoriesPage'

const t = translations.en
const k = manageCopy.en.categories

function setup(permissions: readonly string[] = [PERMISSIONS.menuView, PERMISSIONS.menuEdit]) {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  render(<CategoriesPage t={t} lang="en" api={api} permissions={permissions} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

async function addCategory(user: ReturnType<typeof userEvent.setup>, button: string, ar: string, en: string) {
  await user.click(await screen.findByRole('button', { name: button }))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByLabelText(k.nameAr), ar)
  await user.type(within(dialog).getByLabelText(k.nameEn), en)
  await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
}

describe('menu categories screen', () => {
  it('shows no access without a menu permission', async () => {
    setup([PERMISSIONS.ordersView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('is read only with menu.view', async () => {
    setup([PERMISSIONS.menuView])
    expect(await screen.findByText(k.empty)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: k.add })).not.toBeInTheDocument()
  })

  it('validates, creates a category and a subcategory, then reorders', async () => {
    const { api, user } = setup()
    await user.click(await screen.findByRole('button', { name: k.add }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: manageCopy.en.save }))
    expect(await screen.findByRole('alert')).toHaveTextContent(k.invalid)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: manageCopy.en.cancel }))

    await addCategory(user, k.add, 'مشويات', 'Grills')
    await addCategory(user, k.add, 'مشروبات', 'Drinks')
    const grills = (await screen.findByText('Grills', { selector: 'h3' })).closest('li')!
    expect(await screen.findByText('Drinks', { selector: 'h3' })).toBeInTheDocument()

    await user.click(within(grills).getByRole('button', { name: k.addSub }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(k.nameAr), 'دجاج')
    await user.type(within(dialog).getByLabelText(k.nameEn), 'Chicken')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(async () => expect((await api.listSubcategories((await api.listRootCategories())[0].id)).length).toBe(1))

    const reorder = vi.spyOn(api, 'reorderCategories')
    const drinks = screen.getByText('Drinks', { selector: 'h3' }).closest('li')!
    await user.click(within(drinks).getAllByRole('button', { name: k.moveUp })[0])
    await waitFor(() => expect(reorder).toHaveBeenCalledTimes(1))
    await waitFor(async () => expect((await api.listRootCategories())[0].nameEn).toBe('Drinks'))
  })

  it('deletes only after a second confirm', async () => {
    const { api, user } = setup()
    await addCategory(user, k.add, 'حلويات', 'Sweets')
    const remove = vi.spyOn(api, 'deleteCategory')
    const card = (await screen.findByText('Sweets', { selector: 'h3' })).closest('li')!
    await user.click(within(card).getByRole('button', { name: manageCopy.en.edit }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.delete }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.confirmDelete }))
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
  })
})
