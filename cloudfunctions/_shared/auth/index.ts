import { ApiErrorCode } from '../../../miniprogram/shared/types/api';
import type { StableId, UserId } from '../../../miniprogram/shared/types/primitives';
import { SafeApiError } from '../errors';

export type ServerRole = 'MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN';

export interface TrustedWxContext {
  readonly OPENID?: string;
  readonly APPID?: string;
  readonly UNIONID?: string;
}

export interface TrustedPrincipal {
  readonly openId: string;
  readonly userId?: UserId;
  readonly roles: readonly ServerRole[];
  readonly accountState: 'ACTIVE' | 'DISABLED';
}

export type WxContextProvider = () => TrustedWxContext;
export type PrincipalLoader = (openId: string) => Promise<TrustedPrincipal | null>;

const OPENID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * OPENID is deliberately accepted only from an injected server runtime provider.
 * Event payload fields such as `openid`, `_openid`, `userId`, and `roles` are ignored.
 */
export function requireTrustedOpenId(getWxContext: WxContextProvider): string {
  if (typeof getWxContext !== 'function') {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'Authentication is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
  const openId = getWxContext().OPENID;
  if (typeof openId !== 'string' || !OPENID_PATTERN.test(openId)) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'Authentication is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
  return openId;
}

export async function requireTrustedPrincipal(
  getWxContext: WxContextProvider,
  loadPrincipal: PrincipalLoader,
): Promise<TrustedPrincipal> {
  const openId = requireTrustedOpenId(getWxContext);
  const principal = await loadPrincipal(openId);
  if (principal === null || principal.openId !== openId) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'Authentication is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
  if (principal.accountState !== 'ACTIVE') {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'This account cannot perform the action.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'ACTIVE_ACCOUNT_REQUIRED' },
    });
  }
  return Object.freeze({ ...principal, roles: Object.freeze([...principal.roles]) });
}

export function asUserId(value: string): UserId {
  return value as StableId<'user'>;
}
