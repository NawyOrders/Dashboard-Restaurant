import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHttpApi } from './httpApi'
import { createMockApi } from './mockApi'
import type { InviteStaffInput } from './staff'

const fetchMock = vi.fn<typeof fetch>()
const http = () =>
  createHttpApi({ baseUrl: 'https://api.test/', getAccessToken: () => 'token', fetchImpl: fetchMock, timeoutMs: 1_000 })

function respond(data: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: status, isSuccess: status < 300, data, errors: null }), { status }))
}

const STAFF = '0193a8d0-0000-7000-8000-000000000002'
const ROLE = '3510a7ae-3b17-4bd1-9f0e-4534f2e52c77'
const BRANCH = '0193a8b0-0000-7000-8000-000000000010'

const row = {
  id: STAFF,
  fullName: 'Sara Nabil',
  email: 'sara@demo-restaurant.com',
  phone: '+201112223334',
  roleId: ROLE,
  role: 'BranchManager',
  branchIds: [BRANCH],
  isActive: true,
  status: 'Active',
  mustSetInitialPassword: false,
  activationTokenExpiresAtUtc: null,
  lastLoginAt: '2026-11-25T09:10:00Z',
}

const invite: InviteStaffInput = {
  fullName: 'Omar Tarek',
  email: 'omar@demo-restaurant.com',
  phone: '+201223344556',
  roleId: ROLE,
  branchIds: [BRANCH],
}

beforeEach(() => fetchMock.mockReset())

describe('staff HTTP adapter', () => {
  it('lists with filters on /api/v1/staff (no /admin)', async () => {
    respond({ items: [row], totalCount: 1, page: 1, pageSize: 20, totalPages: 1, hasPreviousPage: false, hasNextPage: false })
    const result = await http().listStaff({ branchId: BRANCH, role: 'BranchManager', search: ' sara ', status: 'Active', pageNumber: 1, pageSize: 20 })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/api/v1/staff')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      branchId: BRANCH,
      role: 'BranchManager',
      search: 'sara',
      status: 'Active',
      pageNumber: '1',
      pageSize: '20',
    })
    expect(result.items[0]).toMatchObject({ fullName: 'Sara Nabil', status: 'Active', branchIds: [BRANCH] })
  })

  it('rejects bad filters and unknown statuses in responses', async () => {
    await expect(http().listStaff({ branchId: 'x' })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().listStaff({ status: 'Gone' as never })).rejects.toMatchObject({ code: 'validation' })
    await expect(http().listStaff({ pageNumber: 0 })).rejects.toMatchObject({ code: 'validation' })
    respond({ items: [{ ...row, status: 'Weird' }] })
    await expect(http().listStaff()).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  it('maps 403 for non-owners', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }))
    await expect(http().listStaff()).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('invites with POST /api/v1/staff/invitations and returns the pending user', async () => {
    respond({ id: STAFF, fullName: 'Omar Tarek', email: invite.email, phone: invite.phone, role: 'OrderStaff', branchIds: [BRANCH], mustSetInitialPassword: true, activationTokenExpiresAtUtc: '2026-11-28T10:51:00Z' })
    const user = await http().inviteStaff(invite)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/api/v1/staff/invitations')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init?.body as string)).toEqual(invite)
    expect(user.mustSetInitialPassword).toBe(true)
    expect(user.status).toBeNull()
  })

  it.each([
    ['short name', { fullName: 'O' }],
    ['long name', { fullName: 'x'.repeat(201) }],
    ['bad email', { email: 'nope' }],
    ['long email', { email: `${'a'.repeat(252)}@x.co` }],
    ['bad phone', { phone: 'abc' }],
    ['bad role id', { roleId: 'owner' }],
    ['no branches', { branchIds: [] }],
    ['duplicate branches', { branchIds: [BRANCH, BRANCH] }],
    ['bad branch id', { branchIds: ['x'] }],
  ])('rejects invite: %s', async (_name, patch) => {
    await expect(http().inviteStaff({ ...invite, ...patch })).rejects.toMatchObject({ code: 'validation' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts an invite without a phone', async () => {
    respond({ id: STAFF, email: invite.email, fullName: 'Omar Tarek', branchIds: [BRANCH] })
    await http().inviteStaff({ ...invite, phone: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps 409 conflicts and 404s', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }))
    await expect(http().inviteStaff(invite)).rejects.toMatchObject({ code: 'conflict' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    await expect(http().inviteStaff(invite)).rejects.toMatchObject({ code: 'notFound' })
  })

  it('resends an invitation with POST', async () => {
    respond(null)
    await http().resendStaffInvitation(STAFF)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/staff/${STAFF}/resend-invitation`)
    expect(init).toMatchObject({ method: 'POST' })
  })

  it('changes the role with PUT { roleId }', async () => {
    respond(null)
    await http().changeStaffRole(STAFF, ROLE)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/staff/${STAFF}/role`)
    expect(init).toMatchObject({ method: 'PUT' })
    expect(JSON.parse(init?.body as string)).toEqual({ roleId: ROLE })
    await expect(http().changeStaffRole(STAFF, 'bad')).rejects.toMatchObject({ code: 'validation' })
  })

  it('deletes with DELETE and maps the owner/self 409', async () => {
    respond(null)
    await http().deleteStaff(STAFF)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`https://api.test/api/v1/staff/${STAFF}`)
    expect(init).toMatchObject({ method: 'DELETE' })
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }))
    await expect(http().deleteStaff(STAFF)).rejects.toMatchObject({ code: 'conflict' })
    await expect(http().deleteStaff('nope')).rejects.toMatchObject({ code: 'validation' })
  })
})

describe('staff mock', () => {
  it('invites, filters, resends, changes role and deletes', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const created = await api.inviteStaff(invite)
    expect(created.status).toBe('PendingInvitation')
    await expect(api.inviteStaff(invite)).rejects.toMatchObject({ code: 'conflict' })
    expect((await api.listStaff({ status: 'PendingInvitation' })).totalCount).toBe(1)
    expect((await api.listStaff({ search: 'omar' })).totalCount).toBe(1)
    await api.resendStaffInvitation(created.id)
    await api.changeStaffRole(created.id, ROLE)
    await api.deleteStaff(created.id)
    await expect(api.deleteStaff(created.id)).rejects.toMatchObject({ code: 'notFound' })
  })

  it('refuses to delete the owner or assign the owner role', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const [owner] = (await api.listStaff()).items
    await expect(api.deleteStaff(owner.id)).rejects.toMatchObject({ code: 'conflict' })
    await expect(api.inviteStaff({ ...invite, roleId: owner.roleId! })).rejects.toMatchObject({ code: 'conflict' })
  })
})
