export const RecordOrigin = {
  REAL: 'REAL',
  SYNTHETIC: 'SYNTHETIC',
} as const;
export type RecordOrigin = (typeof RecordOrigin)[keyof typeof RecordOrigin];

export const VerificationState = {
  USER_DECLARED: 'USER_DECLARED',
  AI_CONSISTENCY_CHECKED: 'AI_CONSISTENCY_CHECKED',
  HUMAN_REVIEWED: 'HUMAN_REVIEWED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type VerificationState = (typeof VerificationState)[keyof typeof VerificationState];

export const ReviewStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  NEEDS_CHANGES: 'NEEDS_CHANGES',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const Visibility = {
  PRIVATE: 'PRIVATE',
  FRIENDS_ONLY: 'FRIENDS_ONLY',
  PUBLIC: 'PUBLIC',
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const OperationalState = {
  PLANNED: 'PLANNED',
  RECRUITING_HOST: 'RECRUITING_HOST',
  PILOT: 'PILOT',
  LIVE: 'LIVE',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED',
} as const;
export type OperationalState = (typeof OperationalState)[keyof typeof OperationalState];

export const RuntimeMode = {
  LIVE: 'LIVE',
  DEGRADED: 'DEGRADED',
  OFFLINE_DEMO: 'OFFLINE_DEMO',
} as const;
export type RuntimeMode = (typeof RuntimeMode)[keyof typeof RuntimeMode];

export const FriendshipState = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REMOVED: 'REMOVED',
} as const;
export type FriendshipState = (typeof FriendshipState)[keyof typeof FriendshipState];

export const EventState = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  PUBLISHED: 'PUBLISHED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;
export type EventState = (typeof EventState)[keyof typeof EventState];

export const EnrollmentState = {
  INTERESTED: 'INTERESTED',
  WAITLISTED: 'WAITLISTED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type EnrollmentState = (typeof EnrollmentState)[keyof typeof EnrollmentState];

export const PaymentState = {
  DISABLED: 'DISABLED',
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentState = (typeof PaymentState)[keyof typeof PaymentState];

export const PublicationState = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
  REJECTED: 'REJECTED',
} as const;
export type PublicationState = (typeof PublicationState)[keyof typeof PublicationState];

export const MediaRightsState = {
  UNVERIFIED: 'UNVERIFIED',
  CLAIMED: 'CLAIMED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type MediaRightsState = (typeof MediaRightsState)[keyof typeof MediaRightsState];

export const EvidenceOverall = {
  INCOMPLETE: 'INCOMPLETE',
  BLOCKED: 'BLOCKED',
  LOCAL_TEST_PASS: 'LOCAL_TEST_PASS',
  INTEGRATION_READY: 'INTEGRATION_READY',
  RELEASE_CANDIDATE: 'RELEASE_CANDIDATE',
  RELEASED: 'RELEASED',
} as const;
export type EvidenceOverall = (typeof EvidenceOverall)[keyof typeof EvidenceOverall];

export const EvidenceGateStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNVERIFIED: 'UNVERIFIED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type EvidenceGateStatus = (typeof EvidenceGateStatus)[keyof typeof EvidenceGateStatus];

export const EvidencePhase = {
  FOUNDATION: 'FOUNDATION',
  FEATURE_MODULE: 'FEATURE_MODULE',
  FINAL_INTEGRATION: 'FINAL_INTEGRATION',
} as const;
export type EvidencePhase = (typeof EvidencePhase)[keyof typeof EvidencePhase];

export const ProjectionInvalidationKind = {
  RELATIONSHIP_CHANGED: 'RELATIONSHIP_CHANGED',
  VERIFICATION_CHANGED: 'VERIFICATION_CHANGED',
  EVENT_CHANGED: 'EVENT_CHANGED',
  CONTENT_CHANGED: 'CONTENT_CHANGED',
  MEDIA_RIGHTS_CHANGED: 'MEDIA_RIGHTS_CHANGED',
} as const;
export type ProjectionInvalidationKind =
  (typeof ProjectionInvalidationKind)[keyof typeof ProjectionInvalidationKind];
