import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'
import type { CreateMenuItemInput } from './menuItems'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const ITEM = '0193a8b1-0000-7000-8000-000000000022'
const CAT = '0193a8b0-2222-7000-8000-000000000009'
const BRANCH = '0193a8b0-0000-7000-8000-000000000010'

const size = (n: string, order: number, isDefault = false) => ({ nameAr: n, nameEn: n, price: 100 + order, sortOrder: order, isDefault })

const input: CreateMenuItemInput = {
  categoryId: CAT,
  nameAr: 'سماش برجر',
  nameEn: 'Classic Smash Burger',
  basePrice: 120,
  sortOrder: 1,
  imageKey: 'tenants/1/menu/items/a.webp',
  isVisibleToCustomers: true,
  sizes: [size('Single', 0, true), size('Double', 1)],
  branchAvailabilities: [{ branchId: BRANCH, isAvailable: true }],
}

const itemRow = {
  id: ITEM,
  categoryId: CAT,
  nameAr: 'سماش برجر',
  nameEn: 'Classic Smash Burger',
  descriptionAr: null,
  descriptionEn: null,
  imageKey: 'tenants/1/menu/items/a.webp',
  imageUrl: 'https://cdn.test/a.webp',
  basePrice: 120,
  sortOrder: 1,
  isActive: true,
  isVisibleToCustomers: true,
  sizes: [{ id: 's1', nameAr: 'سنجل', nameEn: 'Single', price: 120, isDefault: true, sortOrder: 0 }],
  branchAvailabilities: [{ branchId: BRANCH, isAvailable: true, updatedBy: 'u1', updatedAt: '2026-11-25T10:26:00Z' }],
}

beforeEach(() => fetchMock.mockReset())

describe('menu items HTTP adapter', () => {
  it('requests an upload URL', async () => {
    respond({ objectKey: 'k', uploadUrl: 'https://s3/k', expiresAtUtc: '2026-11-25T10:40:00Z', contentType: 'image/webp', maximumSizeBytes: 5242880 })
    const result = await http().createMenuItemImageUploadUrl({ fileName: 'a.webp', contentType: 'image/webp', sizeBytes: 412890 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/menu/items/image-upload-url')
    expect(init).toMatchObject({ method: 'POST' })
    expect(result.objectKey).toBe('k')
    await expect(http().createMenuItemImageUploadUrl({ fileName: 'a.gif', contentType: 'image/gif', sizeBytes: 1 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().createMenuItemImageUploadUrl({ fileName: 'a.png', contentType: 'image/png', sizeBytes: 5242881 })).rejects.toMatchObject({ code: 'validation' })
  })

  it('creates with POST and parses sizes and availabilities', async () => {
    respond(itemRow, 201)
    const created = await http().createMenuItem(input)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/menu/items')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual(input)
    expect(created.sizes[0]).toMatchObject({ isDefault: true, price: 120 })
    expect(created.branchAvailabilities[0].isAvailable).toBe(true)
  })

  it.each([
    ['bad category', { categoryId: 'x' }],
    ['empty name', { nameEn: ' ' }],
    ['long name', { nameAr: 'x'.repeat(201) }],
    ['negative price', { basePrice: -1 }],
    ['fractional sort order', { sortOrder: 0.5 }],
    ['long description', { descriptionEn: 'x'.repeat(1001) }],
    ['long image key', { imageKey: 'k'.repeat(501) }],
    ['two defaults', { sizes: [size('A', 0, true), size('B', 1, true)] }],
    ['duplicate size order', { sizes: [size('A', 0), size('B', 0)] }],
    ['duplicate size name (case-insensitive)', { sizes: [size('Single', 0), size('SINGLE', 1)] }],
    ['negative size price', { sizes: [{ ...size('A', 0), price: -5 }] }],
    ['duplicate branch', { branchAvailabilities: [{ branchId: BRANCH, isAvailable: true }, { branchId: BRANCH, isAvailable: false }] }],
    ['bad branch id', { branchAvailabilities: [{ branchId: 'x', isAvailable: true }] }],
  ])('rejects create: %s', async (_name, patch) => {
    await expect(http().createMenuItem({ ...input, ...patch })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts a minimal item without optional fields', async () => {
    respond(itemRow, 201)
    await http().createMenuItem({ categoryId: CAT, nameAr: 'أ', nameEn: 'A', basePrice: 0, sortOrder: 0 })
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ categoryId: CAT, nameAr: 'أ', nameEn: 'A', basePrice: 0, sortOrder: 0 })
  })

  it('maps 404 and 422', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    await expect(http().createMenuItem(input)).rejects.toMatchObject({ code: 'notFound' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }))
    await expect(http().createMenuItem(input)).rejects.toMatchObject({ code: 'validation' })
  })

  it('updates with PUT and preserves the null-keeps semantics', async () => {
    respond(itemRow)
    await http().updateMenuItem(ITEM, { categoryId: CAT, nameAr: 'a', nameEn: 'b', basePrice: 130, sortOrder: 1, isVisibleToCustomers: true, imageKey: null, sizes: null })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/menu/items/${ITEM}`)
    expect(init).toMatchObject({ method: 'PUT' })
    const body = JSON.parse(init?.body as string)
    expect(body.imageKey).toBeNull()
    expect(body.sizes).toBeNull()
  })

  it('sends an empty sizes array to clear sizes', async () => {
    respond(itemRow)
    await http().updateMenuItem(ITEM, { ...input, sizes: [] })
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).sizes).toEqual([])
  })

  it('removes the image with DELETE and returns the item', async () => {
    respond({ ...itemRow, imageKey: null, imageUrl: null })
    const result = await http().removeMenuItemImage(ITEM)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/menu/items/${ITEM}/image`)
    expect(init).toMatchObject({ method: 'DELETE' })
    expect(result.imageKey).toBeNull()
  })

  it('soft-deletes with DELETE and accepts data null', async () => {
    respond(null)
    await expect(http().deleteMenuItem(ITEM)).resolves.toBeUndefined()
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://api.test/api/v1/admin/menu/items/${ITEM}`)
    await expect(http().deleteMenuItem('x')).rejects.toMatchObject({ code: 'validation' })
  })

  it('rejects malformed items', async () => {
    respond({ nope: true })
    await expect(http().createMenuItem(input)).rejects.toMatchObject({ code: 'invalidResponse' })
  })
})

describe('menu items mock', () => {
  it('creates, updates (keep/clear/replace sizes), removes image and deletes', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const category = await api.createCategory({ nameAr: 'أ', nameEn: 'A', sortOrder: 0 })
    await expect(api.createMenuItem({ ...input, categoryId: CAT })).rejects.toMatchObject({ code: 'notFound' })
    const created = await api.createMenuItem({ ...input, categoryId: category.id })
    expect(created.sizes).toHaveLength(2)
    const kept = await api.updateMenuItem(created.id, { ...input, categoryId: category.id, imageKey: null, sizes: null, basePrice: 130 })
    expect(kept.sizes).toHaveLength(2)
    expect(kept.imageKey).toBe(input.imageKey)
    expect(kept.basePrice).toBe(130)
    expect((await api.updateMenuItem(created.id, { ...input, categoryId: category.id, sizes: [] })).sizes).toHaveLength(0)
    expect((await api.removeMenuItemImage(created.id)).imageUrl).toBeNull()
    await api.deleteMenuItem(created.id)
    await expect(api.deleteMenuItem(created.id)).rejects.toMatchObject({ code: 'notFound' })
  })
})
