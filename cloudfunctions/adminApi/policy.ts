import { ApiErrorCode } from '../../miniprogram/shared/types/api';
import { SafeApiError } from '../_shared/errors';
import { isPlainRecord } from '../_shared/validation';
import { isStrictUtcInstant } from './time';
import {
  AdminRole,
  type AdminPrincipal,
  type AdminQueue,
  type AdminRequestedScope,
  type ReviewDomain,
} from './model';

export const ADMIN_RBAC_MATRIX = Object.freeze({
  'admin.bootstrap': Object.freeze([
    AdminRole.REVIEWER,
    AdminRole.EVENT_MANAGER,
    AdminRole.CONTENT_MANAGER,
    AdminRole.SUPER_ADMIN,
  ]),
  'review.list': Object.freeze([
    AdminRole.REVIEWER,
    AdminRole.EVENT_MANAGER,
    AdminRole.CONTENT_MANAGER,
    AdminRole.SUPER_ADMIN,
  ]),
  'review.get': Object.freeze([
    AdminRole.REVIEWER,
    AdminRole.EVENT_MANAGER,
    AdminRole.CONTENT_MANAGER,
    AdminRole.SUPER_ADMIN,
  ]),
  'review.approve': Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
  'review.reject': Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
  'review.requestChanges': Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
  'review.revoke': Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
  'organizer.review': Object.freeze([AdminRole.EVENT_MANAGER, AdminRole.SUPER_ADMIN]),
  'event.review': Object.freeze([AdminRole.EVENT_MANAGER, AdminRole.SUPER_ADMIN]),
  'content.review': Object.freeze([AdminRole.CONTENT_MANAGER, AdminRole.SUPER_ADMIN]),
  'report.list': Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
  'report.resolve': Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
  'audit.list': Object.freeze([AdminRole.SUPER_ADMIN]),
} as const);

const QUEUES_BY_ROLE = {
  REVIEWER: ['SOCIAL', 'REPORT'],
  EVENT_MANAGER: ['EVENT', 'ORGANIZER'],
  CONTENT_MANAGER: ['CONTENT'],
  SUPER_ADMIN: ['SOCIAL', 'EVENT', 'CONTENT', 'ORGANIZER', 'REPORT'],
} as const satisfies Readonly<Record<AdminRole, readonly AdminQueue[]>>;

const SCOPES_BY_ROLE = {
  REVIEWER: ['REVIEW'],
  EVENT_MANAGER: ['OPERATIONS'],
  CONTENT_MANAGER: ['OPERATIONS'],
  SUPER_ADMIN: ['REVIEW', 'OPERATIONS', 'AUDIT'],
} as const satisfies Readonly<Record<AdminRole, readonly AdminRequestedScope[]>>;

const ADMIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const ADMIN_PRINCIPAL_FIELDS = Object.freeze([
  'openId', 'userId', 'roles', 'accountState', 'allowlisted', 'expiresAt',
]);

function deny(policy: string): never {
  throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'This administrator is not authorized for the action.', {
    details: { code: ApiErrorCode.FORBIDDEN, policy },
  });
}

export function requireActiveAllowlistedAdmin(
  principal: Readonly<AdminPrincipal> | null,
  evaluatedAt: string,
): AdminPrincipal {
  if (principal === null || principal.allowlisted !== true) deny('ADMIN_ALLOWLIST_REQUIRED');
  if (!isPlainRecord(principal)
      || Object.keys(principal).length !== ADMIN_PRINCIPAL_FIELDS.length
      || Object.keys(principal).some((field) => !ADMIN_PRINCIPAL_FIELDS.includes(field))
      || typeof principal.openId !== 'string'
      || typeof principal.userId !== 'string'
      || !ADMIN_ID_PATTERN.test(principal.openId)
      || !ADMIN_ID_PATTERN.test(principal.userId)
      || !Array.isArray(principal.roles)
      || (principal.accountState !== 'ACTIVE' && principal.accountState !== 'DISABLED')
      || !isStrictUtcInstant(principal.expiresAt)
      || !isStrictUtcInstant(evaluatedAt)) {
    deny('MALFORMED_ADMIN_GRANT');
  }
  if (principal.accountState !== 'ACTIVE') deny('ACTIVE_ADMIN_ACCOUNT_REQUIRED');
  if (Date.parse(principal.expiresAt) <= Date.parse(evaluatedAt)) {
    throw new SafeApiError(ApiErrorCode.SESSION_EXPIRED, 'The administrator session has expired.', {
      details: { code: ApiErrorCode.SESSION_EXPIRED, expiredAt: principal.expiresAt },
    });
  }
  if (principal.roles.length === 0 || principal.roles.some((role) => (
    typeof role !== 'string' || !Object.values(AdminRole).includes(role as AdminRole)
  ))) {
    deny('SERVER_ASSIGNED_ADMIN_ROLE_REQUIRED');
  }
  return Object.freeze({ ...principal, roles: Object.freeze([...new Set(principal.roles)]) });
}

export function requireActionRole(
  principal: Readonly<AdminPrincipal>,
  action: keyof typeof ADMIN_RBAC_MATRIX,
): void {
  const allowed = ADMIN_RBAC_MATRIX[action] as readonly AdminRole[];
  if (!principal.roles.some((role) => allowed.includes(role))) deny('ADMIN_ACTION_DENIED');
}

export function availableQueues(principal: Readonly<AdminPrincipal>): readonly AdminQueue[] {
  const queues = new Set<AdminQueue>();
  principal.roles.forEach((role) => QUEUES_BY_ROLE[role].forEach((queue) => queues.add(queue)));
  return Object.freeze(['SOCIAL', 'EVENT', 'CONTENT', 'ORGANIZER', 'REPORT']
    .filter((queue) => queues.has(queue as AdminQueue)) as AdminQueue[]);
}

export function requireRequestedScope(
  principal: Readonly<AdminPrincipal>,
  requestedScope: AdminRequestedScope,
): void {
  if (!principal.roles.some((role) => (
    SCOPES_BY_ROLE[role] as readonly AdminRequestedScope[]
  ).includes(requestedScope))) {
    deny('ADMIN_SCOPE_DENIED');
  }
}

export function requireDomainAccess(
  principal: Readonly<AdminPrincipal>,
  domain: ReviewDomain,
): void {
  if (!availableQueues(principal).includes(domain)) deny('ADMIN_QUEUE_DENIED');
}

export function domainsForPrincipal(principal: Readonly<AdminPrincipal>): readonly ReviewDomain[] {
  return availableQueues(principal);
}

export function sessionRoles(principal: Readonly<AdminPrincipal>): readonly ('REVIEWER' | 'ADMIN')[] {
  const roles = new Set<'REVIEWER' | 'ADMIN'>();
  principal.roles.forEach((role) => {
    if (role === AdminRole.REVIEWER) roles.add('REVIEWER');
    else roles.add('ADMIN');
  });
  return Object.freeze([...roles]);
}

export function auditActorRole(principal: Readonly<AdminPrincipal>): 'REVIEWER' | 'ADMIN' {
  return principal.roles.some((role) => role !== AdminRole.REVIEWER) ? 'ADMIN' : 'REVIEWER';
}
