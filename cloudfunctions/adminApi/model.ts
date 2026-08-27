import type { CloudAction } from '../../miniprogram/shared/contracts';
import type {
  AuditEntryProjection,
  PublicContentProjection,
  PublicEventProjection,
  PublicOrganizerProjection,
  PublicVerificationClaimProjection,
  ReportProjection,
  ReviewCaseProjection,
} from '../../miniprogram/shared/types/projections';
import type {
  IdempotencyKey,
  OptimisticVersion,
  PaginationCursor,
  RequestId,
  ReviewCaseId,
  StableId,
  UserId,
  UtcInstant,
  VerificationClaimId,
} from '../../miniprogram/shared/types/primitives';
import type { WxContextProvider } from '../_shared/auth';

export const AdminRole = {
  REVIEWER: 'REVIEWER',
  EVENT_MANAGER: 'EVENT_MANAGER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export type ReviewDomain = ReviewCaseProjection['domain'];
export type AdminQueue = ReviewDomain;
export type AdminRequestedScope = 'REVIEW' | 'OPERATIONS' | 'AUDIT';

export type ReviewScope =
  | 'TAG_VERIFICATION'
  | 'ORGANIZER_APPLICATION'
  | 'EVENT_PUBLICATION'
  | 'CONTENT_PUBLICATION'
  | 'REPORT_RESOLUTION'
  | 'MATERIAL_ACCESS';

export interface AdminPrincipal {
  readonly openId: string;
  readonly userId: UserId;
  readonly roles: readonly AdminRole[];
  readonly accountState: 'ACTIVE' | 'DISABLED';
  readonly allowlisted: boolean;
  readonly expiresAt: UtcInstant;
}

/**
 * The raw application document remains opaque to adminApi. An integration
 * adapter may read it from the owning module, but adminApi never copies or
 * infers that module's private document shape.
 */
export interface OriginalApplicationSnapshot {
  readonly reviewCaseId: ReviewCaseId;
  readonly aggregateId: StableId;
  readonly sourceVersion: OptimisticVersion;
  readonly capturedAt: UtcInstant;
  readonly raw: unknown;
}

export interface AdminReviewLogRecord {
  readonly auditEntryId: StableId<'audit-entry'>;
  readonly actorUserId: UserId;
  readonly actorRole: 'REVIEWER' | 'ADMIN';
  readonly action: CloudAction;
  readonly targetType: string;
  readonly targetId: StableId;
  readonly requestId: RequestId;
  readonly occurredAt: UtcInstant;
  readonly result: 'SUCCEEDED';
  readonly reasonCode: string;
  readonly reviewCaseId: ReviewCaseId;
  readonly reviewedBy: UserId;
  readonly reviewedAt: UtcInstant;
  readonly reviewScope: ReviewScope;
  readonly reason: string;
  readonly beforeStatus: ReviewCaseProjection['status'];
  readonly afterStatus: ReviewCaseProjection['status'];
  readonly expectedVersion: OptimisticVersion;
  readonly sourceSnapshotVersion: OptimisticVersion;
  readonly version: OptimisticVersion;
}

export interface AdminIdempotencyRecord {
  readonly namespace: string;
  readonly requestFingerprint: string;
  readonly requestId: RequestId;
  readonly status: 'COMPLETED';
  readonly result: unknown;
  readonly expiresAt: UtcInstant;
  readonly createdAt: UtcInstant;
}

export interface AdminMutationCommand {
  readonly action: CloudAction;
  readonly writableCollections: readonly string[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly principal: AdminPrincipal;
  readonly requestId: RequestId;
  readonly occurredAt: UtcInstant;
  readonly beforeReviewCase?: Readonly<ReviewCaseProjection>;
  readonly nextReviewStatus?: ReviewCaseProjection['status'];
  readonly originalSnapshot?: Readonly<OriginalApplicationSnapshot>;
}

export interface AdminMutationResult {
  readonly reviewCase?: Readonly<ReviewCaseProjection>;
  readonly approvedClaim?: Readonly<PublicVerificationClaimProjection>;
  /**
   * Minimal protocol proof for review.revoke. This is intentionally not a
   * verification_claims document shape: it contains only the exact public
   * invalidation source identity and the frozen revocation patch fields.
   */
  readonly revokedClaim?: Readonly<{
    readonly reviewCaseId: ReviewCaseId;
    readonly source: Readonly<{
      readonly collection: 'verification_claims';
      readonly aggregateId: VerificationClaimId;
      readonly expectedVersion: OptimisticVersion;
      readonly patch: Readonly<{
        readonly version: OptimisticVersion;
        readonly reviewStatus: 'REVOKED';
        readonly publicVisible: false;
      }>;
    }>;
  }>;
  readonly organizer?: Readonly<PublicOrganizerProjection>;
  readonly event?: Readonly<PublicEventProjection>;
  readonly content?: Readonly<PublicContentProjection>;
  readonly report?: Readonly<ReportProjection>;
  readonly sourceAggregateId: StableId;
  readonly sourceVersion: OptimisticVersion;
}

export interface ReviewListQuery {
  readonly domains: readonly ReviewDomain[];
  readonly status?: ReviewCaseProjection['status'];
  readonly cursor?: PaginationCursor;
  readonly limit: number;
}

export interface ReportListQuery {
  readonly status?: ReportProjection['status'];
  readonly cursor?: PaginationCursor;
  readonly limit: number;
}

export interface AuditListQuery {
  readonly action?: string;
  readonly targetId?: StableId;
  readonly occurredAfter?: UtcInstant;
  readonly occurredBefore?: UtcInstant;
  readonly cursor?: PaginationCursor;
  readonly limit: number;
}

export interface CursorResult<T> {
  readonly items: readonly T[];
  readonly nextCursor?: PaginationCursor;
  readonly hasMore: boolean;
}

export interface AdminTransaction {
  getReviewCase(reviewCaseId: ReviewCaseId): Promise<Readonly<ReviewCaseProjection> | null>;
  getOriginalApplicationSnapshot(
    reviewCaseId: ReviewCaseId,
  ): Promise<Readonly<OriginalApplicationSnapshot> | null>;
  getReport(reportId: StableId<'report'>): Promise<Readonly<ReportProjection> | null>;
  getIdempotency(namespace: string): Promise<Readonly<AdminIdempotencyRecord> | null>;
  applyMutation(command: Readonly<AdminMutationCommand>): Promise<Readonly<AdminMutationResult>>;
  appendReviewLog(record: Readonly<AdminReviewLogRecord>): Promise<void>;
  appendAudit(record: Readonly<AuditEntryProjection>): Promise<void>;
  appendProjectionInvalidation(record: Readonly<import('../../miniprogram/shared/types/projections').ProjectionInvalidation>): Promise<void>;
  completeIdempotency(record: Readonly<AdminIdempotencyRecord>): Promise<void>;
}

export interface AdminRepository {
  runTransaction<T>(operation: (transaction: AdminTransaction) => Promise<T>): Promise<T>;
  listReviewCases(query: Readonly<ReviewListQuery>): Promise<Readonly<CursorResult<ReviewCaseProjection>>>;
  listReports(query: Readonly<ReportListQuery>): Promise<Readonly<CursorResult<ReportProjection>>>;
  listAuditEntries(query: Readonly<AuditListQuery>): Promise<Readonly<CursorResult<AuditEntryProjection>>>;
}

export interface AdminApiDependencies {
  readonly getWxContext: WxContextProvider;
  readonly loadAdminPrincipal: (openId: string) => Promise<Readonly<AdminPrincipal> | null>;
  readonly repository: AdminRepository;
  readonly now: () => UtcInstant;
  readonly createId: (kind: 'audit-entry' | 'projection-invalidation') => string;
  readonly runtimeMode: 'LIVE' | 'DEGRADED';
}

export interface ApprovedDataAuditInput {
  readonly reviewCases: readonly Readonly<ReviewCaseProjection>[];
  readonly reviewLogs: readonly Readonly<AdminReviewLogRecord>[];
}

export interface ApprovedDataAuditResult {
  readonly ok: boolean;
  readonly missingReviewLogCaseIds: readonly ReviewCaseId[];
}

export interface WritePayloadBase {
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: OptimisticVersion;
}
