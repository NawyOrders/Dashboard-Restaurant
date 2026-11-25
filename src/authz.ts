// RBAC permission keys from the API reference (section 5, RBAC Roles &
// Permissions Matrix). The login response carries them on Session.user.permissions
// and the backend enforces them on every endpoint; this module only gates which
// actions the UI offers so staff never see buttons that would fail with 403.
export const PERMISSIONS = {
  ordersView: 'orders.view',
  ordersReceive: 'orders.receive',
  ordersAccept: 'orders.accept',
  ordersReject: 'orders.reject',
  ordersStatusUpdate: 'orders.status.update',
  ordersCancel: 'orders.cancel',
  paymentsView: 'payments.view',
  paymentsProofConfirm: 'payments.proof.confirm',
  paymentsProofReject: 'payments.proof.reject',
  menuView: 'menu.view',
  menuEdit: 'menu.edit',
  menuAvailability: 'menu.availability',
  offersView: 'offers.view',
  offersManage: 'offers.manage',
  staffView: 'staff.view',
  staffManage: 'staff.manage',
  branchesView: 'branches.view',
  branchesManage: 'branches.manage',
  restaurantSettingsView: 'restaurant.settings.view',
  restaurantSettingsManage: 'restaurant.settings.manage',
  reportsFinancialView: 'reports.financial.view',
  reportsBranchView: 'reports.branch.view',
  reportsOperationalView: 'reports.operational.view',
  auditView: 'audit.view',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** True when the session's permission list contains the key. */
export function can(permissions: readonly string[] | null | undefined, key: PermissionKey): boolean {
  return Array.isArray(permissions) && permissions.includes(key)
}

/** True when the session holds at least one of the keys. */
export function canAny(permissions: readonly string[] | null | undefined, ...keys: PermissionKey[]): boolean {
  return keys.some((key) => can(permissions, key))
}
