import type { Session } from './auth'

export type MockRole = 'Owner' | 'Manager' | 'Staff'

type MockAccount = {
  id: string
  name: string
  email: string
  permissions: string[]
}

export const MOCK_API_ORIGIN = 'mock://local'

// Development-only identities. They are never sent to the tenant API and are
// not a substitute for server-issued roles or backend authorization.
const MOCK_ACCOUNTS: Record<MockRole, MockAccount> = {
  Owner: {
    id: 'mock-owner',
    name: 'Demo Owner',
    email: 'owner@mock.local',
    permissions: ['orders:read', 'orders:write', 'menu:read', 'menu:write', 'reports:read', 'staff:manage', 'settings:manage'],
  },
  Manager: {
    id: 'mock-manager',
    name: 'Demo Manager',
    email: 'manager@mock.local',
    permissions: ['orders:read', 'orders:write', 'menu:read', 'reports:read', 'staff:read'],
  },
  Staff: {
    id: 'mock-staff',
    name: 'Demo Staff',
    email: 'staff@mock.local',
    permissions: ['orders:read', 'orders:write'],
  },
}

export function createMockSession(role: MockRole): Session {
  if (!import.meta.env.DEV) {
    throw new Error('Demo sessions are available in development builds only.')
  }
  const account = MOCK_ACCOUNTS[role]
  // Match the tenant API role names (Manager is issued as BranchManager).
  const serverRole = role === 'Manager' ? 'BranchManager' : role
  return {
    apiOrigin: MOCK_API_ORIGIN,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      roles: [serverRole],
      permissions: [...account.permissions],
    },
    accessToken: `mock.${role.toLowerCase()}.access-token`,
    refreshToken: null,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }
}
