import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './types'
import { createHttpApi } from './httpApi'

const ok = (data: unknown) => new Response(JSON.stringify({ statusCode: 200, isSuccess: true, data }), { status: 200 })

function apiWith(handler: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => handler(String(input)))
  return { fetchMock, api: createHttpApi({ baseUrl: 'https://api.test', getAccessToken: () => 't', fetchImpl: fetchMock, timeoutMs: 1000 }) }
}

const cat = (id: string, extra: object = {}) => ({ id, nameAr: 'ع', nameEn: 'E', itemCount: 1, ...extra })

describe('listMenu edge cases', () => {
  it('returns an empty menu for no categories and makes no item calls', async () => {
    const { api, fetchMock } = apiWith(() => ok([]))
    expect(await api.listMenu()).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('skips categories without an id or that are not objects', async () => {
    const { api } = apiWith((url) => (url.includes('categories') ? ok([null, 5, 'x', {}, { id: '' }, cat('c1')]) : ok({ items: [] })))
    const menu = await api.listMenu()
    expect(menu.map((c) => c.id)).toEqual(['c1'])
  })

  it('keeps empty categories and survives items that are missing or not a list', async () => {
    const { api } = apiWith((url) => (url.includes('categories') ? ok([cat('c1'), cat('c2')]) : url.includes('c1') ? ok({}) : ok({ items: 'oops' })))
    const menu = await api.listMenu()
    expect(menu.map((c) => c.items.length)).toEqual([0, 0])
  })

  it('drops malformed items but keeps valid ones, with a zero price when the price is missing', async () => {
    const { api } = apiWith((url) =>
      url.includes('categories') ? ok([cat('c1')]) : ok({ items: [null, { nameEn: 'no id' }, { id: 'i1', nameEn: 'Ok' }, { id: 'i2', price: 'abc' }] }),
    )
    const [category] = await api.listMenu()
    expect(category.items.map((i) => i.id)).toEqual(['i1', 'i2'])
    expect(category.items.every((i) => i.price === 0)).toBe(true)
  })

  it('treats isAvailable false as unavailable and anything else as available', async () => {
    const { api } = apiWith((url) =>
      url.includes('categories') ? ok([cat('c1')]) : ok({ items: [{ id: 'a', isAvailable: false }, { id: 'b', isAvailable: true }, { id: 'c' }] }),
    )
    const [category] = await api.listMenu()
    expect(category.items.map((i) => i.available)).toEqual([false, true, true])
  })

  it('uses the category id for items even if the server sends a different categoryId', async () => {
    const { api } = apiWith((url) => (url.includes('categories') ? ok([cat('c1')]) : ok({ items: [{ id: 'a', categoryId: 'other' }] })))
    const [category] = await api.listMenu()
    expect(category.items[0].categoryId).toBe('c1')
  })

  it('falls back to the loaded item count when itemCount is missing', async () => {
    const { api } = apiWith((url) => (url.includes('categories') ? ok([{ id: 'c1', nameEn: 'E' }]) : ok({ items: [{ id: 'a' }, { id: 'b' }] })))
    expect((await api.listMenu())[0].count).toBe(2)
  })

  it('does not pass image keys that are not URLs through as null', async () => {
    const { api } = apiWith((url) => (url.includes('categories') ? ok([cat('c1')]) : ok({ items: [{ id: 'a', imageKey: 'https://img.test/x.jpg' }, { id: 'b', imageKey: null }] })))
    const [category] = await api.listMenu()
    expect(category.items.map((i) => i.imageUrl)).toEqual(['https://img.test/x.jpg', null])
  })

  it('fails as a whole when one category request fails, with a typed error', async () => {
    const { api } = apiWith((url) => (url.includes('categories') ? ok([cat('c1'), cat('c2')]) : url.includes('c2') ? new Response('', { status: 500 }) : ok({ items: [] })))
    await expect(api.listMenu()).rejects.toBeInstanceOf(ApiError)
  })

  it.each([401, 403, 404, 429])('maps HTTP %i on categories to a typed error', async (status) => {
    const { api } = apiWith(() => new Response('', { status }))
    await expect(api.listMenu()).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects an HTML page returned with 200 and a non-list categories payload', async () => {
    const { api: html } = apiWith(() => new Response('<html></html>', { status: 200 }))
    await expect(html.listMenu()).rejects.toBeInstanceOf(ApiError)
    const { api: obj } = apiWith(() => ok({ not: 'a list' }))
    await expect(obj.listMenu()).rejects.toBeInstanceOf(ApiError)
  })

  it('url-encodes the category id in the query', async () => {
    const { api, fetchMock } = apiWith((url) => (url.includes('categories') ? ok([cat('a b&c')]) : ok({ items: [] })))
    await api.listMenu()
    expect(String(fetchMock.mock.calls[1][0])).toContain('categoryId=a+b%26c')
  })

  it('handles a few hundred categories', async () => {
    const many = Array.from({ length: 300 }, (_, i) => cat(`c${i}`))
    const { api, fetchMock } = apiWith((url) => (url.includes('categories') ? ok(many) : ok({ items: [{ id: 'x' }] })))
    expect(await api.listMenu()).toHaveLength(300)
    expect(fetchMock).toHaveBeenCalledTimes(301)
  })
})
