import type { OptimisticVersion, RequestId, StableId, UtcInstant } from './primitives';

export const ApiErrorCode = {
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  ROLE_REQUIRED: 'ROLE_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  INVALID_CURSOR: 'INVALID_CURSOR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  REVIEW_INVALID_TRANSITION: 'REVIEW_INVALID_TRANSITION',
  REVIEW_EVIDENCE_REQUIRED: 'REVIEW_EVIDENCE_REQUIRED',
  RESOURCE_DISABLED: 'RESOURCE_DISABLED',
  BLOCKED_RELATIONSHIP: 'BLOCKED_RELATIONSHIP',
  ELIGIBILITY_NOT_MET: 'ELIGIBILITY_NOT_MET',
  EVENT_NOT_AVAILABLE: 'EVENT_NOT_AVAILABLE',
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  PAYMENT_DISABLED: 'PAYMENT_DISABLED',
  MEDIA_RIGHTS_REQUIRED: 'MEDIA_RIGHTS_REQUIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  PROJECTION_STALE: 'PROJECTION_STALE',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface NotImplementedErrorDetails {
  readonly code: typeof ApiErrorCode.NOT_IMPLEMENTED;
  readonly action: string;
  readonly contractVersion: '1.0.0';
}
export interface InvalidRequestErrorDetails {
  readonly code: typeof ApiErrorCode.INVALID_REQUEST;
  readonly field?: string;
  readonly reason: string;
}
export interface ValidationFailedErrorDetails {
  readonly code: typeof ApiErrorCode.VALIDATION_FAILED;
  readonly issues: readonly { readonly field: string; readonly rule: string }[];
}
export interface AuthRequiredErrorDetails {
  readonly code: typeof ApiErrorCode.AUTH_REQUIRED;
  readonly required: true;
}
export interface SessionExpiredErrorDetails {
  readonly code: typeof ApiErrorCode.SESSION_EXPIRED;
  readonly expiredAt?: UtcInstant;
}
export interface ForbiddenErrorDetails {
  readonly code: typeof ApiErrorCode.FORBIDDEN;
  readonly policy: string;
}
export interface RoleRequiredErrorDetails {
  readonly code: typeof ApiErrorCode.ROLE_REQUIRED;
  readonly requiredRoles: readonly ('ORGANIZER' | 'REVIEWER' | 'ADMIN')[];
}
export interface NotFoundErrorDetails {
  readonly code: typeof ApiErrorCode.NOT_FOUND;
  readonly resourceType: string;
  readonly resourceId?: StableId;
}
export interface AlreadyExistsErrorDetails {
  readonly code: typeof ApiErrorCode.ALREADY_EXISTS;
  readonly resourceType: string;
  readonly existingId?: StableId;
}
export interface ConflictErrorDetails {
  readonly code: typeof ApiErrorCode.CONFLICT;
  readonly conflictType: string;
}
export interface VersionConflictErrorDetails {
  readonly code: typeof ApiErrorCode.VERSION_CONFLICT;
  readonly expectedVersion: OptimisticVersion;
  readonly currentVersion: OptimisticVersion;
}
export interface IdempotencyConflictErrorDetails {
  readonly code: typeof ApiErrorCode.IDEMPOTENCY_CONFLICT;
  readonly firstRequestId: RequestId;
}
export interface InvalidCursorErrorDetails {
  readonly code: typeof ApiErrorCode.INVALID_CURSOR;
  readonly reason: 'MALFORMED' | 'EXPIRED' | 'FILTER_MISMATCH';
}
export interface RateLimitedErrorDetails {
  readonly code: typeof ApiErrorCode.RATE_LIMITED;
  readonly retryAfterSeconds: number;
}
export interface ServiceUnavailableErrorDetails {
  readonly code: typeof ApiErrorCode.SERVICE_UNAVAILABLE;
  readonly service: string;
}
export interface InternalErrorDetails {
  readonly code: typeof ApiErrorCode.INTERNAL_ERROR;
  readonly incidentId: string;
}
export interface ReviewInvalidTransitionErrorDetails {
  readonly code: typeof ApiErrorCode.REVIEW_INVALID_TRANSITION;
  readonly from: string;
  readonly to: string;
}
export interface ReviewEvidenceRequiredErrorDetails {
  readonly code: typeof ApiErrorCode.REVIEW_EVIDENCE_REQUIRED;
  readonly missingEvidenceKinds: readonly string[];
}
export interface ResourceDisabledErrorDetails {
  readonly code: typeof ApiErrorCode.RESOURCE_DISABLED;
  readonly feature: string;
}
export interface BlockedRelationshipErrorDetails {
  readonly code: typeof ApiErrorCode.BLOCKED_RELATIONSHIP;
  readonly blocksAccess: true;
}
export interface EligibilityNotMetErrorDetails {
  readonly code: typeof ApiErrorCode.ELIGIBILITY_NOT_MET;
  readonly missingLabelIds: readonly StableId<'label'>[];
}
export interface EventNotAvailableErrorDetails {
  readonly code: typeof ApiErrorCode.EVENT_NOT_AVAILABLE;
  readonly eventState: string;
}
export interface EnrollmentNotFoundErrorDetails {
  readonly code: typeof ApiErrorCode.ENROLLMENT_NOT_FOUND;
  readonly eventId: StableId<'event'>;
}
export interface PaymentDisabledErrorDetails {
  readonly code: typeof ApiErrorCode.PAYMENT_DISABLED;
  readonly featureFlag: 'payment';
}
export interface MediaRightsRequiredErrorDetails {
  readonly code: typeof ApiErrorCode.MEDIA_RIGHTS_REQUIRED;
  readonly mediaAssetIds: readonly StableId<'media-asset'>[];
}
export interface TokenInvalidErrorDetails {
  readonly code: typeof ApiErrorCode.TOKEN_INVALID;
  readonly tokenKind: 'CARD_SHARE' | 'EVENT_SHARE';
}
export interface TokenExpiredErrorDetails {
  readonly code: typeof ApiErrorCode.TOKEN_EXPIRED;
  readonly expiredAt: UtcInstant;
}
export interface TokenRevokedErrorDetails {
  readonly code: typeof ApiErrorCode.TOKEN_REVOKED;
  readonly revokedAt: UtcInstant;
}
export interface ProjectionStaleErrorDetails {
  readonly code: typeof ApiErrorCode.PROJECTION_STALE;
  readonly projectionType: string;
  readonly requiredSourceVersion: OptimisticVersion;
}

