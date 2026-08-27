import type { CloudAction, CloudActionPayload } from '../../shared/contracts';
import type { CityId } from '../../shared/constants/geography';
import { callCloudAction } from '../../shared/services/cloud-client';
import type {
ApiResult,
EventId,
IdempotencyKey,
OptimisticVersion,
OrganizerId,
PaginationCursor,
ReportId,
ReviewCaseId,
StableId,
} from '../../shared/types';
import { createRequestId } from '../../shared/utils/request-id';
import type { AdminQueue, AdminScope } from './admin-types';

const CONTRACT_VERSION = '1.0.0' as const;

async function invoke<Action extends CloudAction>(
action: Action,
payload: CloudActionPayload<Action>,
): Promise<ApiResult<import('../../shared/contracts').CloudActionData<Action>>> {
const requestId = createRequestId();
const evidence = await callCloudAction(action, requestId, payload);
return evidence.apiResult;
}

export function createAdminIdempotencyKey(): IdempotencyKey {
return `idem_${createRequestId()}` as IdempotencyKey;
}

export function bootstrapAdmin(requestedScope: AdminScope) {
return invoke('admin.bootstrap', { contractVersion: CONTRACT_VERSION, requestedScope });
}

export function listReviewCases(
domain: Exclude<AdminQueue, 'REPORT'>,
cursor?: PaginationCursor,
) {
const page = cursor === undefined ? { limit: 20 } : { cursor, limit: 20 };
return invoke('review.list', {
contractVersion: CONTRACT_VERSION,
domain,
...page,
});
}

export function getReviewCase(reviewCaseId: ReviewCaseId) {
return invoke('review.get', { contractVersion: CONTRACT_VERSION, reviewCaseId });
}

export function approveReviewCase(
reviewCaseId: ReviewCaseId,
version: OptimisticVersion,
decisionNote: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('review.approve', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
decisionNote,
expectedVersion: version,
idempotencyKey,
});
}

export function rejectReviewCase(
reviewCaseId: ReviewCaseId,
version: OptimisticVersion,
reasonCode: string,
decisionNote: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('review.reject', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
reasonCode,
decisionNote,
expectedVersion: version,
idempotencyKey,
});
}

export function requestReviewChanges(
reviewCaseId: ReviewCaseId,
version: OptimisticVersion,
requiredChanges: readonly string[],
idempotencyKey: IdempotencyKey,
) {
return invoke('review.requestChanges', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
requiredChanges,
expectedVersion: version,
idempotencyKey,
});
}

export function revokeReviewCase(
reviewCaseId: ReviewCaseId,
version: OptimisticVersion,
reasonCode: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('review.revoke', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
reasonCode,
expectedVersion: version,
idempotencyKey,
});
}

export function reviewOrganizer(
reviewCaseId: ReviewCaseId,
organizerId: StableId,
version: OptimisticVersion,
decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
note: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('organizer.review', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
organizerId: organizerId as OrganizerId,
decision,
note,
expectedVersion: version,
idempotencyKey,
});
}

export function reviewEvent(
reviewCaseId: ReviewCaseId,
eventId: StableId,
version: OptimisticVersion,
decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL',
note: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('event.review', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
eventId: eventId as EventId,
decision,
note,
expectedVersion: version,
idempotencyKey,
});
}

export function reviewContent(
reviewCaseId: ReviewCaseId,
contentId: StableId,
version: OptimisticVersion,
decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH',
note: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('content.review', {
contractVersion: CONTRACT_VERSION,
reviewCaseId,
contentId: contentId as StableId<'content'>,
decision,
note,
expectedVersion: version,
idempotencyKey,
});
}

export function listReports(cursor?: PaginationCursor) {
const page = cursor === undefined ? { limit: 20 } : { cursor, limit: 20 };
return invoke('report.list', {
contractVersion: CONTRACT_VERSION,
status: 'OPEN',
...page,
});
}

export function resolveReport(
reportId: ReportId,
version: OptimisticVersion,
resolution: 'ACTION_TAKEN' | 'DISMISSED',
note: string,
idempotencyKey: IdempotencyKey,
) {
return invoke('report.resolve', {
contractVersion: CONTRACT_VERSION,
reportId,
resolution,
note,
expectedVersion: version,
idempotencyKey,
});
}

export function listAuditEntries(cursor?: PaginationCursor) {
const page = cursor === undefined ? { limit: 30 } : { cursor, limit: 30 };
return invoke('audit.list', {
contractVersion: CONTRACT_VERSION,
...page,
});
}

export function listCities() {
return invoke('geo.listCities', { contractVersion: CONTRACT_VERSION });
}

export function getClubNode(cityId: CityId) {
return invoke('geo.getNode', { contractVersion: CONTRACT_VERSION, cityId });
}

export function getPaymentCapability() {
return invoke('payment.getCapability', { contractVersion: CONTRACT_VERSION });
}
