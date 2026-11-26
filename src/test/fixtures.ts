// Synthetic contract fixtures: never used by the application or sent to a server.
export function staffLoginResponse(role = 'Owner', expiresIn = 3600) {
  return {
    statusCode: 200,
    isSuccess: true,
    data: {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'staff@example.test',
      fullName: 'Test operator',
      roles: [role],
      permissions: ['Orders.Read'],
      accessToken: 'test-access-token-not-a-real-jwt',
      tokenType: 'Bearer',
      expiresIn,
      expiresAtUtc: new Date(Date.now() + expiresIn * 1000).toISOString(),
      refreshToken: 'test-refresh-token',
    },
    errors: null,
    timestamp: new Date().toISOString(),
  }
}

// Synthetic rotated-token response for refresh tests.
export function staffRefreshResponse(expiresIn = 3600) {
  return {
    statusCode: 200,
    isSuccess: true,
    data: {
      accessToken: 'test-access-token-rotated',
      tokenType: 'Bearer',
      expiresIn,
      expiresAtUtc: new Date(Date.now() + expiresIn * 1000).toISOString(),
      refreshToken: 'test-refresh-token-rotated',
    },
    errors: null,
    timestamp: new Date().toISOString(),
  }
}
