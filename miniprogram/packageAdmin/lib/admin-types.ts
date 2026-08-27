import type {
OptimisticVersion,
PaginationCursor,
ReportId,
ReviewCaseId,
StableId,
} from '../../shared/types/primitives';

export type AdminScope = 'REVIEW' | 'OPERATIONS' | 'AUDIT';
export type AdminQueue = 'SOCIAL' | 'EVENT' | 'CONTENT' | 'ORGANIZER' | 'REPORT';
export type AdminGateState = 'CHECKING' | 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE';

export interface AdminQueueItemView {
readonly handle: string;
readonly domain: AdminQueue;
readonly eyebrow: string;
readonly title: string;
readonly summary: string;
readonly status: string;
readonly updatedAt: string;
readonly meta: string;
}

export interface AdminCaseDetailView {
readonly handle: string;
readonly eyebrow: string;
readonly title: string;
readonly summary: string;
readonly status: string;
readonly updatedAt: string;
readonly metaLines: readonly string[];
readonly evidenceLines: readonly string[];
readonly materialNotice: string;
}

export interface AdminCaseActionView {
readonly id: string;
readonly label: string;
readonly tone: 'primary' | 'warning' | 'danger' | 'neutral';
}

export interface AdminAuditEntryView {
readonly id: string;
readonly action: string;
readonly actor: string;
readonly actorRole: string;
readonly target: string;
readonly request: string;
readonly occurredAt: string;
readonly result: string;
readonly reason: string;
}

export interface AdminCityView {
readonly handle: string;
readonly cityName: string;
readonly countryName: string;
readonly operationalState: string;
readonly timezone: string;
}

export interface AdminNodeView {
readonly cityName: string;
readonly nodeName: string;
readonly operationalState: string;
readonly organizerName: string;
}

export interface PaymentUiState {
readonly checked: boolean;
readonly enabled: boolean;
readonly reason: string;
}

export interface ReviewCaseSecret {
readonly kind: 'REVIEW_CASE';
readonly reviewCaseId: ReviewCaseId;
readonly aggregateId: StableId;
readonly domain: Exclude<AdminQueue, 'REPORT'>;
readonly version: OptimisticVersion;
}

export interface ReportSecret {
readonly kind: 'REPORT';
readonly reportId: ReportId;
readonly version: OptimisticVersion;
}

export type AdminSelectionSecret = ReviewCaseSecret | ReportSecret;

export interface AdminPageCursor {
readonly cursor?: PaginationCursor;
readonly hasMore: boolean;
}

export interface AdminDecisionEventDetail {
readonly action: string;
readonly note: string;
readonly reasonCode: string;
readonly changesText: string;
}
