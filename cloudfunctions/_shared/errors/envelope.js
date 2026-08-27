// GENERATED FROM TYPESCRIPT BY scripts/build-cloud-runtime.mjs — DO NOT EDIT
// CLOUD_RUNTIME_SOURCE_SHA256:4f54b0888ea0693f6f062f4083a23a1d4567c9056d842942d7402bb1e98e24df
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// cloudfunctions/_shared/errors/envelope.ts
var envelope_exports = {};
__export(envelope_exports, {
  createNotImplementedEndpoint: () => createNotImplementedEndpoint
});
module.exports = __toCommonJS(envelope_exports);
var import_node_crypto = require("node:crypto");

// miniprogram/shared/types/api.ts
var ApiErrorCode = {
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  INVALID_REQUEST: "INVALID_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  ROLE_REQUIRED: "ROLE_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  INVALID_CURSOR: "INVALID_CURSOR",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  REVIEW_INVALID_TRANSITION: "REVIEW_INVALID_TRANSITION",
  REVIEW_EVIDENCE_REQUIRED: "REVIEW_EVIDENCE_REQUIRED",
  RESOURCE_DISABLED: "RESOURCE_DISABLED",
  BLOCKED_RELATIONSHIP: "BLOCKED_RELATIONSHIP",
  ELIGIBILITY_NOT_MET: "ELIGIBILITY_NOT_MET",
  EVENT_NOT_AVAILABLE: "EVENT_NOT_AVAILABLE",
  ENROLLMENT_NOT_FOUND: "ENROLLMENT_NOT_FOUND",
  PAYMENT_DISABLED: "PAYMENT_DISABLED",
  MEDIA_RIGHTS_REQUIRED: "MEDIA_RIGHTS_REQUIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_REVOKED: "TOKEN_REVOKED",
  PROJECTION_STALE: "PROJECTION_STALE"
};

