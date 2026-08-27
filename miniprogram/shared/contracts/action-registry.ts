import { ApiErrorCode, type ApiErrorCode as ApiErrorCodeValue } from '../types/api';
import type { CloudAction, CloudFunctionName } from './action-map';

export const AuthRequirement = {
  PUBLIC: 'PUBLIC',
  USER: 'USER',
  REVIEWER: 'REVIEWER',
  ADMIN: 'ADMIN',
} as const;
export type AuthRequirement = (typeof AuthRequirement)[keyof typeof AuthRequirement];

export const IdempotencyRequirement = {
  REQUIRED: 'REQUIRED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type IdempotencyRequirement =
  (typeof IdempotencyRequirement)[keyof typeof IdempotencyRequirement];

export const BUSINESS_COLLECTIONS = [
  'users', 'profiles_private', 'cards_public', 'card_share_tokens', 'friendships',
  'blocks_reports', 'label_catalog', 'verification_requests', 'verification_claims',
  'regions', 'countries', 'cities', 'club_nodes', 'organizers', 'events',
  'event_enrollments', 'art_items', 'art_collections', 'content_intents',
  'media_assets', 'orders', 'feature_flags', 'idempotency_keys', 'audit_logs',
  'projection_invalidations',
] as const;
export type BusinessCollection = (typeof BUSINESS_COLLECTIONS)[number];

export interface ActionRegistryEntry {
  readonly functionName: CloudFunctionName;
  readonly requestDto: string;
  readonly responseDto: string;
  readonly auth: AuthRequirement;
  readonly writableCollections: readonly BusinessCollection[];
  readonly idempotency: IdempotencyRequirement;
  readonly errorCodes: readonly ApiErrorCodeValue[];
}

const PUBLIC_READ_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED, ApiErrorCode.INVALID_REQUEST, ApiErrorCode.NOT_FOUND,
  ApiErrorCode.RATE_LIMITED, ApiErrorCode.SERVICE_UNAVAILABLE, ApiErrorCode.INTERNAL_ERROR,
] as const;
const USER_READ_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED, ApiErrorCode.INVALID_REQUEST, ApiErrorCode.AUTH_REQUIRED,
  ApiErrorCode.SESSION_EXPIRED, ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND,
  ApiErrorCode.INVALID_CURSOR, ApiErrorCode.RATE_LIMITED, ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.INTERNAL_ERROR,
] as const;
const USER_WRITE_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED, ApiErrorCode.INVALID_REQUEST, ApiErrorCode.VALIDATION_FAILED,
  ApiErrorCode.AUTH_REQUIRED, ApiErrorCode.SESSION_EXPIRED, ApiErrorCode.FORBIDDEN,
  ApiErrorCode.NOT_FOUND, ApiErrorCode.CONFLICT, ApiErrorCode.VERSION_CONFLICT,
  ApiErrorCode.IDEMPOTENCY_CONFLICT, ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.SERVICE_UNAVAILABLE, ApiErrorCode.INTERNAL_ERROR,
] as const;
const REVIEW_READ_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED, ApiErrorCode.INVALID_REQUEST, ApiErrorCode.AUTH_REQUIRED,
  ApiErrorCode.SESSION_EXPIRED, ApiErrorCode.FORBIDDEN, ApiErrorCode.ROLE_REQUIRED,
  ApiErrorCode.NOT_FOUND, ApiErrorCode.INVALID_CURSOR, ApiErrorCode.INTERNAL_ERROR,
] as const;
const REVIEW_WRITE_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED, ApiErrorCode.INVALID_REQUEST, ApiErrorCode.VALIDATION_FAILED,
  ApiErrorCode.AUTH_REQUIRED, ApiErrorCode.SESSION_EXPIRED, ApiErrorCode.FORBIDDEN,
  ApiErrorCode.ROLE_REQUIRED, ApiErrorCode.NOT_FOUND, ApiErrorCode.VERSION_CONFLICT,
  ApiErrorCode.IDEMPOTENCY_CONFLICT, ApiErrorCode.REVIEW_INVALID_TRANSITION,
  ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, ApiErrorCode.MEDIA_RIGHTS_REQUIRED,
  ApiErrorCode.INTERNAL_ERROR,
] as const;

