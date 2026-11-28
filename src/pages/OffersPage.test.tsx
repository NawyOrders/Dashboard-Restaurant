import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../api/mockApi'
import { ApiError } from '../api/types'
import { PERMISSIONS } from '../authz'
import { translations } from '../i18n'
import { manageCopy } from '../manage/text'
import OffersPage, { offerItemId } from './OffersPage'

const t = translations.en
const o = manageCopy.en.offers
const ALL = [PERMISSIONS.offersView, PERMISSIONS.offersManage]

function setup(permissions: readonly string[] = ALL) {
  const api = createMockApi({ latencyMs: 0 })
  const onToast = vi.fn()
  render(<OffersPage t={t} lang="en" api={api} permissions={permissions} uploadsEnabled={false} onToast={onToast} />)
  return { api, onToast, user: userEvent.setup() }
}

describe('offers screen', () => {
  it('maps preview menu ids to UUIDs and keeps real UUIDs', () => {
    expect(offerItemId('m1')).toMatch(/^00000000-0000-7000-8000-[0-9a-f]{12}$/)
    expect(offerItemId('0193a8b1-0000-7000-8000-000000000022')).toBe('0193a8b1-0000-7000-8000-000000000022')
  })

  it('shows no access without offers permissions', async () => {
    setup([PERMISSIONS.menuView])
    expect(await screen.findByText(manageCopy.en.noAccess)).toBeInTheDocument()
  })

  it('hides write controls for view-only users', async () => {
    setup([PERMISSIONS.offersView])
    expect(await screen.findByText(o.empty)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: o.add })).toBeNull()
  })

  it('requires an image, then creates an offer and toggles it', async () => {
    const { api, user, onToast } = setup()
    const create = vi.spyOn(api, 'createOffer')
    await user.click(await screen.findByRole('button', { name: o.add }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(o.titleAr), 'عرض')
    await user.type(within(dialog).getByLabelText(o.titleEn), 'Deal')
    await user.type(within(dialog).getByLabelText(o.price), '90')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    expect(await within(dialog).findByText(o.imageRequired)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()

    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await user.upload(within(dialog).getByLabelText(o.image), file)
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0][0]).toMatchObject({ kind: 'SingleItem', titleEn: 'Deal', offerPrice: 90, imageSource: 'ManualUpload' })
    expect(await screen.findByText('Deal')).toBeInTheDocument()
    expect(onToast).toHaveBeenCalledWith(manageCopy.en.saved)

    const setStatus = vi.spyOn(api, 'setOfferStatus')
    await user.click(screen.getByRole('switch', { name: new RegExp(o.active) }))
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith(expect.any(String), { isActive: false }))
  })

  it('names the price rule before sending a request that would fail', async () => {
    const { api, user } = setup()
    await user.click(await screen.findByRole('button', { name: o.add }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(o.titleAr), 'ع')
    await user.type(within(dialog).getByLabelText(o.titleEn), 'E')
    await user.type(within(dialog).getByLabelText(o.price), '5000')
    await user.upload(within(dialog).getByLabelText(o.image), new File(['x'], 'a.png', { type: 'image/png' }))
    const create = vi.spyOn(api, 'createOffer')
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    const priceRule = o.priceTooHigh.split('{original}')[0].trim()
    expect(await within(dialog).findByText((content) => content.startsWith(priceRule))).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it("names the field the API rejected instead of one generic failure", async () => {
    const { api, user } = setup()
    vi.spyOn(api, 'createOffer').mockRejectedValue(
      new ApiError('validation', { 'Offer.OfferPriceMustBeLessThanOriginal': 'Offer sale price must be greater than 0 and strictly less than the original price.' }),
    )
    await user.click(await screen.findByRole('button', { name: o.add }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(o.titleAr), 'ع')
    await user.type(within(dialog).getByLabelText(o.titleEn), 'E')
    await user.type(within(dialog).getByLabelText(o.price), '10')
    await user.upload(within(dialog).getByLabelText(o.image), new File(['x'], 'a.png', { type: 'image/png' }))
    await user.click(within(dialog).getByRole('button', { name: manageCopy.en.save }))
    const priceRule = o.priceTooHigh.split('{original}')[0].trim()
    expect(await within(dialog).findByText((content) => content.startsWith(priceRule))).toBeInTheDocument()
  })
})
