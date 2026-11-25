import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const ROLE = '0193a8e0-0000-7000-8000-000000000001'
const role = {
  id: ROLE,
  name: 'Cashier',
  description: 'Handles payments',
  kind: 'Custom',
  isProtected: false,
  canBeDeleted: true,
  staffCount: 0,
  permissionKeys: ['orders.view', 'payments.view'],
}

beforeEach(() => fetchMock.mockReset())

describe('roles HTTP adapter', () => {
  it('lists the permission catalog', async () => {
    respond([{ key: 'orders.view', module: 'orders', description: 'View orders' }])
    const result = await http().listPermissions()
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.test/api/v1/admin/permissions')
    expect(result).toEqual([{ key: 'orders.view', module: 'orders', description: 'View orders' }])
  })

  it('lists roles as a plain array and rejects other shapes', async () => {
    respond([role])
    const result = await http().listRoles()
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.test/api/v1/admin/roles')
    expect(result[0]).toMatchObject({ name: 'Cashier', kind: 'Custom', canBeDeleted: true })
    respond({ items: [] })
    await expect(http().listRoles()).rejects.toMatchObject({ code: 'invalidResponse' })
    respond([{ ...role, kind: 'Weird' }])
    await expect(http().listRoles()).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('gets a role and maps 404', async () => {
    respond(role)
    expect((await http().getRole(ROLE)).id).toBe(ROLE)
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    await expect(http().getRole(ROLE)).rejects.toMatchObject({ code: 'notFound' })
    await expect(http().getRole('x')).rejects.toMatchObject({ code: 'validation' })
  })

  it('creates with POST', async () => {
    respond(role, 201)
    const input = { name: 'Cashier', description: 'Handles payments', permissionKeys: ['orders.view'] }
    await http().createRole(input)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/admin/roles')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual(input)
  })

  it.each([
    [{ name: '', permissionKeys: [] }],
    [{ name: 'x'.repeat(101), permissionKeys: [] }],
    [{ name: 'ok', description: 'x'.repeat(501), permissionKeys: [] }],
    [{ name: 'ok', permissionKeys: ['orders.view', 'orders.view'] }],
    [{ name: 'ok', permissionKeys: [''] }],
  ])('rejects create %#', async (input) => {
    await expect(http().createRole(input)).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps 409 duplicate names and 422 unknown keys', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }))
    await expect(http().createRole({ name: 'Cashier', permissionKeys: [] })).rejects.toMatchObject({ code: 'conflict' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }))
    await expect(http().createRole({ name: 'Cashier', permissionKeys: ['nope.nope'] })).rejects.toMatchObject({ code: 'validation' })
  })

  it('updates metadata with PATCH', async () => {
    respond({ ...role, name: 'Senior Cashier' })
    await http().updateRole(ROLE, { name: 'Senior Cashier', description: null })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/roles/${ROLE}`)
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(init?.body as string)).toEqual({ name: 'Senior Cashier', description: null })
    await expect(http().updateRole(ROLE, { name: ' ' })).rejects.toMatchObject({ code: 'validation' })
  })

  it('replaces permissions with PUT', async () => {
    respond(null)
    await http().replaceRolePermissions(ROLE, ['orders.view', 'payments.view'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/admin/roles/${ROLE}/permissions`)
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init?.body as string)).toEqual({ permissionKeys: ['orders.view', 'payments.view'] })
  })

  it('allows replacing with an empty permission set', async () => {
    respond(null)
    await http().replaceRolePermissions(ROLE, [])
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ permissionKeys: [] })
  })

  it('deletes with DELETE and maps the protected-role 409', async () => {
    respond(null)
    await http().deleteRole(ROLE)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }))
    await expect(http().deleteRole(ROLE)).rejects.toMatchObject({ code: 'conflict' })
  })
})

describe('roles mock', () => {
  it('protects the owner and seeded roles and runs the custom lifecycle', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const [owner, seeded] = await api.listRoles()
    await expect(api.updateRole(owner.id, { name: 'Owner' })).rejects.toMatchObject({ code: 'conflict' })
    await expect(api.updateRole(seeded.id, { name: 'Renamed' })).rejects.toMatchObject({ code: 'conflict' })
    await expect(api.replaceRolePermissions(owner.id, [])).rejects.toMatchObject({ code: 'conflict' })
    await expect(api.deleteRole(seeded.id)).rejects.toMatchObject({ code: 'conflict' })

    const created = await api.createRole({ name: 'Cashier', permissionKeys: ['orders.view'] })
    await expect(api.createRole({ name: 'cashier', permissionKeys: [] })).rejects.toMatchObject({ code: 'conflict' })
    await expect(api.createRole({ name: 'Bad', permissionKeys: ['nope'] })).rejects.toMatchObject({ code: 'validation' })
    await api.replaceRolePermissions(created.id, ['orders.view', 'payments.view'])
    expect((await api.getRole(created.id)).permissionKeys).toHaveLength(2)
    expect((await api.updateRole(created.id, { name: 'Senior Cashier' })).name).toBe('Senior Cashier')
    await api.deleteRole(created.id)
    await expect(api.getRole(created.id)).rejects.toMatchObject({ code: 'notFound' })
  })

  it('lists all 24 permissions', async () => {
    expect(await createMockApi({ latencyMs: 0 }).listPermissions()).toHaveLength(24)
  })
})