// miniprogram/shared/contracts/action-registry.ts
var AuthRequirement = {
  PUBLIC: "PUBLIC",
  USER: "USER",
  REVIEWER: "REVIEWER",
  ADMIN: "ADMIN"
};
var IdempotencyRequirement = {
  REQUIRED: "REQUIRED",
  NOT_APPLICABLE: "NOT_APPLICABLE"
};
var PUBLIC_READ_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED,
  ApiErrorCode.INVALID_REQUEST,
  ApiErrorCode.NOT_FOUND,
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.INTERNAL_ERROR
];
var USER_READ_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED,
  ApiErrorCode.INVALID_REQUEST,
  ApiErrorCode.AUTH_REQUIRED,
  ApiErrorCode.SESSION_EXPIRED,
  ApiErrorCode.FORBIDDEN,
  ApiErrorCode.NOT_FOUND,
  ApiErrorCode.INVALID_CURSOR,
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.INTERNAL_ERROR
];
var USER_WRITE_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED,
  ApiErrorCode.INVALID_REQUEST,
  ApiErrorCode.VALIDATION_FAILED,
  ApiErrorCode.AUTH_REQUIRED,
  ApiErrorCode.SESSION_EXPIRED,
  ApiErrorCode.FORBIDDEN,
  ApiErrorCode.NOT_FOUND,
  ApiErrorCode.CONFLICT,
  ApiErrorCode.VERSION_CONFLICT,
  ApiErrorCode.IDEMPOTENCY_CONFLICT,
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.INTERNAL_ERROR
];
var REVIEW_READ_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED,
  ApiErrorCode.INVALID_REQUEST,
  ApiErrorCode.AUTH_REQUIRED,
  ApiErrorCode.SESSION_EXPIRED,
  ApiErrorCode.FORBIDDEN,
  ApiErrorCode.ROLE_REQUIRED,
  ApiErrorCode.NOT_FOUND,
  ApiErrorCode.INVALID_CURSOR,
  ApiErrorCode.INTERNAL_ERROR
];
var REVIEW_WRITE_ERRORS = [
  ApiErrorCode.NOT_IMPLEMENTED,
  ApiErrorCode.INVALID_REQUEST,
  ApiErrorCode.VALIDATION_FAILED,
  ApiErrorCode.AUTH_REQUIRED,
  ApiErrorCode.SESSION_EXPIRED,
  ApiErrorCode.FORBIDDEN,
  ApiErrorCode.ROLE_REQUIRED,
  ApiErrorCode.NOT_FOUND,
  ApiErrorCode.VERSION_CONFLICT,
  ApiErrorCode.IDEMPOTENCY_CONFLICT,
  ApiErrorCode.REVIEW_INVALID_TRANSITION,
  ApiErrorCode.REVIEW_EVIDENCE_REQUIRED,
  ApiErrorCode.MEDIA_RIGHTS_REQUIRED,
  ApiErrorCode.INTERNAL_ERROR
];
var CLOUD_ACTION_REGISTRY = {
  "identity.bootstrap": {
    functionName: "identityApi",
    requestDto: "IdentityBootstrapRequest",
    responseDto: "IdentityBootstrapResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["users", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "profile.getMine": {
    functionName: "identityApi",
    requestDto: "ProfileGetMineRequest",
    responseDto: "ProfileGetMineResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "profile.updateMine": {
    functionName: "identityApi",
    requestDto: "ProfileUpdateMineRequest",
    responseDto: "ProfileUpdateMineResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["profiles_private", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "card.getMine": {
    functionName: "identityApi",
    requestDto: "CardGetMineRequest",
    responseDto: "CardGetMineResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "card.getForViewer": {
    functionName: "identityApi",
    requestDto: "CardGetForViewerRequest",
    responseDto: "CardGetForViewerResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...USER_READ_ERRORS, ApiErrorCode.BLOCKED_RELATIONSHIP, ApiErrorCode.PROJECTION_STALE]
  },
  "card.refreshProjection": {
    functionName: "identityApi",
    requestDto: "CardRefreshProjectionRequest",
    responseDto: "CardRefreshProjectionResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["cards_public", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.PROJECTION_STALE]
  },
  "share.create": {
    functionName: "identityApi",
    requestDto: "ShareCreateRequest",
    responseDto: "ShareCreateResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["card_share_tokens", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "share.resolve": {
    functionName: "identityApi",
    requestDto: "ShareResolveRequest",
    responseDto: "ShareResolveResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.TOKEN_INVALID, ApiErrorCode.TOKEN_EXPIRED, ApiErrorCode.TOKEN_REVOKED]
  },
  "share.revoke": {
    functionName: "identityApi",
    requestDto: "ShareRevokeRequest",
    responseDto: "ShareRevokeResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["card_share_tokens", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "share.createQrScene": {
    functionName: "identityApi",
    requestDto: "ShareCreateQrSceneRequest",
    responseDto: "ShareCreateQrSceneResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["media_assets", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "friend.request": {
    functionName: "socialApi",
    requestDto: "FriendRequestRequest",
    responseDto: "FriendRequestResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["friendships", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.BLOCKED_RELATIONSHIP]
  },
  "friend.listIncoming": {
    functionName: "socialApi",
    requestDto: "FriendListIncomingRequest",
    responseDto: "FriendListIncomingResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "friend.listAccepted": {
    functionName: "socialApi",
    requestDto: "FriendListAcceptedRequest",
    responseDto: "FriendListAcceptedResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "friend.accept": {
    functionName: "socialApi",
    requestDto: "FriendAcceptRequest",
    responseDto: "FriendAcceptResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["friendships", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.BLOCKED_RELATIONSHIP]
  },
  "friend.reject": {
    functionName: "socialApi",
    requestDto: "FriendRejectRequest",
    responseDto: "FriendRejectResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["friendships", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "friend.cancel": {
    functionName: "socialApi",
    requestDto: "FriendCancelRequest",
    responseDto: "FriendCancelResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["friendships", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "friend.remove": {
    functionName: "socialApi",
    requestDto: "FriendRemoveRequest",
    responseDto: "FriendRemoveResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["friendships", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "block.create": {
    functionName: "socialApi",
    requestDto: "BlockCreateRequest",
    responseDto: "BlockCreateResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["blocks_reports", "friendships", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "block.remove": {
    functionName: "socialApi",
    requestDto: "BlockRemoveRequest",
    responseDto: "BlockRemoveResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["blocks_reports", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "report.create": {
    functionName: "socialApi",
    requestDto: "ReportCreateRequest",
    responseDto: "ReportCreateResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["blocks_reports", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "tag.catalog": {
    functionName: "socialApi",
    requestDto: "TagCatalogRequest",
    responseDto: "TagCatalogResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "verification.createDraft": {
    functionName: "socialApi",
    requestDto: "VerificationCreateDraftRequest",
    responseDto: "VerificationCreateDraftResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["verification_requests", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "verification.uploadPolicy": {
    functionName: "socialApi",
    requestDto: "VerificationUploadPolicyRequest",
    responseDto: "VerificationUploadPolicyResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["media_assets", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "verification.submit": {
    functionName: "socialApi",
    requestDto: "VerificationSubmitRequest",
    responseDto: "VerificationSubmitResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["verification_requests", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, ApiErrorCode.MEDIA_RIGHTS_REQUIRED]
  },
  "verification.listMine": {
    functionName: "socialApi",
    requestDto: "VerificationListMineRequest",
    responseDto: "VerificationListMineResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "verification.getMine": {
    functionName: "socialApi",
    requestDto: "VerificationGetMineRequest",
    responseDto: "VerificationGetMineResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "verification.withdraw": {
    functionName: "socialApi",
    requestDto: "VerificationWithdrawRequest",
    responseDto: "VerificationWithdrawResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["verification_requests", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.REVIEW_INVALID_TRANSITION]
  },
  "geo.listRegions": {
    functionName: "eventApi",
    requestDto: "GeoListRegionsRequest",
    responseDto: "GeoListRegionsResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "geo.listCountries": {
    functionName: "eventApi",
    requestDto: "GeoListCountriesRequest",
    responseDto: "GeoListCountriesResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "geo.listCities": {
    functionName: "eventApi",
    requestDto: "GeoListCitiesRequest",
    responseDto: "GeoListCitiesResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "geo.getNode": {
    functionName: "eventApi",
    requestDto: "GeoGetNodeRequest",
    responseDto: "GeoGetNodeResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "event.list": {
    functionName: "eventApi",
    requestDto: "EventListRequest",
    responseDto: "EventListResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.INVALID_CURSOR]
  },
  "event.get": {
    functionName: "eventApi",
    requestDto: "EventGetRequest",
    responseDto: "EventGetResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.EVENT_NOT_AVAILABLE]
  },
  "event.checkEligibility": {
    functionName: "eventApi",
    requestDto: "EventCheckEligibilityRequest",
    responseDto: "EventCheckEligibilityResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...USER_READ_ERRORS, ApiErrorCode.ELIGIBILITY_NOT_MET, ApiErrorCode.EVENT_NOT_AVAILABLE, ApiErrorCode.PROJECTION_STALE]
  },
  "event.registerInterest": {
    functionName: "eventApi",
    requestDto: "EventRegisterInterestRequest",
    responseDto: "EventRegisterInterestResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["event_enrollments", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.ELIGIBILITY_NOT_MET, ApiErrorCode.EVENT_NOT_AVAILABLE, ApiErrorCode.PAYMENT_DISABLED]
  },
  "event.cancelInterest": {
    functionName: "eventApi",
    requestDto: "EventCancelInterestRequest",
    responseDto: "EventCancelInterestResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["event_enrollments", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: [...USER_WRITE_ERRORS, ApiErrorCode.ENROLLMENT_NOT_FOUND]
  },
  "event.getEnrollment": {
    functionName: "eventApi",
    requestDto: "EventGetEnrollmentRequest",
    responseDto: "EventGetEnrollmentResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: USER_READ_ERRORS
  },
  "organizer.getPublic": {
    functionName: "eventApi",
    requestDto: "OrganizerGetPublicRequest",
    responseDto: "OrganizerGetPublicResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "payment.getCapability": {
    functionName: "eventApi",
    requestDto: "PaymentGetCapabilityRequest",
    responseDto: "PaymentGetCapabilityResponse",
    auth: AuthRequirement.USER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...USER_READ_ERRORS, ApiErrorCode.PAYMENT_DISABLED]
  },
  "content.list": {
    functionName: "contentApi",
    requestDto: "ContentListRequest",
    responseDto: "ContentListResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.INVALID_CURSOR]
  },
  "content.get": {
    functionName: "contentApi",
    requestDto: "ContentGetRequest",
    responseDto: "ContentGetResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "content.listCollections": {
    functionName: "contentApi",
    requestDto: "ContentListCollectionsRequest",
    responseDto: "ContentListCollectionsResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.INVALID_CURSOR]
  },
  "content.getCreator": {
    functionName: "contentApi",
    requestDto: "ContentGetCreatorRequest",
    responseDto: "ContentGetCreatorResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: PUBLIC_READ_ERRORS
  },
  "content.listRelatedEvents": {
    functionName: "contentApi",
    requestDto: "ContentListRelatedEventsRequest",
    responseDto: "ContentListRelatedEventsResponse",
    auth: AuthRequirement.PUBLIC,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: [...PUBLIC_READ_ERRORS, ApiErrorCode.PROJECTION_STALE]
  },
  "content.intent.create": {
    functionName: "contentApi",
    requestDto: "ContentIntentCreateRequest",
    responseDto: "ContentIntentCreateResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["content_intents", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "content.intent.cancel": {
    functionName: "contentApi",
    requestDto: "ContentIntentCancelRequest",
    responseDto: "ContentIntentCancelResponse",
    auth: AuthRequirement.USER,
    writableCollections: ["content_intents", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: USER_WRITE_ERRORS
  },
  "admin.bootstrap": {
    functionName: "adminApi",
    requestDto: "AdminBootstrapRequest",
    responseDto: "AdminBootstrapResponse",
    auth: AuthRequirement.ADMIN,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS
  },
  "review.list": {
    functionName: "adminApi",
    requestDto: "ReviewListRequest",
    responseDto: "ReviewListResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS
  },
  "review.get": {
    functionName: "adminApi",
    requestDto: "ReviewGetRequest",
    responseDto: "ReviewGetResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS
  },
  "review.approve": {
    functionName: "adminApi",
    requestDto: "ReviewApproveRequest",
    responseDto: "ReviewApproveResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["verification_requests", "verification_claims", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "review.reject": {
    functionName: "adminApi",
    requestDto: "ReviewRejectRequest",
    responseDto: "ReviewRejectResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["verification_requests", "verification_claims", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "review.requestChanges": {
    functionName: "adminApi",
    requestDto: "ReviewRequestChangesRequest",
    responseDto: "ReviewRequestChangesResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["verification_requests", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "review.revoke": {
    functionName: "adminApi",
    requestDto: "ReviewRevokeRequest",
    responseDto: "ReviewRevokeResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["verification_claims", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "organizer.review": {
    functionName: "adminApi",
    requestDto: "OrganizerReviewRequest",
    responseDto: "OrganizerReviewResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["organizers", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "event.review": {
    functionName: "adminApi",
    requestDto: "EventReviewRequest",
    responseDto: "EventReviewResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["events", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "content.review": {
    functionName: "adminApi",
    requestDto: "ContentReviewRequest",
    responseDto: "ContentReviewResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["art_items", "art_collections", "media_assets", "idempotency_keys", "audit_logs", "projection_invalidations"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "report.list": {
    functionName: "adminApi",
    requestDto: "ReportListRequest",
    responseDto: "ReportListResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS
  },
  "report.resolve": {
    functionName: "adminApi",
    requestDto: "ReportResolveRequest",
    responseDto: "ReportResolveResponse",
    auth: AuthRequirement.REVIEWER,
    writableCollections: ["blocks_reports", "idempotency_keys", "audit_logs"],
    idempotency: IdempotencyRequirement.REQUIRED,
    errorCodes: REVIEW_WRITE_ERRORS
  },
  "audit.list": {
    functionName: "adminApi",
    requestDto: "AuditListRequest",
    responseDto: "AuditListResponse",
    auth: AuthRequirement.ADMIN,
    writableCollections: [],
    idempotency: IdempotencyRequirement.NOT_APPLICABLE,
    errorCodes: REVIEW_READ_ERRORS
  }
};

