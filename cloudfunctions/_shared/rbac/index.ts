import { ApiErrorCode } from '../../../miniprogram/shared/types/api';
import type { UserId } from '../../../miniprogram/shared/types/primitives';
import type { ServerRole, TrustedPrincipal } from '../auth';
import { SafeApiError } from '../errors';

export function requireAnyRole(
  principal: TrustedPrincipal,
  allowedRoles: readonly Exclude<ServerRole, 'MEMBER'>[],
): void {
  if (!principal.roles.some((role) => allowedRoles.includes(role as Exclude<ServerRole, 'MEMBER'>))) {
    throw new SafeApiError(ApiErrorCode.ROLE_REQUIRED, 'A server-assigned role is required.', {
      details: { code: ApiErrorCode.ROLE_REQUIRED, requiredRoles: allowedRoles },
    });
  }
}

export function requireObjectOwner(
  principal: TrustedPrincipal,
  ownerUserId: UserId,
  policy = 'OBJECT_OWNER_REQUIRED',
): void {
  if (principal.userId === undefined || principal.userId !== ownerUserId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The resource is not owned by this account.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy },
    });
  }
}

export function requireSelfOrRole(
  principal: TrustedPrincipal,
  ownerUserId: UserId,
  elevatedRoles: readonly Exclude<ServerRole, 'MEMBER'>[],
): void {
  if (principal.userId === ownerUserId) return;
  requireAnyRole(principal, elevatedRoles);
}
