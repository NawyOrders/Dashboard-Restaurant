import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import AddOnsPage from './AddOnsPage'

const t = translations.en
const a = manageCopy.en.addons

async function setup(permissions: readonly string[] = [PERMISSIONS.menuEdit]) {
  const api = createMockApi({ latencyMs: 0 })
  const category = await api.createCategory({ nameAr: 'مشويات', nameEn: 'Grills', sortOrder: 0 })
  await api.createMenuItem({ categoryId: category.id, nameAr: 'كباب', nameEn: 'Kebab', basePrice: 120, sortOrder: 0 })
  const onToast = vi.fn()
  render(<AddOnsPage t={t} lang="en" api={api} permissions={permissions} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

describe('add-ons screen', () => {
  it('shows no access without menu.edit', async () => {
    await setup([PERMISSIONS.menuView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('validates, creates an add-on, sends only the changed fields on edit, then deletes after a second confirm', async () => {
    const { api, user } = await setup()
    const create = vi.spyOn(api, 'createAddOn')
    const update = vi.spyOn(api, 'updateAddOn')
    const remove = vi.spyOn(api, 'deleteAddOn')
    expect(await screen.findByText(a.empty)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: a.add }))
    let dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(a.invalid)
    await user.selectOptions(within(dialog).getByLabelText(a.item), 'Kebab')
    await user.type(within(dialog).getByLabelText(a.nameAr), 'جبنة')
    await user.type(within(dialog).getByLabelText(a.nameEn), 'Cheese')
    await user.type(within(dialog).getByLabelText(a.price), '15')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][1]).toEqual({ nameAr: 'جبنة', nameEn: 'Cheese', price: 15 })

    const card = (await screen.findByText('Cheese', { selector: 'h3' })).closest('li')!
    expect(within(card).getByText('Kebab')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: manageCopy.en.edit }))
    dialog = await screen.findByRole('dialog')
    const price = within(dialog).getByLabelText(a.price)
    await user.clear(price)
    await user.type(price, '20')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update.mock.calls[0][2]).toEqual({ price: 20 })

    const again = (await screen.findByText('Cheese', { selector: 'h3' })).closest('li')!
    await user.click(within(again).getByRole('button', { name: manageCopy.en.edit }))
    dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.delete }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.confirmDelete }))
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
  })
})