// cloudfunctions/_shared/errors/index.ts
var RETRYABLE_CODES = /* @__PURE__ */ new Set([
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.INTERNAL_ERROR
]);
var SafeApiError = class extends Error {
  code;
  retryable;
  details;
  constructor(code, message, options = {}) {
    super(message);
    this.name = "SafeApiError";
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    if (options.details !== void 0) this.details = options.details;
  }
};
function apiFailure(requestId, code, message, options = {}) {
  const error = options.details === void 0 ? { code, message, retryable: options.retryable ?? RETRYABLE_CODES.has(code) } : { code, message, retryable: options.retryable ?? RETRYABLE_CODES.has(code), details: options.details };
  return { ok: false, error, requestId };
}
function safeFailureFromError(requestId, error) {
  if (error instanceof SafeApiError) {
    return apiFailure(requestId, error.code, error.message, {
      retryable: error.retryable,
      ...error.details === void 0 ? {} : { details: error.details }
    });
  }
  return apiFailure(requestId, ApiErrorCode.INTERNAL_ERROR, "The request could not be completed.", {
    retryable: true,
    details: {
      code: ApiErrorCode.INTERNAL_ERROR,
      incidentId: requestId
    }
  });
}

// cloudfunctions/_shared/validation/index.ts
var REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
var ALLOWED_ENVELOPE_KEYS = /* @__PURE__ */ new Set(["action", "requestId", "payload"]);
function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function isValidRequestId(value) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}
function validateCallEnvelope(event, allowedActions) {
  if (!isPlainRecord(event)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The cloud function request must be an object.", {
      details: { code: ApiErrorCode.INVALID_REQUEST, reason: "ENVELOPE_NOT_OBJECT" }
    });
  }
  const extraKey = Object.keys(event).find((key) => !ALLOWED_ENVELOPE_KEYS.has(key));
  if (extraKey !== void 0) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The request contains an unsupported field.", {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: extraKey, reason: "UNEXPECTED_FIELD" }
    });
  }
  if (!isValidRequestId(event.requestId)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "requestId is missing or malformed.", {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: "requestId", reason: "MALFORMED_REQUEST_ID" }
    });
  }
  if (typeof event.action !== "string" || !allowedActions.includes(event.action)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The action is not registered for this function.", {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: "action", reason: "ACTION_NOT_REGISTERED" }
    });
  }
  if (!isPlainRecord(event.payload)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "payload must be an object.", {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: "payload", reason: "PAYLOAD_NOT_OBJECT" }
    });
  }
  return {
    action: event.action,
    requestId: event.requestId,
    payload: Object.freeze({ ...event.payload })
  };
}
var WRITE_GUARD_SEQUENCE = Object.freeze([
  "TRUSTED_OPENID",
  "RBAC",
  "OBJECT_OWNERSHIP",
  "CURRENT_STATE",
  "OPTIMISTIC_VERSION",
  "IDEMPOTENCY",
  "AUDIT_APPEND"
]);
function defineWriteGuardPlan(action) {
  return Object.freeze({ action, checks: WRITE_GUARD_SEQUENCE, transactionRequired: true });
}

