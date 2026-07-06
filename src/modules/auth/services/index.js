export { authorizeProtectedView, isProtectedView, PROTECTED_VIEW_RULES, getRequiredPermission, hasPermission } from "./authorizationMiddleware";
export { PERMISSION_MODULES, STANDARD_ACTIONS, getAllPermissionDefinitions } from "./permissionCatalog";
export { LEGACY_PERMISSION_MAP, getLegacyPermissionKeys, hasLegacyPermission, derivePermissionsFromLegacyKey, normalizePermissionCode, hasPermission as hasCompatiblePermission, extractPermissionSet, normalizePermissions } from "./legacyPermissionCompatibility";
export { registerUserSession, updateSessionActivity, finalizeUserSession } from "./sessionService";
export { resolveLoginEmail, signInWithPassword, signOutAuthSession, loadUserProfileByAuthUserId, requestPasswordReset, createAuthUserFromAdminFlow } from "./authService";