export interface ApiErrorDetailsMap {
  readonly NOT_IMPLEMENTED: NotImplementedErrorDetails;
  readonly INVALID_REQUEST: InvalidRequestErrorDetails;
  readonly VALIDATION_FAILED: ValidationFailedErrorDetails;
  readonly AUTH_REQUIRED: AuthRequiredErrorDetails;
  readonly SESSION_EXPIRED: SessionExpiredErrorDetails;
  readonly FORBIDDEN: ForbiddenErrorDetails;
  readonly ROLE_REQUIRED: RoleRequiredErrorDetails;
  readonly NOT_FOUND: NotFoundErrorDetails;
  readonly ALREADY_EXISTS: AlreadyExistsErrorDetails;
  readonly CONFLICT: ConflictErrorDetails;
  readonly VERSION_CONFLICT: VersionConflictErrorDetails;
  readonly IDEMPOTENCY_CONFLICT: IdempotencyConflictErrorDetails;
  readonly INVALID_CURSOR: InvalidCursorErrorDetails;
  readonly RATE_LIMITED: RateLimitedErrorDetails;
  readonly SERVICE_UNAVAILABLE: ServiceUnavailableErrorDetails;
  readonly INTERNAL_ERROR: InternalErrorDetails;
  readonly REVIEW_INVALID_TRANSITION: ReviewInvalidTransitionErrorDetails;
  readonly REVIEW_EVIDENCE_REQUIRED: ReviewEvidenceRequiredErrorDetails;
  readonly RESOURCE_DISABLED: ResourceDisabledErrorDetails;
  readonly BLOCKED_RELATIONSHIP: BlockedRelationshipErrorDetails;
  readonly ELIGIBILITY_NOT_MET: EligibilityNotMetErrorDetails;
  readonly EVENT_NOT_AVAILABLE: EventNotAvailableErrorDetails;
  readonly ENROLLMENT_NOT_FOUND: EnrollmentNotFoundErrorDetails;
  readonly PAYMENT_DISABLED: PaymentDisabledErrorDetails;
  readonly MEDIA_RIGHTS_REQUIRED: MediaRightsRequiredErrorDetails;
  readonly TOKEN_INVALID: TokenInvalidErrorDetails;
  readonly TOKEN_EXPIRED: TokenExpiredErrorDetails;
  readonly TOKEN_REVOKED: TokenRevokedErrorDetails;
  readonly PROJECTION_STALE: ProjectionStaleErrorDetails;
}

export type ApiErrorDetails<Code extends ApiErrorCode = ApiErrorCode> = ApiErrorDetailsMap[Code];

export type ApiFailure = {
  readonly [Code in ApiErrorCode]: {
    readonly ok: false;
    readonly error: {
      readonly code: Code;
      readonly message: string;
      readonly retryable: boolean;
      readonly details?: ApiErrorDetails<Code>;
    };
    readonly requestId: RequestId;
  };
}[ApiErrorCode];

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly requestId: RequestId;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

