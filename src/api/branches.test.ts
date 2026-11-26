import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'
import { DAYS_OF_WEEK, type BranchWorkingHour, type CreateBranchInput } from './branches'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const ID = '0193a8b0-0000-7000-8000-000000000010'
const week = (patch: Partial<BranchWorkingHour> = {}): BranchWorkingHour[] =>
  DAYS_OF_WEEK.map((dayOfWeek) => ({ dayOfWeek, isClosed: false, openTime: '10:00:00', closeTime: '23:59:00', closesNextDay: false, ...patch }))

const branchRow = {
  id: ID,
  nameAr: 'فرع المعادي',
  nameEn: 'Maadi Branch',
  address: '15 Street 9, Maadi, Cairo',
  latitude: 29.9602,
  longitude: 31.2569,
  phone: '+20223581234',
  status: 'Open',
  isActive: true,
  isPrimary: true,
  sortOrder: 0,
  workingHours: week({ openTime: '10:00:00', closeTime: '02:00:00', closesNextDay: true }),
}

const createInput: CreateBranchInput = {
  nameAr: 'فرع التجمع',
  nameEn: 'New Cairo Branch',
  address: 'Point 90 Mall, Cairo',
  latitude: 30.0205,
  longitude: 31.4945,
  workingHours: week(),
}

beforeEach(() => fetchMock.mockReset())

