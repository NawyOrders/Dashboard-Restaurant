import { describe, expect, it } from 'vitest'
import { createMockSession, MOCK_API_ORIGIN } from './mockAuth'

describe('createMockSession', () => {
  it.each(['Owner', 'Manager', 'Staff'] as const)('creates a %s session with the expected shape', (role) => {
    const session = createMockSession(role)
    const serverRole = role === 'Manager' ? 'BranchManager' : role

    expect(session.apiOrigin).toBe(MOCK_API_ORIGIN)
    expect(session.user.roles).toEqual([serverRole])
    expect(session.user.permissions.length).toBeGreaterThan(0)
    expect(session.refreshToken).toBeNull()
    expect(session.expiresAt).toBeGreaterThan(Date.now())
    expect(session.accessToken).toContain('mock.')
  })

  it('uses a distinct identity for each role', () => {
    const ids = (['Owner', 'Manager', 'Staff'] as const).map((role) => createMockSession(role).user.id)
    expect(new Set(ids).size).toBe(3)
  })
})
