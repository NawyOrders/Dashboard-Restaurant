import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const ITEM = '0193a8b1-0000-7000-8000-000000000022'
const ADDON = '0193a8b8-0000-7000-8000-000000000002'
const row = { id: ADDON, menuItemId: ITEM, nameAr: 'هالبينو', nameEn: 'Jalapenos', price: 10, sortOrder: 1, isActive: true }

beforeEach(() => fetchMock.mockReset())

describe('add-ons HTTP adapter', () => {
  it('lists add-ons with the isActive filter and paging', async () => {
    respond({ items: [row], totalCount: 1, page: 2, pageSize: 5, totalPages: 1, hasPreviousPage: true, hasNextPage: false })
    const result = await http().listAddOns({ isActive: false, pageNumber: 2, pageSize: 5 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/menu/addons?isActive=false&pageNumber=2&pageSize=5')
    expect(init).toMatchObject({ method: 'GET' })
    expect(result.items[0]).toMatchObject({ id: ADDON, price: 10, isActive: true })
  })

  it('rejects bad paging before calling the network', async () => {
    await expect(http().listAddOns({ pageSize: 101 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().listAddOns({ pageNumber: 0 })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates an add-on under its item', async () => {
    respond(row, 201)
    const created = await http().createAddOn(ITEM, { nameAr: 'هالبينو', nameEn: 'Jalapenos', price: 10 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/menu/items/${ITEM}/addons`)
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(init?.body))).toEqual({ nameAr: 'هالبينو', nameEn: 'Jalapenos', price: 10 })
    expect(created.menuItemId).toBe(ITEM)
  })

  it('validates create input', async () => {
    await expect(http().createAddOn(ITEM, { nameAr: ' ', nameEn: 'x', price: 1 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().createAddOn(ITEM, { nameAr: 'x', nameEn: 'y'.repeat(201), price: 1 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().createAddOn(ITEM, { nameAr: 'x', nameEn: 'y', price: -1 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().createAddOn('nope', { nameAr: 'x', nameEn: 'y', price: 1 })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('patches an add-on and rejects empty or invalid patches', async () => {
    respond({ ...row, price: 12.5, sortOrder: 0 })
    const updated = await http().updateAddOn(ITEM, ADDON, { price: 12.5, sortOrder: 0 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/menu/items/${ITEM}/addons/${ADDON}`)
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(updated).toMatchObject({ price: 12.5, sortOrder: 0 })
    await expect(http().updateAddOn(ITEM, ADDON, {})).rejects.toMatchObject({ code: 'validation' })
    await expect(http().updateAddOn(ITEM, ADDON, { sortOrder: -1 })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().updateAddOn(ITEM, ADDON, { nameEn: '' })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deletes an add-on', async () => {
    respond(null)
    await http().deleteAddOn(ITEM, ADDON)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/menu/items/${ITEM}/addons/${ADDON}`)
    expect(init).toMatchObject({ method: 'DELETE' })
  })

  it('maps 404 to notFound and 403 to forbidden', async () => {
    respond(null, 404)
    await expect(http().deleteAddOn(ITEM, ADDON)).rejects.toMatchObject({ code: 'notFound' })
    respond(null, 403)
    await expect(http().listAddOns()).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('rejects a malformed add-on response', async () => {
    respond({ nameEn: 'no id' }, 201)
    await expect(http().createAddOn(ITEM, { nameAr: 'x', nameEn: 'y', price: 1 })).rejects.toMatchObject({ code: 'invalidResponse' })
  })
})

describe('add-ons mock adapter', () => {
  async function setup() {
    const api = createMockApi()
    const cat = await api.createCategory({ nameAr: 'ع', nameEn: 'Burgers', sortOrder: 0 } as never)
    const item = await api.createMenuItem({ categoryId: cat.id, nameAr: 'ب', nameEn: 'Burger', basePrice: 100, sortOrder: 0 })
    return { api, item }
  }

  it('creates, lists, filters and deletes add-ons', async () => {
    const { api, item } = await setup()
    const a = await api.createAddOn(item.id, { nameAr: 'أ', nameEn: 'Cheese', price: 5 })
    const b = await api.createAddOn(item.id, { nameAr: 'ب', nameEn: 'Bacon', price: 8 })
    expect([a.sortOrder, b.sortOrder]).toEqual([0, 1])
    await api.updateAddOn(item.id, a.id, { isActive: false })
    expect((await api.listAddOns({ isActive: true })).items.map((x) => x.id)).toEqual([b.id])
    expect((await api.listAddOns()).totalCount).toBe(2)
    await api.deleteAddOn(item.id, a.id)
    expect((await api.listAddOns()).totalCount).toBe(1)
    await expect(api.deleteAddOn(item.id, a.id)).rejects.toMatchObject({ code: 'notFound' })
  })

  it('moves an add-on to a new position', async () => {
    const { api, item } = await setup()
    const a = await api.createAddOn(item.id, { nameAr: 'أ', nameEn: 'A', price: 1 })
    const b = await api.createAddOn(item.id, { nameAr: 'ب', nameEn: 'B', price: 1 })
    await api.updateAddOn(item.id, b.id, { sortOrder: 0 })
    const list = (await api.listAddOns()).items
    expect(list.find((x) => x.id === b.id)?.sortOrder).toBe(0)
    expect(list.find((x) => x.id === a.id)?.sortOrder).toBe(1)
  })

  it('rejects unknown items and empty patches', async () => {
    const { api, item } = await setup()
    await expect(api.createAddOn('00000000-0000-7000-8000-000000000999', { nameAr: 'أ', nameEn: 'A', price: 1 })).rejects.toMatchObject({ code: 'notFound' })
    const a = await api.createAddOn(item.id, { nameAr: 'أ', nameEn: 'A', price: 1 })
    await expect(api.updateAddOn(item.id, a.id, {})).rejects.toMatchObject({ code: 'validation' })
  })
})
