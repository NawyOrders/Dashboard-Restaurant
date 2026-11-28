import { describe, expect, it } from 'vitest'
import { ApiError } from './types'
import { isUuid, parsePaged, requireId, validatePaging } from './shared'

/**
 * Every list endpoint answers through parsePaged, and every by-id endpoint
 * through requireId. These helpers are the last thing between a malformed
 * response and the screens, so the cases below pin the refusals as well as the
 * happy path: a page of orders that renders as empty when the API actually
 * failed is worse than an error the staff can see.
 */

const id = '3f1d1c2b-4a5e-4c6d-8e7f-9012345678ab'

describe('isUuid', () => {
  it('accepts a canonical uuid in either case', () => {
    expect(isUuid(id)).toBe(true)
    expect(isUuid(id.toUpperCase())).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isUuid('')).toBe(false)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('3f1d1c2b4a5e4c6d8e7f9012345678ab')).toBe(false)
    expect(isUuid('3f1d1c2b-4a5e-4c6d-8e7f-9012345678abc')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(42)).toBe(false)
    expect(isUuid({ id })).toBe(false)
  })
})

describe('requireId', () => {
  it('returns a valid id unchanged', () => {
    expect(requireId(id)).toBe(id)
  })

  it('refuses to build a request around an id the API cannot accept', () => {
    expect(() => requireId('../orders')).toThrow(ApiError)
    expect(() => requireId('')).toThrow(ApiError)
    try {
      requireId('nope')
    } catch (error) {
      expect((error as ApiError).code).toBe('validation')
    }
  })
})

describe('validatePaging', () => {
  it('accepts the documented window', () => {
    expect(() => validatePaging()).not.toThrow()
    expect(() => validatePaging(1, 1)).not.toThrow()
    expect(() => validatePaging(3, 100)).not.toThrow()
  })

  it('refuses a page or size the API would reject', () => {
    for (const [page, size] of [
      [0, 20],
      [-1, 20],
      [1.5, 20],
      [1, 0],
      [1, 101],
      [1, 20.5],
      [Number.NaN, 20],
    ] as const) {
      expect(() => validatePaging(page, size)).toThrow(ApiError)
    }
  })
})

describe('parsePaged', () => {
  const parseItem = (value: unknown) => value as { id: string }

  it('reads the envelope the API sends', () => {
    const page = parsePaged(
      {
        items: [{ id: 'a' }, { id: 'b' }],
        totalCount: 42,
        page: 2,
        pageSize: 20,
        totalPages: 3,
        hasPreviousPage: true,
        hasNextPage: true,
      },
      parseItem,
    )
    expect(page.items).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(page.totalCount).toBe(42)
    expect(page.page).toBe(2)
    expect(page.pageSize).toBe(20)
    expect(page.totalPages).toBe(3)
    expect(page.hasPreviousPage).toBe(true)
    expect(page.hasNextPage).toBe(true)
  })

  it('fills sensible defaults when the envelope leaves fields out', () => {
    const page = parsePaged({ items: [{ id: 'a' }] }, parseItem)
    expect(page.totalCount).toBe(1)
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(1)
    expect(page.totalPages).toBe(1)
    expect(page.hasPreviousPage).toBe(false)
    expect(page.hasNextPage).toBe(false)
  })

  it('treats a missing items array as an empty page', () => {
    const page = parsePaged({ totalCount: 0 }, parseItem)
    expect(page.items).toEqual([])
    expect(page.totalCount).toBe(0)
  })

  it('refuses a body that is not an envelope', () => {
    for (const body of [null, undefined, 'text', 42, [], [{ id: 'a' }]]) {
      expect(() => parsePaged(body, parseItem)).toThrow(ApiError)
    }
  })

  it('refuses items that are not a list', () => {
    expect(() => parsePaged({ items: { id: 'a' } }, parseItem)).toThrow(ApiError)
  })

  it('refuses to trust a total that is not a number', () => {
    const page = parsePaged({ items: [{ id: 'a' }, { id: 'b' }], totalCount: 'many' }, parseItem)
    expect(page.totalCount).toBe(2)
  })

  it('ignores truthy strings where a boolean flag belongs', () => {
    const page = parsePaged({ items: [], hasNextPage: 'true', hasPreviousPage: 1 }, parseItem)
    expect(page.hasNextPage).toBe(false)
    expect(page.hasPreviousPage).toBe(false)
  })
})