// cloudfunctions/_shared/errors/envelope.ts
function responseRequestId(event) {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId;
  return `srv_${(0, import_node_crypto.randomUUID)()}`;
}
function createNotImplementedEndpoint(functionName, actions) {
  const writeGuardPlans = {};
  const unique = new Set(actions);
  if (unique.size !== actions.length) throw new Error(`${functionName} contains duplicate actions`);
  actions.forEach((action) => {
    const contract = CLOUD_ACTION_REGISTRY[action];
    if (contract.functionName !== functionName) {
      throw new Error(`${action} is not registered to ${functionName}`);
    }
    if (contract.writableCollections.length > 0) writeGuardPlans[action] = defineWriteGuardPlan(action);
  });
  const main = async (event) => {
    const requestId = responseRequestId(event);
    try {
      const request = validateCallEnvelope(event, actions);
      return apiFailure(request.requestId, ApiErrorCode.NOT_IMPLEMENTED, "This action is registered but not implemented.", {
        retryable: false,
        details: {
          code: ApiErrorCode.NOT_IMPLEMENTED,
          action: request.action,
          contractVersion: "1.0.0"
        }
      });
    } catch (error) {
      return safeFailureFromError(
        requestId,
        error instanceof Error ? error : new Error("Non-error thrown at cloud boundary")
      );
    }
  };
  return Object.freeze({
    actions: Object.freeze([...actions]),
    writeGuardPlans: Object.freeze({ ...writeGuardPlans }),
    main
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createNotImplementedEndpoint
});
