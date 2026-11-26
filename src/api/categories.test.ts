import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const A = '0193a8b0-2222-7000-8000-000000000001'
const B = '0193a8b0-2222-7000-8000-000000000050'
const managed = { id: B, menuId: '0193a8b0-0000-7000-8000-000000000005', parentId: null, nameAr: 'مشويات', nameEn: 'Grills', imageKey: null, sortOrder: 2, isActive: true }

beforeEach(() => fetchMock.mockReset())

describe('categories HTTP adapter', () => {
  it('lists root categories and subcategories', async () => {
    respond([{ id: A, nameAr: 'البرجر', nameEn: 'Burgers', imageKey: null, sortOrder: 0, isActive: true, itemCount: 12, hasSubCategories: true }])
    const roots = await http().listRootCategories()
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.test/api/v1/menu/categories')
    expect(roots[0]).toMatchObject({ itemCount: 12, hasSubCategories: true })
    respond([{ id: B, nameAr: 'برجر لحم', nameEn: 'Beef', sortOrder: 0, isActive: true, itemCount: 8 }])
    const subs = await http().listSubcategories(A)
    expect(String(fetchMock.mock.calls[1][0])).toBe(`https://api.test/api/v1/menu/categories/${A}/subcategories`)
    expect(subs[0].hasSubCategories).toBeNull()
    await expect(http().listSubcategories('0')).rejects.toMatchObject({ code: 'validation' })
  })

  it('rejects non-array list bodies', async () => {
    respond({ items: [] })
    await expect(http().listRootCategories()).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('creates with POST and sends parentId and sortOrder', async () => {
    respond(managed, 201)
    const input = { nameAr: 'مشويات', nameEn: 'Grills', sortOrder: 2, parentId: null, imageKey: null }
    await http().createCategory(input)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/menu/categories')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual(input)
  })

  it.each([
    [{ nameAr: '', nameEn: 'x', sortOrder: 0 }],
    [{ nameAr: 'x', nameEn: 'y'.repeat(201), sortOrder: 0 }],
    [{ nameAr: 'x', nameEn: 'y', sortOrder: -1 }],
    [{ nameAr: 'x', nameEn: 'y', sortOrder: 1.5 }],
    [{ nameAr: 'x', nameEn: 'y', sortOrder: 0, parentId: 'nope' }],
    [{ nameAr: 'x', nameEn: 'y', sortOrder: 0, imageKey: 'k'.repeat(501) }],
  ])('rejects create %#', async (input) => {
    await expect(http().createCategory(input)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps 422 max depth and 404 parent', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }))
    await expect(http().createCategory({ nameAr: 'a', nameEn: 'b', sortOrder: 0, parentId: B })).rejects.toMatchObject({ code: 'validation' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    await expect(http().createCategory({ nameAr: 'a', nameEn: 'b', sortOrder: 0, parentId: B })).rejects.toMatchObject({ code: 'notFound' })
  })

  it('updates with PUT and never sends parentId or sortOrder', async () => {
    respond(managed)
    await http().updateCategory(B, { nameAr: 'مشويات فحم', nameEn: 'Charcoal Grills', imageKey: null })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/menu/categories/${B}`)
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init?.body as string)).toEqual({ nameAr: 'مشويات فحم', nameEn: 'Charcoal Grills', imageKey: null })
  })

  it('reorders with PUT /reorder', async () => {
    respond(null)
    await http().reorderCategories({ parentId: null, orderedCategoryIds: [B, A] })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/menu/categories/reorder')
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init?.body as string)).toEqual({ parentId: null, orderedCategoryIds: [B, A] })
  })

  it.each([
    [{ orderedCategoryIds: [] }],
    [{ orderedCategoryIds: [A, A] }],
    [{ orderedCategoryIds: ['x'] }],
    [{ parentId: 'x', orderedCategoryIds: [A] }],
  ])('rejects reorder %#', async (input) => {
    await expect(http().reorderCategories(input)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('deletes with DELETE and maps 409 when children exist', async () => {
    respond(null)
    await http().deleteCategory(B)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }))
    await expect(http().deleteCategory(B)).rejects.toMatchObject({ code: 'conflict' })
  })
})

describe('categories mock', () => {
  it('enforces one level, reorders the full set and blocks deleting a parent', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const a = await api.createCategory({ nameAr: 'أ', nameEn: 'A', sortOrder: 0 })
    const b = await api.createCategory({ nameAr: 'ب', nameEn: 'B', sortOrder: 1 })
    const sub = await api.createCategory({ nameAr: 'ج', nameEn: 'C', sortOrder: 0, parentId: a.id })
    await expect(api.createCategory({ nameAr: 'د', nameEn: 'D', sortOrder: 0, parentId: sub.id })).rejects.toMatchObject({ code: 'validation' })
    expect((await api.listRootCategories())[0]).toMatchObject({ id: a.id, hasSubCategories: true })
    expect(await api.listSubcategories(a.id)).toHaveLength(1)

    await expect(api.reorderCategories({ orderedCategoryIds: [a.id] })).rejects.toMatchObject({ code: 'validation' })
    await api.reorderCategories({ orderedCategoryIds: [b.id, a.id] })
    expect((await api.listRootCategories()).map((c) => c.id)).toEqual([b.id, a.id])

    await expect(api.deleteCategory(a.id)).rejects.toMatchObject({ code: 'conflict' })
    await api.deleteCategory(sub.id)
    await api.deleteCategory(a.id)
    expect(await api.listRootCategories()).toHaveLength(1)
    expect((await api.updateCategory(b.id, { nameAr: 'ب2', nameEn: 'B2' })).nameEn).toBe('B2')
  })
})
