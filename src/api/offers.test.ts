import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'
import type { CreateOfferInput } from './offers'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const ITEM = '0193a8b1-0000-7000-8000-000000000022'
const SIZE = '0193a8b1-0000-7000-8000-000000000023'
const OFFER_ID = '0193a8c1-0000-7000-8000-000000000001'
const BRANCH = '0193a8b1-0000-7000-8000-000000000099'

const offerRow = {
  id: OFFER_ID,
  kind: 'Combo',
  status: 'Active',
  titleAr: 'كومبو',
  titleEn: 'Combo',
  descriptionAr: null,
  descriptionEn: null,
  imageKey: 'tenants/1/offers/manual/a.webp',
  imageUrl: 'https://cdn.test/a.webp',
  imageSource: 'ManualUpload',
  originalPrice: 240,
  offerPrice: 199,
  savedAmount: 41,
  discountPercentage: 17.1,
  startsAtUtc: '2026-11-25T00:00:00Z',
  endsAtUtc: '2026-12-05T23:59:59Z',
  isActive: true,
  branchIds: null,
  items: [
    {
      id: 'x1',
      menuItemId: ITEM,
      menuItemNameAr: 'برجر',
      menuItemNameEn: 'Burger',
      itemSizeId: SIZE,
      itemSizeNameAr: 'سنجل',
      itemSizeNameEn: 'Single',
      quantity: 2,
      unitPriceSnapshot: 120,
    },
  ],
  createdAtUtc: '2026-11-25T10:36:00Z',
  modifiedAtUtc: null,
}

const createInput: CreateOfferInput = {
  kind: 'Combo',
  titleAr: 'كومبو',
  titleEn: 'Combo',
  imageKey: 'tenants/1/offers/manual/a.webp',
  imageSource: 'ManualUpload',
  offerPrice: 199,
  startsAtUtc: '2026-11-25T00:00:00Z',
  endsAtUtc: '2026-12-05T23:59:59Z',
  isActive: true,
  notifyCustomers: true,
  branchIds: null,
  items: [{ menuItemId: ITEM, itemSizeId: SIZE, quantity: 2 }],
}

beforeEach(() => fetchMock.mockReset())