describe('branches HTTP adapter', () => {
  it('lists with paging', async () => {
    respond({ items: [branchRow], totalCount: 1, page: 1, pageSize: 20, totalPages: 1, hasPreviousPage: false, hasNextPage: false })
    const result = await http().listBranches({ pageNumber: 1, pageSize: 20 })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/api/v1/admin/branches')
    expect(url.searchParams.get('pageSize')).toBe('20')
    expect(result.items[0].workingHours).toHaveLength(7)
    expect(result.items[0].workingHours[0].closesNextDay).toBe(true)
  })

  it('rejects bad paging and unknown status values', async () => {
    await expect(http().listBranches({ pageSize: 0 })).rejects.toMatchObject({ code: 'validation' })
    respond({ ...branchRow, status: 'Weird' })
    await expect(http().getBranch(ID)).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('gets a branch by id and maps 404', async () => {
    respond(branchRow)
    expect((await http().getBranch(ID)).nameEn).toBe('Maadi Branch')
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://api.test/api/v1/admin/branches/${ID}`)
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    await expect(http().getBranch(ID)).rejects.toMatchObject({ code: 'notFound' })
    await expect(http().getBranch('x')).rejects.toMatchObject({ code: 'validation' })
  })

  it('creates with POST and sends the body as given', async () => {
    respond(branchRow, 201)
    await http().createBranch(createInput)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/branches')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual(createInput)
  })

  it.each([
    ['6 days only', { workingHours: week().slice(0, 6) }],
    ['duplicate day', { workingHours: [...week().slice(0, 6), week()[0]] }],
    ['closed day with times', { workingHours: week().map((h, i) => (i === 0 ? { ...h, isClosed: true } : h)) }],
    ['open without times', { workingHours: week().map((h, i) => (i === 0 ? { ...h, openTime: null } : h)) }],
    ['close before open', { workingHours: week({ closeTime: '09:00:00' }) }],
    ['bad time format', { workingHours: week({ openTime: '25:00' }) }],
    ['latitude out of range', { latitude: 91 }],
    ['longitude out of range', { longitude: -181 }],
    ['empty name', { nameEn: '  ' }],
    ['name too long', { nameAr: 'x'.repeat(201) }],
    ['empty address', { address: '' }],
    ['bad status', { status: 'Closed' as never }],
    ['negative sort order', { sortOrder: -1 }],
  ])('rejects create: %s', async (_name, patch) => {
    await expect(http().createBranch({ ...createInput, ...patch })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts overnight hours and HH:mm times', async () => {
    respond(branchRow, 201)
    await http().createBranch({ ...createInput, workingHours: week({ openTime: '18:00', closeTime: '02:00', closesNextDay: true }) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('patches with only the supplied fields and 1 to 7 days', async () => {
    respond({ ...branchRow, status: 'TemporarilyClosed' })
    const patch = {
      status: 'TemporarilyClosed' as const,
      workingHours: [{ dayOfWeek: 'Friday' as const, isClosed: true, openTime: null, closeTime: null, closesNextDay: false }],
    }
    await http().updateBranch(ID, patch)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/branches/${ID}`)
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(init?.body as string)).toEqual(patch)
  })

  it('rejects invalid patches', async () => {
    await expect(http().updateBranch(ID, { workingHours: [] })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().updateBranch(ID, { workingHours: [week()[0], week()[0]] })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().updateBranch(ID, { nameEn: '' })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().updateBranch(ID, { sortOrder: -2 })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps 403 on writes', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }))
    await expect(http().createBranch(createInput)).rejects.toMatchObject({ code: 'forbidden' })
  })
})

describe('delivery settings HTTP adapter', () => {
  it('reads settings with GET', async () => {
    respond({ baseDeliveryFee: 20, deliveryFeePerKm: 4.5, maxDeliveryRadiusKm: null })
    expect(await http().getDeliverySettings()).toEqual({ baseDeliveryFee: 20, deliveryFeePerKm: 4.5, maxDeliveryRadiusKm: null })
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.test/api/v1/admin/delivery-settings')
  })

  it('updates with PUT', async () => {
    respond({ baseDeliveryFee: 25, deliveryFeePerKm: 5, maxDeliveryRadiusKm: 12.5 })
    await http().updateDeliverySettings({ baseDeliveryFee: 25, deliveryFeePerKm: 5, maxDeliveryRadiusKm: 12.5 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/delivery-settings')
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init?.body as string)).toEqual({ baseDeliveryFee: 25, deliveryFeePerKm: 5, maxDeliveryRadiusKm: 12.5 })
  })

  it.each([
    [{ baseDeliveryFee: -1, deliveryFeePerKm: 1, maxDeliveryRadiusKm: null }],
    [{ baseDeliveryFee: 1, deliveryFeePerKm: -1, maxDeliveryRadiusKm: null }],
    [{ baseDeliveryFee: 1, deliveryFeePerKm: 1, maxDeliveryRadiusKm: 0 }],
    [{ baseDeliveryFee: 1, deliveryFeePerKm: 1, maxDeliveryRadiusKm: 10000 }],
  ])('rejects invalid settings %#', async (input) => {
    await expect(http().updateDeliverySettings(input)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts a radius of exactly 9999.99 and zero fees', async () => {
    respond({ baseDeliveryFee: 0, deliveryFeePerKm: 0, maxDeliveryRadiusKm: 9999.99 })
    await http().updateDeliverySettings({ baseDeliveryFee: 0, deliveryFeePerKm: 0, maxDeliveryRadiusKm: 9999.99 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a response without fees', async () => {
    respond({})
    await expect(http().getDeliverySettings()).rejects.toMatchObject({ code: 'invalidResponse' })
  })
})

describe('branches mock', () => {
  it('creates, patches only the supplied days and lists', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const created = await api.createBranch({ ...createInput, sortOrder: 5 })
    const updated = await api.updateBranch(created.id, {
      status: 'TemporarilyClosed',
      workingHours: [{ dayOfWeek: 'Friday', isClosed: true, openTime: null, closeTime: null, closesNextDay: false }],
    })
    expect(updated.status).toBe('TemporarilyClosed')
    expect(updated.workingHours.find((h) => h.dayOfWeek === 'Friday')?.isClosed).toBe(true)
    expect(updated.workingHours.find((h) => h.dayOfWeek === 'Sunday')?.isClosed).toBe(false)
    const list = await api.listBranches()
    expect(list.totalCount).toBe(2)
    expect(list.items[1].id).toBe(created.id)
    await expect(api.getBranch('00000000-0000-7000-8000-00000000ffff')).rejects.toMatchObject({ code: 'notFound' })
  })

  it('stores delivery settings', async () => {
    const api = createMockApi({ latencyMs: 0 })
    await api.updateDeliverySettings({ baseDeliveryFee: 30, deliveryFeePerKm: 2, maxDeliveryRadiusKm: null })
    expect(await api.getDeliverySettings()).toEqual({ baseDeliveryFee: 30, deliveryFeePerKm: 2, maxDeliveryRadiusKm: null })
  })
})
