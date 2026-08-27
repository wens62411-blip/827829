import type { CloudAction } from '../../miniprogram/shared/contracts';
import type { ApiResult } from '../../miniprogram/shared/types/api';
import type { RequestId } from '../../miniprogram/shared/types/primitives';
import { safeFailureFromError } from '../_shared/errors';
import { createNotImplementedEndpoint } from '../_shared/errors/envelope';
import { isPlainRecord, isValidRequestId, validateCallEnvelope } from '../_shared/validation';
import AdminModel = require('./model');
import AdminPolicy = require('./policy');
import AdminService = require('./service');
import AdminValidation = require('./validation');

export const ACTIONS = [
  'admin.bootstrap', 'review.list', 'review.get', 'review.approve', 'review.reject',
  'review.requestChanges', 'review.revoke', 'organizer.review', 'event.review',
  'content.review', 'report.list', 'report.resolve', 'audit.list',
] as const satisfies readonly CloudAction[];

export type AdminAction = (typeof ACTIONS)[number];

export interface ConfiguredAdminEndpoint {
  readonly actions: typeof ACTIONS;
  readonly writeGuardPlans: typeof fallbackEndpoint.writeGuardPlans;
  readonly main: (
    event: unknown,
    context?: Readonly<Record<string, unknown>>,
  ) => Promise<ApiResult<Readonly<Record<string, unknown>>>>;
}

function responseRequestId(event: unknown): RequestId {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId as RequestId;
  return 'srv_admin_invalid_request' as RequestId;
}

const fallbackEndpoint = createNotImplementedEndpoint('adminApi', ACTIONS);

/**
 * Builds the implemented endpoint around trusted server-only dependencies.
 *
 * The exported default `main` remains the frozen NOT_IMPLEMENTED endpoint
 * until final integration binds a CloudBase repository and WX context. Tests
 * use an explicitly named TEST_FIXTURE adapter; production never falls back to
 * fixture data.
 */
export function createAdminEndpoint(
  dependencies: Readonly<AdminModel.AdminApiDependencies>,
): Readonly<ConfiguredAdminEndpoint> {
  const main: ConfiguredAdminEndpoint['main'] = async (event) => {
    const fallbackRequestId = responseRequestId(event);
    try {
      const request = validateCallEnvelope(event, ACTIONS);
      const payload = AdminValidation.validateAdminPayload(request.action, request.payload);
      const data = await AdminService.executeAdminAction(
        dependencies,
        request.action,
        request.requestId as RequestId,
        payload,
      );
      return { ok: true, data, requestId: request.requestId as RequestId };
    } catch (error) {
      return safeFailureFromError(
        fallbackRequestId,
        error instanceof Error ? error : new Error('Non-error thrown at adminApi boundary'),
      );
    }
  };

  return Object.freeze({
    actions: ACTIONS,
    writeGuardPlans: fallbackEndpoint.writeGuardPlans,
    main,
  });
}

export const endpoint = fallbackEndpoint;
export const main = endpoint.main;

export const AdminRole = AdminModel.AdminRole;
export const ADMIN_RBAC_MATRIX = AdminPolicy.ADMIN_RBAC_MATRIX;
export const AI_AUTOMATION_DISABLED = AdminService.AI_AUTOMATION_DISABLED;
export const assertApprovedDataMayProject = AdminService.assertApprovedDataMayProject;
export const auditActorRole = AdminPolicy.auditActorRole;
export const auditApprovedData = AdminService.auditApprovedData;
export const availableQueues = AdminPolicy.availableQueues;
export const domainsForPrincipal = AdminPolicy.domainsForPrincipal;
export const executeAdminAction = AdminService.executeAdminAction;
export const invalidationUpdatesEveryViewer = AdminService.invalidationUpdatesEveryViewer;
export const redactAuditEntry = AdminService.redactAuditEntry;
export const redactReportForList = AdminService.redactReportForList;
export const redactReviewCaseForList = AdminService.redactReviewCaseForList;
export const requireActionRole = AdminPolicy.requireActionRole;
export const requireActiveAllowlistedAdmin = AdminPolicy.requireActiveAllowlistedAdmin;
export const requireDomainAccess = AdminPolicy.requireDomainAccess;
export const requireRequestedScope = AdminPolicy.requireRequestedScope;
export const sessionRoles = AdminPolicy.sessionRoles;

export type AdminApiDependencies = AdminModel.AdminApiDependencies;
export type AdminRole = AdminModel.AdminRole;
export type AdminPrincipal = AdminModel.AdminPrincipal;
export type AdminRepository = AdminModel.AdminRepository;
export type AdminTransaction = AdminModel.AdminTransaction;
export type AdminMutationCommand = AdminModel.AdminMutationCommand;
export type AdminMutationResult = AdminModel.AdminMutationResult;
export type AdminReviewLogRecord = AdminModel.AdminReviewLogRecord;
export type ApprovedDataAuditInput = AdminModel.ApprovedDataAuditInput;
export type ApprovedDataAuditResult = AdminModel.ApprovedDataAuditResult;