describe('offers HTTP adapter', () => {
  it('requests an image upload URL with POST', async () => {
    respond({ objectKey: 'k', uploadUrl: 'https://s3/k', expiresAtUtc: '2026-11-25T10:50:00Z', contentType: 'image/webp', maximumSizeBytes: 5242880 })
    const result = await http().createOfferImageUploadUrl({ fileName: 'a.webp', contentType: 'image/webp', sizeBytes: 620400 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/offers/image-upload-url')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual({ fileName: 'a.webp', contentType: 'image/webp', sizeBytes: 620400 })
    expect(result.objectKey).toBe('k')
  })

  it.each([
    [{ fileName: '', contentType: 'image/png', sizeBytes: 1 }],
    [{ fileName: 'a.gif', contentType: 'image/gif', sizeBytes: 1 }],
    [{ fileName: 'a.png', contentType: 'image/png', sizeBytes: 0 }],
    [{ fileName: 'a.png', contentType: 'image/png', sizeBytes: 5242881 }],
  ])('rejects invalid upload metadata %#', async (input) => {
    await expect(http().createOfferImageUploadUrl(input)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates an offer with POST /api/v1/admin/offers', async () => {
    respond(offerRow, 201)
    const created = await http().createOffer(createInput)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/offers')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual(createInput)
    expect(created.items[0].unitPriceSnapshot).toBe(120)
    expect(created.branchIds).toBeNull()
  })

  it.each([
    ['single item with two lines', { kind: 'SingleItem' as const, items: [{ menuItemId: ITEM, quantity: 1 }, { menuItemId: SIZE, quantity: 1 }] }],
    ['combo with one unit', { items: [{ menuItemId: ITEM, quantity: 1 }] }],
    ['duplicate item and size', { items: [{ menuItemId: ITEM, itemSizeId: SIZE, quantity: 1 }, { menuItemId: ITEM, itemSizeId: SIZE, quantity: 1 }] }],
    ['end before start', { endsAtUtc: '2026-11-24T00:00:00Z' }],
    ['zero price', { offerPrice: 0 }],
    ['long title', { titleEn: 'x'.repeat(201) }],
    ['long description', { descriptionAr: 'x'.repeat(1001) }],
    ['empty branch list', { branchIds: [] }],
    ['bad branch id', { branchIds: ['nope'] }],
    ['missing image key', { imageKey: '' }],
    ['no items', { items: [] }],
  ])('rejects create: %s', async (_name, patch) => {
    await expect(http().createOffer({ ...createInput, ...patch })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lists with filters and paging', async () => {
    respond({ items: [offerRow], totalCount: 1, page: 2, pageSize: 5, totalPages: 1, hasPreviousPage: true, hasNextPage: false })
    const result = await http().listOffers({ kind: 'Combo', status: 'Active', pageNumber: 2, pageSize: 5 })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/api/v1/admin/offers')
    expect(Object.fromEntries(url.searchParams)).toEqual({ kind: 'Combo', status: 'Active', pageNumber: '2', pageSize: '5' })
    expect(result.items).toHaveLength(1)
    expect(result.hasPreviousPage).toBe(true)
  })

  it('rejects invalid list filters before calling', async () => {
    await expect(http().listOffers({ pageSize: 101 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().listOffers({ pageNumber: 0 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().listOffers({ status: 'Bogus' as never })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gets one offer and maps 404', async () => {
    respond(offerRow)
    expect((await http().getOffer(OFFER_ID)).id).toBe(OFFER_ID)
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://api.test/api/v1/admin/offers/${OFFER_ID}`)
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    await expect(http().getOffer(OFFER_ID)).rejects.toMatchObject({ code: 'notFound' })
    await expect(http().getOffer('not-a-uuid')).rejects.toMatchObject({ code: 'validation' })
  })

  it('maps 403 and 422', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }))
    await expect(http().createOffer(createInput)).rejects.toMatchObject({ code: 'forbidden' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }))
    await expect(http().createOffer(createInput)).rejects.toMatchObject({ code: 'validation' })
  })

  it('updates with PUT and keeps the banner when imageKey is null', async () => {
    respond(offerRow)
    const { imageKey: _k, imageSource: _s, notifyCustomers: _n, ...rest } = createInput
    await http().updateOffer(OFFER_ID, { ...rest, imageKey: null, imageSource: null, offerPrice: 189 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/offers/${OFFER_ID}`)
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init?.body as string)).toMatchObject({ imageKey: null, imageSource: null, offerPrice: 189 })
  })

  it('requires imageSource when replacing the banner on update', async () => {
    const { imageKey: _k, imageSource: _s, notifyCustomers: _n, ...rest } = createInput
    await expect(http().updateOffer(OFFER_ID, { ...rest, imageKey: 'tenants/1/new.webp', imageSource: null })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('toggles status with PATCH', async () => {
    respond({ ...offerRow, isActive: false, status: 'Inactive' })
    const result = await http().setOfferStatus(OFFER_ID, { isActive: false, notifyCustomers: false })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/offers/${OFFER_ID}/status`)
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(init?.body as string)).toEqual({ isActive: false, notifyCustomers: false })
    expect(result.status).toBe('Inactive')
  })

  it('deletes with DELETE and accepts data: null', async () => {
    respond(null)
    await expect(http().deleteOffer(OFFER_ID)).resolves.toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/offers/${OFFER_ID}`)
    expect(init).toMatchObject({ method: 'DELETE' })
  })

  it('rejects malformed offers', async () => {
    respond({ ...offerRow, kind: 'Weird' })
    await expect(http().getOffer(OFFER_ID)).rejects.toMatchObject({ code: 'invalidResponse' })
  })
})

describe('offers mock', () => {
  const mock = () => createMockApi({ latencyMs: 0 })

  it('runs the full lifecycle', async () => {
    const api = mock()
    const created = await api.createOffer({ ...createInput, branchIds: [BRANCH], startsAtUtc: '2020-01-01T00:00:00Z', endsAtUtc: '2099-01-01T00:00:00Z' })
    expect(created.status).toBe('Active')
    expect(created.originalPrice).toBe(200)
    expect(created.savedAmount).toBe(1)
    expect((await api.listOffers({ status: 'Active' })).totalCount).toBe(1)
    expect((await api.listOffers({ status: 'Inactive' })).totalCount).toBe(0)
    const paused = await api.setOfferStatus(created.id, { isActive: false })
    expect(paused.status).toBe('Inactive')
    const { imageKey: _k, imageSource: _s, notifyCustomers: _n, ...rest } = createInput
    const updated = await api.updateOffer(created.id, { ...rest, imageKey: null, imageSource: null, offerPrice: 150 })
    expect(updated.imageKey).toBe(createInput.imageKey)
    expect(updated.offerPrice).toBe(150)
    await api.deleteOffer(created.id)
    await expect(api.getOffer(created.id)).rejects.toMatchObject({ code: 'notFound' })
  })

  it('enforces offerPrice below the computed original price', async () => {
    await expect(mock().createOffer({ ...createInput, offerPrice: 200 })).rejects.toMatchObject({ code: 'validation' })
  })

  it('returns an upload URL for valid metadata', async () => {
    const result = await mock().createOfferImageUploadUrl({ fileName: 'a.png', contentType: 'image/png', sizeBytes: 10 })
    expect(result.maximumSizeBytes).toBe(5242880)
  })
})