export const CLOUD_ACTION_REGISTRY = {
  'identity.bootstrap': {
    functionName: 'identityApi', requestDto: 'IdentityBootstrapRequest', responseDto: 'IdentityBootstrapResponse',
    auth: AuthRequirement.USER, writableCollections: ['users', 'idempotency_keys', 'audit_logs'], idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS,
  },
  'profile.getMine': {
    functionName: 'identityApi', requestDto: 'ProfileGetMineRequest', responseDto: 'ProfileGetMineResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'profile.updateMine': {
    functionName: 'identityApi', requestDto: 'ProfileUpdateMineRequest', responseDto: 'ProfileUpdateMineResponse',
    auth: AuthRequirement.USER, writableCollections: ['profiles_private', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'card.getMine': {
    functionName: 'identityApi', requestDto: 'CardGetMineRequest', responseDto: 'CardGetMineResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'card.getForViewer': {
    functionName: 'identityApi', requestDto: 'CardGetForViewerRequest', responseDto: 'CardGetForViewerResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...USER_READ_ERRORS, ApiErrorCode.BLOCKED_RELATIONSHIP, ApiErrorCode.PROJECTION_STALE],
  },
  'card.refreshProjection': {
    functionName: 'identityApi', requestDto: 'CardRefreshProjectionRequest', responseDto: 'CardRefreshProjectionResponse',
    auth: AuthRequirement.USER, writableCollections: ['cards_public', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.PROJECTION_STALE],
  },
  'share.create': {
    functionName: 'identityApi', requestDto: 'ShareCreateRequest', responseDto: 'ShareCreateResponse',
    auth: AuthRequirement.USER, writableCollections: ['card_share_tokens', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'share.resolve': {
    functionName: 'identityApi', requestDto: 'ShareResolveRequest', responseDto: 'ShareResolveResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.TOKEN_INVALID, ApiErrorCode.TOKEN_EXPIRED, ApiErrorCode.TOKEN_REVOKED],
  },
  'share.revoke': {
    functionName: 'identityApi', requestDto: 'ShareRevokeRequest', responseDto: 'ShareRevokeResponse',
    auth: AuthRequirement.USER, writableCollections: ['card_share_tokens', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'share.createQrScene': {
    functionName: 'identityApi', requestDto: 'ShareCreateQrSceneRequest', responseDto: 'ShareCreateQrSceneResponse',
    auth: AuthRequirement.USER, writableCollections: ['media_assets', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },

  'friend.request': {
    functionName: 'socialApi', requestDto: 'FriendRequestRequest', responseDto: 'FriendRequestResponse',
    auth: AuthRequirement.USER, writableCollections: ['friendships', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.BLOCKED_RELATIONSHIP],
  },
  'friend.listIncoming': {
    functionName: 'socialApi', requestDto: 'FriendListIncomingRequest', responseDto: 'FriendListIncomingResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'friend.listAccepted': {
    functionName: 'socialApi', requestDto: 'FriendListAcceptedRequest', responseDto: 'FriendListAcceptedResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'friend.accept': {
    functionName: 'socialApi', requestDto: 'FriendAcceptRequest', responseDto: 'FriendAcceptResponse',
    auth: AuthRequirement.USER, writableCollections: ['friendships', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.BLOCKED_RELATIONSHIP],
  },
  'friend.reject': {
    functionName: 'socialApi', requestDto: 'FriendRejectRequest', responseDto: 'FriendRejectResponse',
    auth: AuthRequirement.USER, writableCollections: ['friendships', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'friend.cancel': {
    functionName: 'socialApi', requestDto: 'FriendCancelRequest', responseDto: 'FriendCancelResponse',
    auth: AuthRequirement.USER, writableCollections: ['friendships', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'friend.remove': {
    functionName: 'socialApi', requestDto: 'FriendRemoveRequest', responseDto: 'FriendRemoveResponse',
    auth: AuthRequirement.USER, writableCollections: ['friendships', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'block.create': {
    functionName: 'socialApi', requestDto: 'BlockCreateRequest', responseDto: 'BlockCreateResponse',
    auth: AuthRequirement.USER, writableCollections: ['blocks_reports', 'friendships', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'block.remove': {
    functionName: 'socialApi', requestDto: 'BlockRemoveRequest', responseDto: 'BlockRemoveResponse',
    auth: AuthRequirement.USER, writableCollections: ['blocks_reports', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'report.create': {
    functionName: 'socialApi', requestDto: 'ReportCreateRequest', responseDto: 'ReportCreateResponse',
    auth: AuthRequirement.USER, writableCollections: ['blocks_reports', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'tag.catalog': {
    functionName: 'socialApi', requestDto: 'TagCatalogRequest', responseDto: 'TagCatalogResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'verification.createDraft': {
    functionName: 'socialApi', requestDto: 'VerificationCreateDraftRequest', responseDto: 'VerificationCreateDraftResponse',
    auth: AuthRequirement.USER, writableCollections: ['verification_requests', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'verification.uploadPolicy': {
    functionName: 'socialApi', requestDto: 'VerificationUploadPolicyRequest', responseDto: 'VerificationUploadPolicyResponse',
    auth: AuthRequirement.USER, writableCollections: ['media_assets', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'verification.submit': {
    functionName: 'socialApi', requestDto: 'VerificationSubmitRequest', responseDto: 'VerificationSubmitResponse',
    auth: AuthRequirement.USER, writableCollections: ['verification_requests', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, ApiErrorCode.MEDIA_RIGHTS_REQUIRED],
  },
  'verification.listMine': {
    functionName: 'socialApi', requestDto: 'VerificationListMineRequest', responseDto: 'VerificationListMineResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'verification.getMine': {
    functionName: 'socialApi', requestDto: 'VerificationGetMineRequest', responseDto: 'VerificationGetMineResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'verification.withdraw': {
    functionName: 'socialApi', requestDto: 'VerificationWithdrawRequest', responseDto: 'VerificationWithdrawResponse',
    auth: AuthRequirement.USER, writableCollections: ['verification_requests', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.REVIEW_INVALID_TRANSITION],
  },

  'geo.listRegions': {
    functionName: 'eventApi', requestDto: 'GeoListRegionsRequest', responseDto: 'GeoListRegionsResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'geo.listCountries': {
    functionName: 'eventApi', requestDto: 'GeoListCountriesRequest', responseDto: 'GeoListCountriesResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'geo.listCities': {
    functionName: 'eventApi', requestDto: 'GeoListCitiesRequest', responseDto: 'GeoListCitiesResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'geo.getNode': {
    functionName: 'eventApi', requestDto: 'GeoGetNodeRequest', responseDto: 'GeoGetNodeResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'event.list': {
    functionName: 'eventApi', requestDto: 'EventListRequest', responseDto: 'EventListResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.INVALID_CURSOR],
  },
  'event.get': {
    functionName: 'eventApi', requestDto: 'EventGetRequest', responseDto: 'EventGetResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.EVENT_NOT_AVAILABLE],
  },
  'event.checkEligibility': {
    functionName: 'eventApi', requestDto: 'EventCheckEligibilityRequest', responseDto: 'EventCheckEligibilityResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...USER_READ_ERRORS, ApiErrorCode.ELIGIBILITY_NOT_MET, ApiErrorCode.EVENT_NOT_AVAILABLE, ApiErrorCode.PROJECTION_STALE],
  },
  'event.registerInterest': {
    functionName: 'eventApi', requestDto: 'EventRegisterInterestRequest', responseDto: 'EventRegisterInterestResponse',
    auth: AuthRequirement.USER, writableCollections: ['event_enrollments', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.ELIGIBILITY_NOT_MET, ApiErrorCode.EVENT_NOT_AVAILABLE, ApiErrorCode.PAYMENT_DISABLED],
  },
  'event.cancelInterest': {
    functionName: 'eventApi', requestDto: 'EventCancelInterestRequest', responseDto: 'EventCancelInterestResponse',
    auth: AuthRequirement.USER, writableCollections: ['event_enrollments', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.ENROLLMENT_NOT_FOUND],
  },
  'event.getEnrollment': {
    functionName: 'eventApi', requestDto: 'EventGetEnrollmentRequest', responseDto: 'EventGetEnrollmentResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS,
  },
  'organizer.getPublic': {
    functionName: 'eventApi', requestDto: 'OrganizerGetPublicRequest', responseDto: 'OrganizerGetPublicResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'payment.getCapability': {
    functionName: 'eventApi', requestDto: 'PaymentGetCapabilityRequest', responseDto: 'PaymentGetCapabilityResponse',
    auth: AuthRequirement.USER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...USER_READ_ERRORS, ApiErrorCode.PAYMENT_DISABLED],
  },

  'content.list': {
    functionName: 'contentApi', requestDto: 'ContentListRequest', responseDto: 'ContentListResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.INVALID_CURSOR],
  },
  'content.get': {
    functionName: 'contentApi', requestDto: 'ContentGetRequest', responseDto: 'ContentGetResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'content.listCollections': {
    functionName: 'contentApi', requestDto: 'ContentListCollectionsRequest', responseDto: 'ContentListCollectionsResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.INVALID_CURSOR],
  },
  'content.getCreator': {
    functionName: 'contentApi', requestDto: 'ContentGetCreatorRequest', responseDto: 'ContentGetCreatorResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS,
  },
  'content.listRelatedEvents': {
    functionName: 'contentApi', requestDto: 'ContentListRelatedEventsRequest', responseDto: 'ContentListRelatedEventsResponse',
    auth: AuthRequirement.PUBLIC, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.PROJECTION_STALE],
  },
  'content.intent.create': {
    functionName: 'contentApi', requestDto: 'ContentIntentCreateRequest', responseDto: 'ContentIntentCreateResponse',
    auth: AuthRequirement.USER, writableCollections: ['content_intents', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },
  'content.intent.cancel': {
    functionName: 'contentApi', requestDto: 'ContentIntentCancelRequest', responseDto: 'ContentIntentCancelResponse',
    auth: AuthRequirement.USER, writableCollections: ['content_intents', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: USER_WRITE_ERRORS,
  },

  'admin.bootstrap': {
    functionName: 'adminApi', requestDto: 'AdminBootstrapRequest', responseDto: 'AdminBootstrapResponse',
    auth: AuthRequirement.ADMIN, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS,
  },
  'review.list': {
    functionName: 'adminApi', requestDto: 'ReviewListRequest', responseDto: 'ReviewListResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS,
  },
  'review.get': {
    functionName: 'adminApi', requestDto: 'ReviewGetRequest', responseDto: 'ReviewGetResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS,
  },
  'review.approve': {
    functionName: 'adminApi', requestDto: 'ReviewApproveRequest', responseDto: 'ReviewApproveResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['verification_requests', 'verification_claims', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'review.reject': {
    functionName: 'adminApi', requestDto: 'ReviewRejectRequest', responseDto: 'ReviewRejectResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['verification_requests', 'verification_claims', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'review.requestChanges': {
    functionName: 'adminApi', requestDto: 'ReviewRequestChangesRequest', responseDto: 'ReviewRequestChangesResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['verification_requests', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'review.revoke': {
    functionName: 'adminApi', requestDto: 'ReviewRevokeRequest', responseDto: 'ReviewRevokeResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['verification_claims', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'organizer.review': {
    functionName: 'adminApi', requestDto: 'OrganizerReviewRequest', responseDto: 'OrganizerReviewResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['organizers', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'event.review': {
    functionName: 'adminApi', requestDto: 'EventReviewRequest', responseDto: 'EventReviewResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['events', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'content.review': {
    functionName: 'adminApi', requestDto: 'ContentReviewRequest', responseDto: 'ContentReviewResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['art_items', 'art_collections', 'media_assets', 'idempotency_keys', 'audit_logs', 'projection_invalidations'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'report.list': {
    functionName: 'adminApi', requestDto: 'ReportListRequest', responseDto: 'ReportListResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS,
  },
  'report.resolve': {
    functionName: 'adminApi', requestDto: 'ReportResolveRequest', responseDto: 'ReportResolveResponse',
    auth: AuthRequirement.REVIEWER, writableCollections: ['blocks_reports', 'idempotency_keys', 'audit_logs'],
    idempotency: IdempotencyRequirement.REQUIRED, errorCodes: REVIEW_WRITE_ERRORS,
  },
  'audit.list': {
    functionName: 'adminApi', requestDto: 'AuditListRequest', responseDto: 'AuditListResponse',
    auth: AuthRequirement.ADMIN, writableCollections: [], idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS,
  },
} as const satisfies { readonly [Action in CloudAction]: ActionRegistryEntry };

export const CLOUD_ACTION_COUNT = 59 as const;
