import { describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'

function ok(data: unknown) {
  return new Response(JSON.stringify({ statusCode: 200, isSuccess: true, data }), { status: 200 })
}

describe('listMenu against the real paged API', () => {
  it('reads items per category from the paged response and uses imageKey as the image', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.includes('/menu/categories')) {
        return ok([{ id: 'c1', nameAr: 'ميكسات', nameEn: 'Mixes', itemCount: 1 }])
      }
      return ok({
        items: [{ id: 'i1', nameAr: 'عنتر', nameEn: 'Antara', price: 90, imageKey: 'https://img.test/a.jpg', isAvailable: true }],
        totalCount: 1,
        page: 1,
        pageSize: 100,
      })
    })
    const api = createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 't', fetchImpl: fetchMock, timeoutMs: 1000 })
    const menu = await api.listMenu()
    expect(menu).toHaveLength(1)
    expect(menu[0].items[0]).toMatchObject({ id: 'i1', categoryId: 'c1', price: 90, imageUrl: 'https://img.test/a.jpg', available: true })
    const itemsCall = String(fetchMock.mock.calls.find(([u]) => String(u).includes('/menu/items'))?.[0])
    expect(itemsCall).toContain('categoryId=c1')
    expect(itemsCall).toContain('pageSize=100')
  })
})
