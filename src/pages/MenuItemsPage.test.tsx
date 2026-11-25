import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import MenuItemsPage from './MenuItemsPage'

const t = translations.en
const m = manageCopy.en.items

async function setup(permissions: readonly string[] = [PERMISSIONS.menuView, PERMISSIONS.menuEdit]) {
  const api = createMockApi({ latencyMs: 0 })
  await api.createCategory({ nameAr: 'مشويات', nameEn: 'Grills', sortOrder: 0 })
  const onToast = vi.fn()
  render(<MenuItemsPage t={t} lang="en" api={api} permissions={permissions} uploadsEnabled={false} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

describe('menu items screen', () => {
  it('shows no access without a menu permission', async () => {
    await setup([PERMISSIONS.ordersView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('is read only with menu.view', async () => {
    await setup([PERMISSIONS.menuView])
    await waitFor(() => expect(screen.queryByText(manageCopy.en.loading)).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: m.add })).not.toBeInTheDocument()
  })

  it('validates, then creates an item with a size and edits it', async () => {
    const { api, user } = await setup()
    const create = vi.spyOn(api, 'createMenuItem')
    const update = vi.spyOn(api, 'updateMenuItem')
    await user.click(await screen.findByRole('button', { name: m.add }))
    let dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(m.invalid)

    await user.type(within(dialog).getByLabelText(m.nameAr), 'كباب')
    await user.type(within(dialog).getByLabelText(m.nameEn), 'Kebab')
    await user.type(within(dialog).getByLabelText(m.price), '120')
    await user.click(within(dialog).getByRole('button', { name: m.addSize }))
    await user.type(within(dialog).getByLabelText(m.sizeNameAr), 'كبير')
    await user.type(within(dialog).getByLabelText(m.sizeNameEn), 'Large')
    await user.type(within(dialog).getByLabelText(`${m.price} 1`), '150')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][0]).toMatchObject({ nameEn: 'Kebab', basePrice: 120, sizes: [{ nameEn: 'Large', price: 150, sortOrder: 0 }] })

    const card = (await screen.findByText('Kebab', { selector: 'h3' })).closest('li')!
    await user.click(within(card).getByRole('button', { name: manageCopy.en.edit }))
    dialog = await screen.findByRole('dialog')
    const priceField = within(dialog).getByLabelText(m.price)
    await user.clear(priceField)
    await user.type(priceField, '130')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update.mock.calls[0][1]).toMatchObject({ basePrice: 130, sizes: null })
  })
})
