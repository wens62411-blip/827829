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

// cloudfunctions/socialApi/index.ts
var socialApi_exports = {};
__export(socialApi_exports, {
  ACTIONS: () => ACTIONS,
  auditPublicVerificationClaim: () => auditPublicVerificationClaim,
  createInMemorySocialRepository: () => createInMemorySocialRepository,
  createSocialApiEndpoint: () => createSocialApiEndpoint,
  endpoint: () => endpoint,
  main: () => main
});
module.exports = __toCommonJS(socialApi_exports);

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

// miniprogram/shared/types/enums.ts
var RecordOrigin = {
  REAL: "REAL",
  SYNTHETIC: "SYNTHETIC"
};
var VerificationState = {
  USER_DECLARED: "USER_DECLARED",
  AI_CONSISTENCY_CHECKED: "AI_CONSISTENCY_CHECKED",
  HUMAN_REVIEWED: "HUMAN_REVIEWED",
  NOT_APPLICABLE: "NOT_APPLICABLE"
};
var ReviewStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  NEEDS_CHANGES: "NEEDS_CHANGES",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED"
};
var FriendshipState = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  REMOVED: "REMOVED"
};
var EventState = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  PUBLISHED: "PUBLISHED",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED"
};
var PublicationState = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "UNPUBLISHED",
  REJECTED: "REJECTED"
};
var MediaRightsState = {
  UNVERIFIED: "UNVERIFIED",
  CLAIMED: "CLAIMED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED"
};
var ProjectionInvalidationKind = {
  RELATIONSHIP_CHANGED: "RELATIONSHIP_CHANGED",
  VERIFICATION_CHANGED: "VERIFICATION_CHANGED",
  EVENT_CHANGED: "EVENT_CHANGED",
  CONTENT_CHANGED: "CONTENT_CHANGED",
  MEDIA_RIGHTS_CHANGED: "MEDIA_RIGHTS_CHANGED"
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

// cloudfunctions/_shared/auth/index.ts
var OPENID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
function requireTrustedOpenId(getWxContext) {
  if (typeof getWxContext !== "function") {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "Authentication is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
  const openId = getWxContext().OPENID;
  if (typeof openId !== "string" || !OPENID_PATTERN.test(openId)) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "Authentication is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
  return openId;
}
async function requireTrustedPrincipal(getWxContext, loadPrincipal) {
  const openId = requireTrustedOpenId(getWxContext);
  const principal = await loadPrincipal(openId);
  if (principal === null || principal.openId !== openId) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "Authentication is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
  if (principal.accountState !== "ACTIVE") {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "This account cannot perform the action.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "ACTIVE_ACCOUNT_REQUIRED" }
    });
  }
  return Object.freeze({ ...principal, roles: Object.freeze([...principal.roles]) });
}

// cloudfunctions/_shared/audit/index.ts
function createAuditAppend(input) {
  return Object.freeze({ ...input });
}

// cloudfunctions/_shared/errors/envelope.ts
var import_node_crypto = require("node:crypto");

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
function requireExpectedVersion(expectedVersion, currentVersion) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "expectedVersion must be a positive integer.", {
      details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field: "expectedVersion", rule: "POSITIVE_INTEGER" }] }
    });
  }
  if (expectedVersion !== currentVersion) {
    throw new SafeApiError(ApiErrorCode.VERSION_CONFLICT, "The resource was changed by another request.", {
      details: {
        code: ApiErrorCode.VERSION_CONFLICT,
        expectedVersion,
        currentVersion
      }
    });
  }
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
  const main2 = async (event) => {
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
    main: main2
  });
}

// cloudfunctions/_shared/idempotency/index.ts
var import_node_crypto2 = require("node:crypto");
var IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
function requireIdempotencyKey(value) {
  if (typeof value !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "A valid idempotencyKey is required for writes.", {
      details: {
        code: ApiErrorCode.VALIDATION_FAILED,
        issues: [{ field: "idempotencyKey", rule: "STABLE_16_TO_128_CHARS" }]
      }
    });
  }
  return value;
}
function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const objectValue = value;
  return `{${Object.keys(objectValue).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(objectValue[key])}`).join(",")}}`;
}
function fingerprintPayload(payload) {
  return (0, import_node_crypto2.createHash)("sha256").update(canonicalize(payload), "utf8").digest("hex");
}
function createIdempotencyClaim(input) {
  const namespace = `${input.functionName}:${input.action}:${input.openId}:${input.key}`;
  return Object.freeze({
    namespace,
    requestFingerprint: fingerprintPayload(input.payload),
    requestId: input.requestId,
    expiresAt: input.expiresAt
  });
}
function assertIdempotencyCompatible(claim, existing) {
  if (existing === null) return "NEW";
  if (existing.namespace !== claim.namespace || existing.requestFingerprint !== claim.requestFingerprint) {
    throw new SafeApiError(ApiErrorCode.IDEMPOTENCY_CONFLICT, "The idempotency key was used for another request.", {
      details: { code: ApiErrorCode.IDEMPOTENCY_CONFLICT, firstRequestId: existing.requestId }
    });
  }
  return existing.status === "COMPLETED" ? "REPLAY" : "IN_PROGRESS";
}

// miniprogram/shared/types/primitives.ts
var IanaTimezone = {
  ASIA_SHANGHAI: "Asia/Shanghai",
  EUROPE_ZURICH: "Europe/Zurich",
  EUROPE_ROME: "Europe/Rome",
  EUROPE_PARIS: "Europe/Paris",
  AUSTRALIA_MELBOURNE: "Australia/Melbourne",
  AUSTRALIA_SYDNEY: "Australia/Sydney",
  ASIA_SINGAPORE: "Asia/Singapore",
  AMERICA_TORONTO: "America/Toronto",
  AMERICA_VANCOUVER: "America/Vancouver"
};

// miniprogram/shared/constants/geography.ts
var GLOBAL_ID = "global";
var RegionId = {
  ASIA_PACIFIC: "asia-pacific",
  EUROPE: "europe",
  NORTH_AMERICA: "north-america"
};
var CountryId = {
  CN: "cn",
  CH: "ch",
  IT: "it",
  FR: "fr",
  AU: "au",
  SG: "sg",
  CA: "ca"
};
var CityId = {
  CN_BEIJING: "cn-beijing",
  CN_SHANGHAI: "cn-shanghai",
  CN_GUANGZHOU: "cn-guangzhou",
  CN_SHENZHEN: "cn-shenzhen",
  CN_HANGZHOU: "cn-hangzhou",
  CH_ZURICH: "ch-zurich",
  IT_MILAN: "it-milan",
  FR_PARIS: "fr-paris",
  AU_MELBOURNE: "au-melbourne",
  AU_SYDNEY: "au-sydney",
  SG_SINGAPORE: "sg-singapore",
  CA_TORONTO: "ca-toronto",
  CA_VANCOUVER: "ca-vancouver"
};
var REGION_DIRECTORY = [
  { id: RegionId.ASIA_PACIFIC, parentId: GLOBAL_ID, name: { zh: "\u4E9A\u592A", en: "Asia Pacific" } },
  { id: RegionId.EUROPE, parentId: GLOBAL_ID, name: { zh: "\u6B27\u6D32", en: "Europe" } },
  { id: RegionId.NORTH_AMERICA, parentId: GLOBAL_ID, name: { zh: "\u5317\u7F8E", en: "North America" } }
];
var COUNTRY_DIRECTORY = [
  { id: CountryId.CN, parentId: RegionId.ASIA_PACIFIC, name: { zh: "\u4E2D\u56FD", en: "China" } },
  { id: CountryId.CH, parentId: RegionId.EUROPE, name: { zh: "\u745E\u58EB", en: "Switzerland" } },
  { id: CountryId.IT, parentId: RegionId.EUROPE, name: { zh: "\u610F\u5927\u5229", en: "Italy" } },
  { id: CountryId.FR, parentId: RegionId.EUROPE, name: { zh: "\u6CD5\u56FD", en: "France" } },
  { id: CountryId.AU, parentId: RegionId.ASIA_PACIFIC, name: { zh: "\u6FB3\u5927\u5229\u4E9A", en: "Australia" } },
  { id: CountryId.SG, parentId: RegionId.ASIA_PACIFIC, name: { zh: "\u65B0\u52A0\u5761", en: "Singapore" } },
  { id: CountryId.CA, parentId: RegionId.NORTH_AMERICA, name: { zh: "\u52A0\u62FF\u5927", en: "Canada" } }
];
var CITY_DIRECTORY = [
  { id: CityId.CN_BEIJING, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u5317\u4EAC", en: "Beijing" }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_SHANGHAI, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u4E0A\u6D77", en: "Shanghai" }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_GUANGZHOU, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u5E7F\u5DDE", en: "Guangzhou" }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_SHENZHEN, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u6DF1\u5733", en: "Shenzhen" }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CN_HANGZHOU, parentId: CountryId.CN, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u676D\u5DDE", en: "Hangzhou" }, timezone: IanaTimezone.ASIA_SHANGHAI },
  { id: CityId.CH_ZURICH, parentId: CountryId.CH, regionId: RegionId.EUROPE, name: { zh: "\u82CF\u9ECE\u4E16", en: "Zurich" }, timezone: IanaTimezone.EUROPE_ZURICH },
  { id: CityId.IT_MILAN, parentId: CountryId.IT, regionId: RegionId.EUROPE, name: { zh: "\u7C73\u5170", en: "Milan" }, timezone: IanaTimezone.EUROPE_ROME },
  { id: CityId.FR_PARIS, parentId: CountryId.FR, regionId: RegionId.EUROPE, name: { zh: "\u5DF4\u9ECE", en: "Paris" }, timezone: IanaTimezone.EUROPE_PARIS },
  { id: CityId.AU_MELBOURNE, parentId: CountryId.AU, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u58A8\u5C14\u672C", en: "Melbourne" }, timezone: IanaTimezone.AUSTRALIA_MELBOURNE },
  { id: CityId.AU_SYDNEY, parentId: CountryId.AU, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u6089\u5C3C", en: "Sydney" }, timezone: IanaTimezone.AUSTRALIA_SYDNEY },
  { id: CityId.SG_SINGAPORE, parentId: CountryId.SG, regionId: RegionId.ASIA_PACIFIC, name: { zh: "\u65B0\u52A0\u5761", en: "Singapore" }, timezone: IanaTimezone.ASIA_SINGAPORE },
  { id: CityId.CA_TORONTO, parentId: CountryId.CA, regionId: RegionId.NORTH_AMERICA, name: { zh: "\u591A\u4F26\u591A", en: "Toronto" }, timezone: IanaTimezone.AMERICA_TORONTO },
  { id: CityId.CA_VANCOUVER, parentId: CountryId.CA, regionId: RegionId.NORTH_AMERICA, name: { zh: "\u6E29\u54E5\u534E", en: "Vancouver" }, timezone: IanaTimezone.AMERICA_VANCOUVER }
];

// cloudfunctions/_shared/projections/index.ts
var UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
var STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
var PROJECTION_FIELDS = Object.freeze({
  ViewerRelationshipProjection: Object.freeze([
    "version",
    "createdAt",
    "updatedAt",
    "viewerUserId",
    "subjectUserId",
    "friendshipId",
    "friendshipState",
    "viewerBlockedSubject",
    "subjectBlockedViewer",
    "mayViewFriendsOnlyFields",
    "sourceVersion"
  ]),
  PublicVerificationClaimProjection: Object.freeze([
    "version",
    "createdAt",
    "updatedAt",
    "claimId",
    "subjectUserId",
    "labelId",
    "labelText",
    "reviewStatus",
    "verificationState",
    "publicVisible",
    "validFrom",
    "validUntil"
  ]),
  PublicEventProjection: Object.freeze([
    "version",
    "createdAt",
    "updatedAt",
    "eventId",
    "clubNodeId",
    "organizerId",
    "cityId",
    "title",
    "summary",
    "startsAt",
    "endsAt",
    "timezone",
    "state",
    "publicationState",
    "reservationAvailable",
    "coverAssetId",
    "origin",
    "verificationState"
  ]),
  ReviewCaseProjection: Object.freeze([
    "version",
    "createdAt",
    "updatedAt",
    "reviewCaseId",
    "domain",
    "aggregateId",
    "status",
    "title",
    "summary",
    "submitterUserId",
    "evidenceAssetIds",
    "assignedReviewerUserId"
  ])
});
var RELATIONSHIP_REVOCATION_STATES = Object.freeze([
  FriendshipState.REMOVED,
  FriendshipState.CANCELLED,
  FriendshipState.REJECTED
]);
var VERIFICATION_REVOCATION_STATES = Object.freeze([
  ReviewStatus.REJECTED,
  ReviewStatus.EXPIRED,
  ReviewStatus.REVOKED
]);
var EVENT_REVOCATION_STATES = Object.freeze([
  EventState.CANCELLED,
  EventState.PAUSED,
  EventState.REJECTED
]);
var CONTENT_REVOCATION_STATES = Object.freeze([
  PublicationState.UNPUBLISHED,
  PublicationState.REJECTED
]);
var MEDIA_REVOCATION_STATES = Object.freeze([
  MediaRightsState.REJECTED,
  MediaRightsState.EXPIRED,
  MediaRightsState.REVOKED
]);
function rejectUnexpectedFields(record, allowedFields, projectionType) {
  const unexpected = Object.keys(record).filter((field) => !allowedFields.includes(field));
  if (unexpected.length > 0) {
    throw new Error(`${projectionType} contains forbidden fields: ${unexpected.sort().join(",")}`);
  }
}
function requireLocalizedName(record, field) {
  const value = record[field];
  if (!isPlainRecord(value)) throw new Error(`Invalid ${field}`);
  rejectUnexpectedFields(value, ["zh", "en"], field);
  requireString(value, "zh");
  requireString(value, "en");
}
function requireString(record, field) {
  const value = record[field];
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid ${field}`);
  return value;
}
function requireBoolean(record, field) {
  const value = record[field];
  if (typeof value !== "boolean") throw new Error(`Invalid ${field}`);
  return value;
}
function requireOptionalString(record, field) {
  const value = record[field];
  if (value !== void 0 && (typeof value !== "string" || value.length === 0)) {
    throw new Error(`Invalid ${field}`);
  }
}
function requireEnum(record, field, allowed) {
  const value = requireString(record, field);
  if (!allowed.includes(value)) throw new Error(`Invalid ${field}`);
  return value;
}
function requireVersion(record, field = "version") {
  const value = record[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${field}`);
  return value;
}
function requireUtc(record, field) {
  const value = requireString(record, field);
  if (!UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`Invalid ${field}`);
  return value;
}
function cloneAndFreeze(value) {
  const clone2 = JSON.parse(JSON.stringify(value));
  const freeze = (candidate) => {
    Object.values(candidate).forEach((child) => {
      if (child !== null && typeof child === "object" && !Object.isFrozen(child)) freeze(child);
    });
    Object.freeze(candidate);
  };
  if (clone2 !== null && typeof clone2 === "object") freeze(clone2);
  return clone2;
}
function validateVersioned(record) {
  requireVersion(record);
  const createdAt = requireUtc(record, "createdAt");
  const updatedAt = requireUtc(record, "updatedAt");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error("updatedAt must not precede createdAt");
}
function validateRelationship(record) {
  validateVersioned(record);
  requireString(record, "viewerUserId");
  requireString(record, "subjectUserId");
  requireOptionalString(record, "friendshipId");
  requireBoolean(record, "viewerBlockedSubject");
  requireBoolean(record, "subjectBlockedViewer");
  requireBoolean(record, "mayViewFriendsOnlyFields");
  requireVersion(record, "sourceVersion");
  const state = record.friendshipState;
  const allowed = Object.values(FriendshipState);
  if (state !== void 0 && (typeof state !== "string" || !allowed.includes(state))) {
    throw new Error("Invalid friendshipState");
  }
  if ((record.viewerBlockedSubject === true || record.subjectBlockedViewer === true) && record.mayViewFriendsOnlyFields === true) {
    throw new Error("Blocked relationships cannot grant friend visibility");
  }
  if (record.mayViewFriendsOnlyFields === true && record.friendshipState !== FriendshipState.ACCEPTED) {
    throw new Error("Friends-only visibility requires an accepted friendship");
  }
}
function validatePublicClaim(record) {
  validateVersioned(record);
  requireString(record, "claimId");
  requireString(record, "subjectUserId");
  requireString(record, "labelId");
  requireLocalizedName(record, "labelText");
  requireUtc(record, "validFrom");
  if (record.validUntil !== void 0) requireUtc(record, "validUntil");
  if (typeof record.validUntil === "string" && Date.parse(record.validUntil) <= Date.parse(record.validFrom)) {
    throw new Error("validUntil must be after validFrom");
  }
  if (record.reviewStatus !== ReviewStatus.APPROVED || record.verificationState !== VerificationState.HUMAN_REVIEWED || record.publicVisible !== true) {
    throw new Error("Only active human-approved claims are public projections");
  }
}
function validatePublicEvent(record) {
  validateVersioned(record);
  requireString(record, "eventId");
  requireString(record, "clubNodeId");
  requireString(record, "organizerId");
  requireString(record, "cityId");
  requireString(record, "title");
  requireString(record, "summary");
  const startsAt = requireUtc(record, "startsAt");
  const endsAt = requireUtc(record, "endsAt");
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error("endsAt must be after startsAt");
  const timezone = requireEnum(record, "timezone", Object.values(IanaTimezone));
  const city = CITY_DIRECTORY.find((entry) => entry.id === record.cityId);
  if (city === void 0 || city.timezone !== timezone) {
    throw new Error("Event timezone must match the frozen city directory");
  }
  requireEnum(record, "state", Object.values(EventState));
  requireEnum(record, "publicationState", Object.values(PublicationState));
  requireBoolean(record, "reservationAvailable");
  requireOptionalString(record, "coverAssetId");
  requireEnum(record, "origin", Object.values(RecordOrigin));
  requireEnum(record, "verificationState", Object.values(VerificationState));
  if (record.state !== EventState.PUBLISHED || record.publicationState !== PublicationState.PUBLISHED) {
    if (record.reservationAvailable === true) throw new Error("Unavailable events cannot be reservable");
  }
}
function validateReviewCase(record) {
  validateVersioned(record);
  requireString(record, "reviewCaseId");
  requireEnum(record, "domain", ["SOCIAL", "EVENT", "CONTENT", "ORGANIZER", "REPORT"]);
  requireString(record, "aggregateId");
  requireEnum(record, "status", Object.values(ReviewStatus));
  requireString(record, "title");
  requireString(record, "summary");
  requireOptionalString(record, "submitterUserId");
  requireOptionalString(record, "assignedReviewerUserId");
  if (!Array.isArray(record.evidenceAssetIds) || !record.evidenceAssetIds.every((assetId) => typeof assetId === "string" && assetId.length > 0)) {
    throw new Error("Invalid evidenceAssetIds");
  }
}
function parseReadOnlyProjection(kind, value) {
  if (!isPlainRecord(value)) throw new Error(`Invalid ${kind}`);
  rejectUnexpectedFields(value, PROJECTION_FIELDS[kind], kind);
  switch (kind) {
    case "ViewerRelationshipProjection":
      validateRelationship(value);
      break;
    case "PublicVerificationClaimProjection":
      validatePublicClaim(value);
      break;
    case "PublicEventProjection":
      validatePublicEvent(value);
      break;
    case "ReviewCaseProjection":
      validateReviewCase(value);
      break;
  }
  return cloneAndFreeze(value);
}
function createProjectionInvalidation(input) {
  if (!STABLE_ID_PATTERN.test(input.eventId) || !STABLE_ID_PATTERN.test(input.sourceAggregateId) || !STABLE_ID_PATTERN.test(input.requestId) || !Number.isSafeInteger(input.sourceVersion) || input.sourceVersion < 1 || !UTC_PATTERN.test(input.occurredAt) || Number.isNaN(Date.parse(input.occurredAt)) || input.reason.trim().length === 0 || input.reason.length > 240 || !Object.values(ProjectionInvalidationKind).includes(input.kind)) {
    throw new Error("Invalid ProjectionInvalidation");
  }
  return Object.freeze({
    eventId: input.eventId,
    kind: input.kind,
    sourceAggregateId: input.sourceAggregateId,
    sourceVersion: input.sourceVersion,
    occurredAt: input.occurredAt,
    reason: input.reason,
    requestId: input.requestId
  });
}

// cloudfunctions/socialApi/index.ts
var ACTIONS = [
  "friend.request",
  "friend.listIncoming",
  "friend.listAccepted",
  "friend.accept",
  "friend.reject",
  "friend.cancel",
  "friend.remove",
  "block.create",
  "block.remove",
  "report.create",
  "tag.catalog",
  "verification.createDraft",
  "verification.uploadPolicy",
  "verification.submit",
  "verification.listMine",
  "verification.getMine",
  "verification.withdraw"
];
function clone(value) {
  if (value === void 0) return value;
  return JSON.parse(JSON.stringify(value));
}
var InMemorySocialRepository = class {
  state;
  queue = Promise.resolve();
  constructor(seed) {
    this.state = {
      principals: clone([...seed.principals ?? seed.users ?? []]),
      cards: clone([...seed.cards ?? []]),
      labels: clone([...seed.labels ?? []]),
      friendships: clone([...seed.friendships ?? []]),
      blocksReports: clone([...seed.blocksReports ?? []]),
      verificationRequests: clone([...seed.verificationRequests ?? []]),
      mediaAssets: clone([...seed.mediaAssets ?? []]),
      reviewLogs: clone([...seed.reviewLogs ?? []]),
      verificationClaims: clone([...seed.verificationClaims ?? []]),
      idempotencyKeys: [],
      auditLogs: [],
      projectionInvalidations: []
    };
    assertStateIntegrity(this.state);
  }
  async loadPrincipal(openId) {
    await this.queue;
    const principal = this.state.principals.find((candidate) => candidate.openId === openId);
    return principal === void 0 ? null : clone(principal);
  }
  async read(operation) {
    await this.queue;
    return operation(clone(this.state));
  }
  async runTransaction(operation) {
    let release;
    const previous = this.queue;
    this.queue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    const draft = clone(this.state);
    try {
      const result = await operation(draft);
      this.state = draft;
      return clone(result);
    } finally {
      release?.();
    }
  }
  snapshot() {
    return clone(this.state);
  }
  async markMediaUploaded(mediaAssetId, uploadedAt) {
    assertUtc(uploadedAt, "uploadedAt");
    await this.runTransaction((state) => {
      const asset = state.mediaAssets.find((candidate) => candidate._id === mediaAssetId);
      if (asset === void 0) throw new Error("Unknown media asset");
      asset.uploadedAt = uploadedAt;
      asset.updatedAt = uploadedAt;
      asset.version += 1;
    });
  }
};
function createInMemorySocialRepository(seed = {}) {
  return new InMemorySocialRepository(seed);
}
function assertStateIntegrity(state) {
  const openIds = /* @__PURE__ */ new Set();
  const userIds = /* @__PURE__ */ new Set();
  for (const principal of state.principals) {
    if (openIds.has(principal.openId)) throw new Error("Duplicate principal openId");
    openIds.add(principal.openId);
    if (principal.userId !== void 0) {
      if (userIds.has(principal.userId)) throw new Error("Duplicate principal userId");
      userIds.add(principal.userId);
    }
  }
  const pairs = /* @__PURE__ */ new Set();
  for (const friendship of state.friendships) {
    const normalized = pairKey(friendship.requesterUserId, friendship.addresseeUserId);
    if (friendship.pairKey !== normalized) throw new Error("Friendship pairKey does not match its participants");
    if (pairs.has(normalized)) throw new Error("Duplicate normalized friendship pair");
    pairs.add(normalized);
    if (!Object.values(FriendshipState).includes(friendship.state)) throw new Error("Invalid friendship state");
  }
  for (const request of state.verificationRequests) {
    if (!Object.values(ReviewStatus).includes(request.status)) {
      throw new Error("Invalid verification request status");
    }
  }
}
function pairKey(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort().join("::");
}
function isUtc(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
}
function assertUtc(value, field) {
  if (!isUtc(value)) validation([{ field, rule: "RFC3339_UTC" }]);
}
function defaultNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function opaqueToken() {
  const cryptoCandidate = globalThis.crypto;
  if (cryptoCandidate !== void 0 && typeof cryptoCandidate.randomUUID === "function") {
    return cryptoCandidate.randomUUID();
  }
  throw new Error("Secure random identifier generation is unavailable");
}
function defaultCreateId(prefix) {
  return `${prefix}_${opaqueToken().replace(/-/g, "")}`;
}
function requestIdForFailure(event, createId) {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId;
  return createId("srv");
}
function invalidRequest(field, reason) {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The request contains an unsupported or malformed field.", {
    details: {
      code: ApiErrorCode.INVALID_REQUEST,
      ...field === void 0 ? {} : { field },
      reason
    }
  });
}
function validation(issues) {
  throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "The request did not pass validation.", {
    details: { code: ApiErrorCode.VALIDATION_FAILED, issues }
  });
}
function notFound(resourceType, resourceId) {
  throw new SafeApiError(ApiErrorCode.NOT_FOUND, "The requested resource was not found.", {
    details: {
      code: ApiErrorCode.NOT_FOUND,
      resourceType,
      ...resourceId === void 0 ? {} : { resourceId }
    }
  });
}
function forbidden(policy) {
  throw new SafeApiError(ApiErrorCode.FORBIDDEN, "This action is not allowed for the current account.", {
    details: { code: ApiErrorCode.FORBIDDEN, policy }
  });
}
function conflict(conflictType) {
  throw new SafeApiError(ApiErrorCode.CONFLICT, "The current resource state does not allow this action.", {
    details: { code: ApiErrorCode.CONFLICT, conflictType }
  });
}
function blocked() {
  throw new SafeApiError(ApiErrorCode.BLOCKED_RELATIONSHIP, "The relationship is blocked.", {
    details: { code: ApiErrorCode.BLOCKED_RELATIONSHIP, blocksAccess: true }
  });
}
function reviewTransition(from, to) {
  throw new SafeApiError(ApiErrorCode.REVIEW_INVALID_TRANSITION, "The review transition is not allowed.", {
    details: { code: ApiErrorCode.REVIEW_INVALID_TRANSITION, from, to }
  });
}
function exactPayload(payload, required, optional = []) {
  const allowed = /* @__PURE__ */ new Set([...required, ...optional, "contractVersion"]);
  const unexpected = Object.keys(payload).find((key) => !allowed.has(key));
  if (unexpected !== void 0) invalidRequest(unexpected, "UNEXPECTED_FIELD");
  const missing = required.find((key) => payload[key] === void 0);
  if (missing !== void 0) invalidRequest(missing, "REQUIRED_FIELD");
  if (payload.contractVersion !== void 0 && payload.contractVersion !== "1.0.0") {
    invalidRequest("contractVersion", "CONTRACT_VERSION_MISMATCH");
  }
}
function requireString2(value, field, options = {}) {
  if (typeof value !== "string" || value.trim().length < (options.min ?? 1) || value.length > (options.max ?? 256) || options.pattern !== void 0 && !options.pattern.test(value)) {
    validation([{ field, rule: "MALFORMED_STRING" }]);
  }
  return value;
}
function requireStableId(value, field) {
  return requireString2(value, field, { min: 6, max: 128, pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]+$/ });
}
function requireReadStableId(value, field) {
  if (typeof value !== "string" || value.length < 6 || value.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(value)) {
    invalidRequest(field, "MALFORMED_STABLE_ID");
  }
  return value;
}
function requireLimit(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 50) {
    invalidRequest("limit", "INTEGER_1_TO_50");
  }
  return value;
}
function requirePrincipalUserId(principal) {
  if (principal.userId === void 0) forbidden("PROFILE_REQUIRED");
  return principal.userId;
}
function ensureExpectedVersion(value, currentVersion) {
  if (value === void 0) return;
  requireExpectedVersion(value, currentVersion);
}
function requireMutationExpectedVersion(value, currentVersion) {
  if (value === void 0) validation([{ field: "expectedVersion", rule: "REQUIRED_FOR_MUTATION" }]);
  requireExpectedVersion(value, currentVersion);
}
function findActiveBlock(state, actorUserId, targetUserId) {
  return state.blocksReports.find((record) => record.recordType === "BLOCK" && record.actorUserId === actorUserId && record.targetId === targetUserId && record.state === "ACTIVE");
}
function pairIsBlocked(state, firstUserId, secondUserId) {
  return findActiveBlock(state, firstUserId, secondUserId) !== void 0 || findActiveBlock(state, secondUserId, firstUserId) !== void 0;
}
function requireActiveTargetUser(state, userId) {
  const principal = state.principals.find((candidate) => candidate.userId === userId);
  if (principal === void 0 || principal.accountState !== "ACTIVE") notFound("USER", userId);
}
function findFriendshipByPair(state, firstUserId, secondUserId) {
  const normalized = pairKey(firstUserId, secondUserId);
  return state.friendships.find((record) => record.pairKey === normalized && pairKey(record.requesterUserId, record.addresseeUserId) === normalized);
}
function findFriendshipForActor(state, friendshipId, actorUserId) {
  const record = state.friendships.find((candidate) => candidate._id === friendshipId);
  if (record === void 0 || record.requesterUserId !== actorUserId && record.addresseeUserId !== actorUserId) {
    notFound("FRIENDSHIP", friendshipId);
  }
  return record;
}
function otherParty(record, userId) {
  return record.requesterUserId === userId ? record.addresseeUserId : record.requesterUserId;
}
function relationshipProjection(state, viewerUserId, subjectUserId, evaluatedAt) {
  const friendship = findFriendshipByPair(state, viewerUserId, subjectUserId);
  const viewerBlock = findActiveBlock(state, viewerUserId, subjectUserId);
  const subjectBlock = findActiveBlock(state, subjectUserId, viewerUserId);
  const sourceRecords = [friendship, viewerBlock, subjectBlock].filter(
    (record) => record !== void 0
  );
  const sourceVersion = Math.max(1, ...sourceRecords.map((record) => record.version));
  const createdAt = sourceRecords.length === 0 ? evaluatedAt : [...sourceRecords].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0].createdAt;
  const updatedAt = sourceRecords.length === 0 ? evaluatedAt : [...sourceRecords].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0].updatedAt;
  return parseReadOnlyProjection("ViewerRelationshipProjection", {
    version: sourceVersion,
    createdAt,
    updatedAt,
    viewerUserId,
    subjectUserId,
    ...friendship === void 0 ? {} : {
      friendshipId: friendship._id,
      friendshipState: friendship.state
    },
    viewerBlockedSubject: viewerBlock !== void 0,
    subjectBlockedViewer: subjectBlock !== void 0,
    mayViewFriendsOnlyFields: friendship?.state === FriendshipState.ACCEPTED && viewerBlock === void 0 && subjectBlock === void 0,
    sourceVersion
  });
}
function verificationProjection(record) {
  return {
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    verificationRequestId: record._id,
    labelId: record.labelId,
    status: record.status,
    evidenceAssetIds: record.evidenceAssetIds.map((assetId) => assetId),
    ...record.reviewerNote === void 0 ? {} : { reviewerNote: record.reviewerNote }
  };
}
function labelProjection(record) {
  return {
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    labelId: record._id,
    name: clone(record.name),
    description: clone(record.description),
    enabled: record.enabled
  };
}
function reportProjection(record) {
  return {
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    reportId: record._id,
    targetType: record.targetType ?? "USER",
    targetId: record.targetId,
    status: record.state,
    reasonCode: record.reasonCode ?? "OTHER"
  };
}
function appendInvalidation(state, input) {
  state.projectionInvalidations.push(createProjectionInvalidation({
    eventId: input.createId("projection"),
    kind: input.kind === "RELATIONSHIP_CHANGED" ? ProjectionInvalidationKind.RELATIONSHIP_CHANGED : ProjectionInvalidationKind.VERIFICATION_CHANGED,
    sourceAggregateId: input.sourceAggregateId,
    sourceVersion: input.sourceVersion,
    occurredAt: input.occurredAt,
    reason: input.reason,
    requestId: input.requestId
  }));
}
function cursorChecksum(filter) {
  let hash = 2166136261;
  for (const character of filter) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function invalidCursor(reason) {
  throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, "The pagination cursor is invalid.", {
    details: { code: ApiErrorCode.INVALID_CURSOR, reason }
  });
}
function decodeCursor(value, filter) {
  if (value === void 0) return 0;
  if (typeof value !== "string") invalidCursor("MALFORMED");
  const match = /^social:(\d+):([a-z0-9]+)$/.exec(value);
  if (match === null) invalidCursor("MALFORMED");
  if (match[2] !== cursorChecksum(filter)) invalidCursor("FILTER_MISMATCH");
  const offset = Number(match[1]);
  if (!Number.isSafeInteger(offset) || offset < 0) invalidCursor("MALFORMED");
  return offset;
}
function paginate(items, limit, cursor, filter) {
  const offset = decodeCursor(cursor, filter);
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;
  const hasMore = nextOffset < items.length;
  return {
    items: pageItems,
    ...hasMore ? { nextCursor: `social:${nextOffset}:${cursorChecksum(filter)}` } : {},
    hasMore
  };
}
function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason);
}
function auditPublicVerificationClaim(input) {
  const { claim, label, reviewLogs, evaluatedAt } = input;
  const reasons = [];
  const reviewStatus = claim.reviewStatus;
  if (reviewStatus === ReviewStatus.REVOKED || claim.revokedAt !== void 0) addReason(reasons, "CLAIM_REVOKED");
  if (reviewStatus !== ReviewStatus.APPROVED) addReason(reasons, "REVIEW_STATUS_NOT_APPROVED");
  if (claim.verificationState !== VerificationState.HUMAN_REVIEWED) addReason(reasons, "HUMAN_REVIEW_REQUIRED");
  if (claim.publicVisible !== true) addReason(reasons, "PUBLIC_VISIBILITY_DISABLED");
  if (claim.userSelectedPublic !== true) addReason(reasons, "USER_PUBLIC_OPT_IN_REQUIRED");
  if (label.enabled !== true) addReason(reasons, "LABEL_DISABLED");
  if (label.category !== "PUBLIC_IDENTITY_TAG" && label.category !== "PUBLIC_INTEREST_TAG") {
    addReason(reasons, "LABEL_CATEGORY_NOT_PUBLIC");
  }
  const expectedLabelId = label._id ?? label.labelId;
  if (typeof expectedLabelId !== "string" || claim.labelId !== expectedLabelId) {
    addReason(reasons, "LABEL_MISMATCH");
  }
  if (label.publicEligible !== true) addReason(reasons, "LABEL_NOT_PUBLIC_ELIGIBLE");
  if (label.riskClass === "WEALTH_ASSET_FAMILY") {
    if (label.complianceGate !== "ENABLED") addReason(reasons, "COMPLIANCE_GATE_DISABLED");
    const configuredReviewCount = typeof label.requiredHumanReviewCount === "number" && Number.isSafeInteger(label.requiredHumanReviewCount) ? label.requiredHumanReviewCount : 0;
    const requiredReviewCount = Math.max(2, configuredReviewCount);
    const distinctHumanReviewers = new Set(reviewLogs.filter((log) => log.claimId === claim.claimId && log.verificationRequestId === claim.verificationRequestId && log.decision === "APPROVED" && log.action === "review.approve" && log.result === "SUCCEEDED" && log.source === "HUMAN" && (log.actorRole === "REVIEWER" || log.actorRole === "ADMIN") && typeof log.reviewedBy === "string" && log.reviewedBy.length > 0 && typeof log.reviewScope === "string" && log.reviewScope === claim.reviewScope && typeof log.reviewedAt === "string" && isUtc(log.reviewedAt) && isUtc(evaluatedAt) && Date.parse(log.reviewedAt) <= Date.parse(evaluatedAt)).map((log) => log.reviewedBy));
    if (distinctHumanReviewers.size < requiredReviewCount) {
      addReason(reasons, "DUAL_HUMAN_REVIEW_REQUIRED");
    }
  }
  if (typeof claim.reviewedBy !== "string" || claim.reviewedBy.length === 0) {
    addReason(reasons, "REVIEWED_BY_REQUIRED");
  }
  if (claim.reviewedAt === void 0 || claim.reviewedAt === "") {
    addReason(reasons, "REVIEWED_AT_REQUIRED");
  } else if (!isUtc(claim.reviewedAt)) {
    addReason(reasons, "REVIEWED_AT_INVALID");
  }
  if (typeof claim.reviewScope !== "string" || claim.reviewScope.length === 0) {
    addReason(reasons, "REVIEW_SCOPE_REQUIRED");
  } else if (claim.reviewScope !== label.category) {
    addReason(reasons, "REVIEW_SCOPE_MISMATCH");
  }
  if (reviewLogs.length === 0 || typeof claim.reviewLogId !== "string") {
    addReason(reasons, "MISSING_REVIEW_LOG");
  }
  const matchingIdLog = typeof claim.reviewLogId === "string" ? reviewLogs.find((log) => (log.reviewLogId ?? log._id) === claim.reviewLogId) : void 0;
  if (matchingIdLog !== void 0) {
    if (matchingIdLog.claimId !== claim.claimId || matchingIdLog.verificationRequestId !== claim.verificationRequestId || matchingIdLog.reviewedBy !== claim.reviewedBy || matchingIdLog.reviewedAt !== claim.reviewedAt || matchingIdLog.reviewScope !== claim.reviewScope) {
      addReason(reasons, "REVIEW_LOG_MISMATCH");
    }
    if (matchingIdLog.decision !== "APPROVED" || matchingIdLog.action !== "review.approve" || matchingIdLog.result !== "SUCCEEDED") {
      addReason(reasons, "VALID_REVIEW_LOG_REQUIRED");
    }
    if (matchingIdLog.source !== "HUMAN" || matchingIdLog.actorRole !== "REVIEWER" && matchingIdLog.actorRole !== "ADMIN") {
      addReason(reasons, "HUMAN_REVIEW_REQUIRED");
    }
  } else if (reviewLogs.length > 0 && typeof claim.reviewLogId === "string") {
    addReason(reasons, "REVIEW_LOG_MISMATCH");
  }
  if (!isUtc(evaluatedAt)) addReason(reasons, "EVALUATED_AT_INVALID");
  if (!isUtc(claim.validFrom)) addReason(reasons, "CLAIM_VALID_FROM_INVALID");
  if (claim.validUntil !== void 0 && !isUtc(claim.validUntil)) {
    addReason(reasons, "CLAIM_VALID_UNTIL_INVALID");
  }
  if (isUtc(evaluatedAt) && isUtc(claim.reviewedAt) && Date.parse(claim.reviewedAt) > Date.parse(evaluatedAt)) {
    addReason(reasons, "REVIEWED_AT_IN_FUTURE");
  }
  if (isUtc(evaluatedAt) && isUtc(claim.validFrom)) {
    if (Date.parse(evaluatedAt) < Date.parse(claim.validFrom)) addReason(reasons, "CLAIM_NOT_YET_VALID");
    if (isUtc(claim.validUntil)) {
      if (Date.parse(claim.validUntil) <= Date.parse(claim.validFrom)) {
        addReason(reasons, "CLAIM_VALIDITY_RANGE_INVALID");
      } else if (Date.parse(evaluatedAt) >= Date.parse(claim.validUntil)) {
        addReason(reasons, "CLAIM_EXPIRED");
      }
    }
  }
  if (reasons.length > 0) return Object.freeze({ eligible: false, reasons: Object.freeze(reasons) });
  const projection = parseReadOnlyProjection("PublicVerificationClaimProjection", {
    version: claim.version,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    claimId: claim.claimId,
    subjectUserId: claim.subjectUserId,
    labelId: label._id ?? label.labelId,
    labelText: label.name,
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    publicVisible: true,
    validFrom: claim.validFrom,
    ...claim.validUntil === void 0 ? {} : { validUntil: claim.validUntil }
  });
  return Object.freeze({ eligible: true, reasons: Object.freeze([]), projection });
}
function success(data, requestId) {
  return { ok: true, data, requestId };
}
function auditedClaimsForSubject(state, subjectUserId, evaluatedAt) {
  const projections = [];
  for (const claim of state.verificationClaims) {
    if (claim.subjectUserId !== subjectUserId || typeof claim.labelId !== "string") continue;
    const label = state.labels.find((candidate) => candidate._id === claim.labelId);
    if (label === void 0) continue;
    const audit = auditPublicVerificationClaim({
      claim,
      label,
      reviewLogs: state.reviewLogs,
      evaluatedAt
    });
    if (audit.eligible && audit.projection !== void 0) projections.push(audit.projection);
  }
  return projections;
}
function sanitizeCard(state, card, mayViewFriendsOnlyFields, evaluatedAt) {
  const exposesOptionalFields = card.visibility === "PUBLIC" || card.visibility === "FRIENDS_ONLY" && mayViewFriendsOnlyFields;
  const claims = card.visibility === "PRIVATE" ? [] : auditedClaimsForSubject(state, card.ownerUserId, evaluatedAt);
  return {
    version: card.version,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    cardId: card.cardId,
    ownerUserId: card.ownerUserId,
    displayName: card.displayName,
    ...!exposesOptionalFields || card.headline === void 0 ? {} : { headline: card.headline },
    ...!exposesOptionalFields || card.cityId === void 0 ? {} : { cityId: card.cityId },
    ...!exposesOptionalFields || card.avatarUrl === void 0 ? {} : { avatarUrl: card.avatarUrl },
    ...!exposesOptionalFields || card.biography === void 0 ? {} : { biography: card.biography },
    visibility: card.visibility,
    claims,
    origin: card.origin,
    verificationState: card.verificationState
  };
}
function mediaRightsRequired(mediaAssetIds) {
  throw new SafeApiError(ApiErrorCode.MEDIA_RIGHTS_REQUIRED, "The private evidence is missing or outside its upload authorization.", {
    details: {
      code: ApiErrorCode.MEDIA_RIGHTS_REQUIRED,
      mediaAssetIds: mediaAssetIds.map((id) => id)
    }
  });
}
async function idempotentMutation(dependencies, principal, action, requestId, payload, operation) {
  const openId = principal.openId;
  const userId = requirePrincipalUserId(principal);
  const idempotencyKey = requireIdempotencyKey(payload.idempotencyKey);
  const now = dependencies.now();
  assertUtc(now, "now");
  const claim = createIdempotencyClaim({
    functionName: "socialApi",
    action,
    openId,
    key: idempotencyKey,
    payload,
    requestId,
    expiresAt: new Date(Date.parse(now) + 24 * 60 * 60 * 1e3).toISOString()
  });
  return dependencies.repository.runTransaction(async (state) => {
    const existing = state.idempotencyKeys.find((record) => record.namespace === claim.namespace) ?? null;
    const compatibility = assertIdempotencyCompatible(claim, existing);
    if (compatibility === "REPLAY" && existing !== null) return existing.result;
    if (compatibility === "IN_PROGRESS") conflict("IDEMPOTENCY_IN_PROGRESS");
    const mutation = await operation(state, now);
    const actorRole = principal.roles[0] ?? "MEMBER";
    const audit = createAuditAppend({
      auditEntryId: dependencies.createId("audit"),
      actorUserId: userId,
      actorRole,
      action,
      targetType: mutation.targetType,
      targetId: mutation.targetId,
      requestId,
      occurredAt: now,
      result: "SUCCEEDED"
    });
    state.auditLogs.push(audit);
    state.idempotencyKeys.push({
      ...claim,
      status: "COMPLETED",
      result: clone(mutation.data)
    });
    return mutation.data;
  });
}
function requestFriend(dependencies, principal, requestId, payload) {
  exactPayload(payload, ["recipientUserId", "idempotencyKey"], ["message", "expectedVersion"]);
  const recipientUserId = requireStableId(payload.recipientUserId, "recipientUserId");
  const requesterUserId = requirePrincipalUserId(principal);
  if (recipientUserId === requesterUserId) validation([{ field: "recipientUserId", rule: "MUST_DIFFER_FROM_ACTOR" }]);
  const message = payload.message === void 0 ? void 0 : requireString2(payload.message, "message", { max: 200 });
  return idempotentMutation(dependencies, principal, "friend.request", requestId, payload, (state, now) => {
    requireActiveTargetUser(state, recipientUserId);
    if (pairIsBlocked(state, requesterUserId, recipientUserId)) blocked();
    const existing = findFriendshipByPair(state, requesterUserId, recipientUserId);
    if (existing !== void 0 && (existing.state === "PENDING" || existing.state === "ACCEPTED")) {
      ensureExpectedVersion(payload.expectedVersion, existing.version);
      return {
        data: { relationship: relationshipProjection(state, requesterUserId, recipientUserId, now) },
        targetType: "FRIENDSHIP",
        targetId: existing._id
      };
    }
    if (existing === void 0) {
      if (payload.expectedVersion !== void 0) validation([{ field: "expectedVersion", rule: "NOT_ALLOWED_FOR_NEW_PAIR" }]);
      const friendshipId = dependencies.createId("friendship");
      const created = {
        _id: friendshipId,
        friendshipId,
        pairKey: pairKey(requesterUserId, recipientUserId),
        requesterUserId,
        addresseeUserId: recipientUserId,
        state: "PENDING",
        ...message === void 0 ? {} : { message },
        version: 1,
        createdAt: now,
        updatedAt: now
      };
      state.friendships.push(created);
      appendInvalidation(state, {
        kind: "RELATIONSHIP_CHANGED",
        sourceAggregateId: friendshipId,
        sourceVersion: 1,
        occurredAt: now,
        reason: "FRIEND_REQUEST_CREATED",
        requestId,
        createId: dependencies.createId
      });
      return {
        data: { relationship: relationshipProjection(state, requesterUserId, recipientUserId, now) },
        targetType: "FRIENDSHIP",
        targetId: friendshipId
      };
    }
    if (existing.state !== "REMOVED") conflict("FRIENDSHIP_STATE_TRANSITION");
    ensureExpectedVersion(payload.expectedVersion, existing.version);
    existing.requesterUserId = requesterUserId;
    existing.addresseeUserId = recipientUserId;
    existing.state = "PENDING";
    if (message === void 0) delete existing.message;
    else existing.message = message;
    delete existing.rejectionReasonCode;
    existing.version += 1;
    existing.updatedAt = now;
    appendInvalidation(state, {
      kind: "RELATIONSHIP_CHANGED",
      sourceAggregateId: existing._id,
      sourceVersion: existing.version,
      occurredAt: now,
      reason: "FRIEND_REQUEST_REOPENED",
      requestId,
      createId: dependencies.createId
    });
    return {
      data: { relationship: relationshipProjection(state, requesterUserId, recipientUserId, now) },
      targetType: "FRIENDSHIP",
      targetId: existing._id
    };
  });
}
async function listIncoming(dependencies, principal, payload) {
  exactPayload(payload, ["includeExpired", "limit"], ["cursor"]);
  if (typeof payload.includeExpired !== "boolean") invalidRequest("includeExpired", "BOOLEAN_REQUIRED");
  const limit = requireLimit(payload.limit);
  const userId = requirePrincipalUserId(principal);
  const evaluatedAt = dependencies.now();
  assertUtc(evaluatedAt, "now");
  return dependencies.repository.read((state) => {
    const allowedStates = payload.includeExpired === true ? /* @__PURE__ */ new Set(["PENDING", "REJECTED", "CANCELLED"]) : /* @__PURE__ */ new Set(["PENDING"]);
    const records = state.friendships.filter((record) => record.addresseeUserId === userId && allowedStates.has(record.state) && !pairIsBlocked(state, record.requesterUserId, record.addresseeUserId)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const items = records.map((record) => {
      const card = state.cards.find((candidate) => candidate.ownerUserId === record.requesterUserId);
      if (card === void 0) notFound("PUBLIC_CARD", record.requesterUserId);
      return {
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        friendshipId: record._id,
        requester: sanitizeCard(state, card, false, evaluatedAt),
        state: record.state,
        ...record.message === void 0 ? {} : { message: record.message }
      };
    });
    return { page: paginate(items, limit, payload.cursor, `incoming:${userId}:${String(payload.includeExpired)}`) };
  });
}
async function listAccepted(dependencies, principal, payload) {
  exactPayload(payload, ["limit"], ["cursor", "cityId"]);
  const limit = requireLimit(payload.limit);
  const cityId = payload.cityId === void 0 ? void 0 : requireReadStableId(payload.cityId, "cityId");
  const userId = requirePrincipalUserId(principal);
  const evaluatedAt = dependencies.now();
  assertUtc(evaluatedAt, "now");
  return dependencies.repository.read((state) => {
    const cards = state.friendships.filter((record) => record.state === "ACCEPTED" && (record.requesterUserId === userId || record.addresseeUserId === userId) && !pairIsBlocked(state, record.requesterUserId, record.addresseeUserId)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map((record) => state.cards.find((card) => card.ownerUserId === otherParty(record, userId))).filter((card) => card !== void 0).filter((card) => cityId === void 0 || card.cityId === cityId).map((card) => sanitizeCard(state, card, true, evaluatedAt));
    return { page: paginate(cards, limit, payload.cursor, `accepted:${userId}:${cityId ?? "*"}`) };
  });
}
function transitionFriendship(dependencies, principal, action, requestId, payload) {
  const optional = action === "friend.reject" ? ["expectedVersion", "reasonCode"] : ["expectedVersion"];
  exactPayload(payload, ["friendshipId", "idempotencyKey"], optional);
  const friendshipId = requireStableId(payload.friendshipId, "friendshipId");
  const actorUserId = requirePrincipalUserId(principal);
  if (payload.reasonCode !== void 0 && !["NOT_KNOWN", "NOT_NOW", "OTHER"].includes(String(payload.reasonCode))) {
    validation([{ field: "reasonCode", rule: "ENUM" }]);
  }
  return idempotentMutation(dependencies, principal, action, requestId, payload, (state, now) => {
    const record = findFriendshipForActor(state, friendshipId, actorUserId);
    if (record.state !== "PENDING") conflict("FRIENDSHIP_STATE_TRANSITION");
    if (action === "friend.accept" || action === "friend.reject") {
      if (record.addresseeUserId !== actorUserId) forbidden("FRIEND_REQUEST_RECIPIENT_REQUIRED");
    } else if (record.requesterUserId !== actorUserId) {
      forbidden("FRIEND_REQUEST_REQUESTER_REQUIRED");
    }
    if (action === "friend.accept" && pairIsBlocked(state, record.requesterUserId, record.addresseeUserId)) blocked();
    requireMutationExpectedVersion(payload.expectedVersion, record.version);
    record.state = action === "friend.accept" ? "ACCEPTED" : action === "friend.reject" ? "REJECTED" : "CANCELLED";
    if (action === "friend.reject" && payload.reasonCode !== void 0) {
      record.rejectionReasonCode = String(payload.reasonCode);
    }
    record.version += 1;
    record.updatedAt = now;
    appendInvalidation(state, {
      kind: "RELATIONSHIP_CHANGED",
      sourceAggregateId: record._id,
      sourceVersion: record.version,
      occurredAt: now,
      reason: action === "friend.accept" ? "FRIEND_REQUEST_ACCEPTED" : action === "friend.reject" ? "FRIEND_REQUEST_REJECTED" : "FRIEND_REQUEST_CANCELLED",
      requestId,
      createId: dependencies.createId
    });
    return {
      data: {
        relationship: relationshipProjection(state, actorUserId, otherParty(record, actorUserId), now)
      },
      targetType: "FRIENDSHIP",
      targetId: record._id
    };
  });
}
function removeFriend(dependencies, principal, requestId, payload) {
  exactPayload(payload, ["friendshipId", "idempotencyKey"], ["expectedVersion"]);
  const friendshipId = requireStableId(payload.friendshipId, "friendshipId");
  const actorUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, "friend.remove", requestId, payload, (state, now) => {
    const record = findFriendshipForActor(state, friendshipId, actorUserId);
    if (record.state !== "ACCEPTED") conflict("FRIENDSHIP_STATE_TRANSITION");
    requireMutationExpectedVersion(payload.expectedVersion, record.version);
    record.state = "REMOVED";
    record.version += 1;
    record.updatedAt = now;
    appendInvalidation(state, {
      kind: "RELATIONSHIP_CHANGED",
      sourceAggregateId: record._id,
      sourceVersion: record.version,
      occurredAt: now,
      reason: "FRIENDSHIP_REMOVED",
      requestId,
      createId: dependencies.createId
    });
    return {
      data: { removedAt: now, projectionDirty: true },
      targetType: "FRIENDSHIP",
      targetId: record._id
    };
  });
}
function createBlock(dependencies, principal, requestId, payload) {
  exactPayload(payload, ["blockedUserId", "idempotencyKey"], ["expectedVersion", "reasonCode"]);
  const actorUserId = requirePrincipalUserId(principal);
  const blockedUserId = requireStableId(payload.blockedUserId, "blockedUserId");
  if (blockedUserId === actorUserId) validation([{ field: "blockedUserId", rule: "MUST_DIFFER_FROM_ACTOR" }]);
  if (payload.reasonCode !== void 0 && !["HARASSMENT", "SPAM", "PRIVACY", "OTHER"].includes(String(payload.reasonCode))) {
    validation([{ field: "reasonCode", rule: "ENUM" }]);
  }
  return idempotentMutation(dependencies, principal, "block.create", requestId, payload, (state, now) => {
    requireActiveTargetUser(state, blockedUserId);
    let blockRecord = state.blocksReports.find((record) => record.recordType === "BLOCK" && record.actorUserId === actorUserId && record.targetId === blockedUserId);
    const blockWasActive = blockRecord?.state === "ACTIVE";
    if (blockRecord === void 0) {
      if (payload.expectedVersion !== void 0) validation([{ field: "expectedVersion", rule: "NOT_ALLOWED_FOR_NEW_BLOCK" }]);
      const blockId = dependencies.createId("block");
      blockRecord = {
        _id: blockId,
        blockId,
        recordType: "BLOCK",
        actorUserId,
        targetId: blockedUserId,
        state: "ACTIVE",
        ...payload.reasonCode === void 0 ? {} : { reasonCode: String(payload.reasonCode) },
        version: 1,
        createdAt: now,
        updatedAt: now
      };
      state.blocksReports.push(blockRecord);
    } else if (!blockWasActive) {
      ensureExpectedVersion(payload.expectedVersion, blockRecord.version);
      blockRecord.state = "ACTIVE";
      if (payload.reasonCode === void 0) delete blockRecord.reasonCode;
      else blockRecord.reasonCode = String(payload.reasonCode);
      blockRecord.version += 1;
      blockRecord.updatedAt = now;
    } else {
      ensureExpectedVersion(payload.expectedVersion, blockRecord.version);
    }
    if (!blockWasActive) {
      appendInvalidation(state, {
        kind: "RELATIONSHIP_CHANGED",
        sourceAggregateId: blockRecord._id,
        sourceVersion: blockRecord.version,
        occurredAt: now,
        reason: "BLOCK_CREATED",
        requestId,
        createId: dependencies.createId
      });
    }
    const friendship = findFriendshipByPair(state, actorUserId, blockedUserId);
    if (friendship !== void 0 && (friendship.state === "PENDING" || friendship.state === "ACCEPTED")) {
      friendship.state = "REMOVED";
      friendship.version += 1;
      friendship.updatedAt = now;
      appendInvalidation(state, {
        kind: "RELATIONSHIP_CHANGED",
        sourceAggregateId: friendship._id,
        sourceVersion: friendship.version,
        occurredAt: now,
        reason: "FRIENDSHIP_REMOVED_BY_BLOCK",
        requestId,
        createId: dependencies.createId
      });
    }
    return {
      data: {
        blockedUserId,
        createdAt: blockRecord.createdAt,
        projectionDirty: true
      },
      targetType: "BLOCK",
      targetId: blockRecord._id
    };
  });
}
function removeBlock(dependencies, principal, requestId, payload) {
  exactPayload(payload, ["blockedUserId", "idempotencyKey"], ["expectedVersion"]);
  const actorUserId = requirePrincipalUserId(principal);
  const blockedUserId = requireStableId(payload.blockedUserId, "blockedUserId");
  return idempotentMutation(dependencies, principal, "block.remove", requestId, payload, (state, now) => {
    const blockRecord = state.blocksReports.find((record) => record.recordType === "BLOCK" && record.actorUserId === actorUserId && record.targetId === blockedUserId && record.state === "ACTIVE");
    if (blockRecord === void 0) notFound("BLOCK");
    ensureExpectedVersion(payload.expectedVersion, blockRecord.version);
    blockRecord.state = "REMOVED";
    blockRecord.version += 1;
    blockRecord.updatedAt = now;
    appendInvalidation(state, {
      kind: "RELATIONSHIP_CHANGED",
      sourceAggregateId: blockRecord._id,
      sourceVersion: blockRecord.version,
      occurredAt: now,
      reason: "BLOCK_REMOVED",
      requestId,
      createId: dependencies.createId
    });
    return {
      data: {
        blockedUserId,
        removedAt: now,
        projectionDirty: true
      },
      targetType: "BLOCK",
      targetId: blockRecord._id
    };
  });
}
function createReport(dependencies, principal, requestId, payload) {
  exactPayload(payload, [
    "targetType",
    "targetId",
    "reasonCode",
    "evidenceAssetIds",
    "idempotencyKey"
  ], ["description", "expectedVersion"]);
  if (!["USER", "EVENT", "CONTENT"].includes(String(payload.targetType))) {
    validation([{ field: "targetType", rule: "ENUM" }]);
  }
  if (!["HARASSMENT", "SPAM", "MISLEADING", "RIGHTS", "OTHER"].includes(String(payload.reasonCode))) {
    validation([{ field: "reasonCode", rule: "ENUM" }]);
  }
  const targetId = requireStableId(payload.targetId, "targetId");
  const actorUserId = requirePrincipalUserId(principal);
  if (payload.expectedVersion !== void 0) {
    validation([{ field: "expectedVersion", rule: "NOT_ALLOWED_FOR_NEW_REPORT" }]);
  }
  if (payload.targetType === "USER" && targetId === actorUserId) {
    validation([{ field: "targetId", rule: "MUST_DIFFER_FROM_ACTOR" }]);
  }
  if (!Array.isArray(payload.evidenceAssetIds) || payload.evidenceAssetIds.length > 5 || !payload.evidenceAssetIds.every((id) => typeof id === "string")) {
    validation([{ field: "evidenceAssetIds", rule: "ARRAY_MAX_5" }]);
  }
  const evidenceAssetIds = payload.evidenceAssetIds;
  if (new Set(evidenceAssetIds).size !== evidenceAssetIds.length) {
    validation([{ field: "evidenceAssetIds", rule: "UNIQUE_ITEMS" }]);
  }
  const description = payload.description === void 0 ? void 0 : requireString2(payload.description, "description", { max: 1e3 });
  return idempotentMutation(dependencies, principal, "report.create", requestId, payload, (state, now) => {
    if (payload.targetType === "USER") requireActiveTargetUser(state, targetId);
    const invalidEvidence = evidenceAssetIds.filter((assetId) => {
      const asset = state.mediaAssets.find((candidate) => candidate._id === assetId);
      return asset === void 0 || asset.ownerUserId !== actorUserId || asset.uploadedAt === void 0 || Date.parse(asset.uploadedAt) > Date.parse(asset.uploadExpiresAt);
    });
    if (invalidEvidence.length > 0) {
      validation([{ field: "evidenceAssetIds", rule: "PRIVATE_UPLOADED_OWNER_REQUIRED" }]);
    }
    const reportId = dependencies.createId("report");
    const record = {
      _id: reportId,
      reportId,
      recordType: "REPORT",
      actorUserId,
      targetId,
      targetType: payload.targetType,
      state: "OPEN",
      reasonCode: String(payload.reasonCode),
      ...description === void 0 ? {} : { description },
      evidenceAssetIds: clone(evidenceAssetIds),
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    state.blocksReports.push(record);
    return {
      data: { report: reportProjection(record) },
      targetType: "REPORT",
      targetId: reportId
    };
  });
}
async function tagCatalog(dependencies, principal, payload) {
  exactPayload(payload, ["includeDisabled"]);
  requirePrincipalUserId(principal);
  if (payload.includeDisabled !== false) invalidRequest("includeDisabled", "MUST_BE_FALSE");
  return dependencies.repository.read((state) => ({
    labels: state.labels.filter((label) => label.enabled && (label.category === "PUBLIC_IDENTITY_TAG" || label.category === "PUBLIC_INTEREST_TAG")).map(labelProjection)
  }));
}
function findOwnedVerification(state, verificationRequestId, ownerUserId) {
  const record = state.verificationRequests.find((candidate) => candidate._id === verificationRequestId && candidate.subjectUserId === ownerUserId);
  if (record === void 0) notFound("VERIFICATION_REQUEST", verificationRequestId);
  return record;
}
function findApplicationLabel(state, labelId) {
  const label = state.labels.find((candidate) => candidate._id === labelId && candidate.enabled);
  if (label === void 0) notFound("LABEL", labelId);
  if (label.category === "PRIVATE_PREFERENCE") forbidden("PRIVATE_PREFERENCE_NOT_A_PUBLIC_VERIFICATION");
  if (label.category === "SYSTEM_ROLE") forbidden("SYSTEM_ROLE_NOT_A_PERSONAL_HONOR");
  return label;
}
function createVerificationDraft(dependencies, principal, requestId, payload) {
  exactPayload(payload, ["labelId", "idempotencyKey"], ["expectedVersion"]);
  const labelId = requireStableId(payload.labelId, "labelId");
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, "verification.createDraft", requestId, payload, (state, now) => {
    findApplicationLabel(state, labelId);
    const existing = state.verificationRequests.find((record2) => record2.subjectUserId === ownerUserId && record2.labelId === labelId && ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(record2.status));
    if (existing !== void 0) {
      if (existing.status === "DRAFT") {
        ensureExpectedVersion(payload.expectedVersion, existing.version);
        return {
          data: { request: verificationProjection(existing) },
          targetType: "VERIFICATION_REQUEST",
          targetId: existing._id
        };
      }
      conflict("ACTIVE_VERIFICATION_CASE_EXISTS");
    }
    if (payload.expectedVersion !== void 0) validation([{ field: "expectedVersion", rule: "NOT_ALLOWED_FOR_NEW_DRAFT" }]);
    const verificationRequestId = dependencies.createId("verification");
    const record = {
      _id: verificationRequestId,
      verificationRequestId,
      subjectUserId: ownerUserId,
      labelId,
      status: "DRAFT",
      evidenceAssetIds: [],
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    state.verificationRequests.push(record);
    return {
      data: { request: verificationProjection(record) },
      targetType: "VERIFICATION_REQUEST",
      targetId: verificationRequestId
    };
  });
}
function issueUploadPolicy(dependencies, principal, requestId, payload) {
  exactPayload(payload, [
    "verificationRequestId",
    "mediaType",
    "fileSizeBytes",
    "sha256",
    "idempotencyKey"
  ], ["expectedVersion"]);
  const verificationRequestId = requireStableId(payload.verificationRequestId, "verificationRequestId");
  if (payload.mediaType !== "IMAGE" && payload.mediaType !== "DOCUMENT") {
    validation([{ field: "mediaType", rule: "ENUM" }]);
  }
  if (!Number.isSafeInteger(payload.fileSizeBytes) || payload.fileSizeBytes < 1) {
    validation([{ field: "fileSizeBytes", rule: "POSITIVE_INTEGER" }]);
  }
  const sha256 = requireString2(payload.sha256, "sha256", { min: 64, max: 64, pattern: /^[a-f0-9]{64}$/i });
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, "verification.uploadPolicy", requestId, payload, (state, now) => {
    const request = findOwnedVerification(state, verificationRequestId, ownerUserId);
    if (request.status !== "DRAFT" && request.status !== "NEEDS_CHANGES") {
      conflict("VERIFICATION_UPLOAD_STATE");
    }
    ensureExpectedVersion(payload.expectedVersion, request.version);
    const label = findApplicationLabel(state, request.labelId);
    const mediaType = payload.mediaType;
    if (!label.allowedMediaTypes.includes(mediaType)) {
      validation([{ field: "mediaType", rule: "NOT_ALLOWED_FOR_LABEL" }]);
    }
    if (payload.fileSizeBytes > label.maxFileBytes) {
      validation([{ field: "fileSizeBytes", rule: "EXCEEDS_LABEL_MAX_BYTES" }]);
    }
    const mediaAssetId = dependencies.createId("media");
    const uploadExpiresAt = new Date(Date.parse(now) + 10 * 60 * 1e3).toISOString();
    const cloudPath = `private/verification/${opaqueToken()}/${mediaAssetId}`;
    const record = {
      _id: mediaAssetId,
      mediaAssetId,
      ownerUserId,
      domain: "VERIFICATION",
      verificationRequestId,
      mediaType,
      fileSizeBytes: payload.fileSizeBytes,
      sha256,
      storageFileId: cloudPath,
      uploadExpiresAt,
      publicState: "PRIVATE",
      origin: "SYNTHETIC",
      evidenceMode: "DEMO_ONLY",
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    state.mediaAssets.push(record);
    return {
      data: {
        mediaAssetId,
        cloudPath,
        uploadExpiresAt,
        maxBytes: label.maxFileBytes
      },
      targetType: "MEDIA_ASSET",
      targetId: mediaAssetId
    };
  });
}
function submitVerification(dependencies, principal, requestId, payload) {
  exactPayload(payload, [
    "verificationRequestId",
    "evidenceAssetIds",
    "userStatement",
    "idempotencyKey"
  ], ["expectedVersion"]);
  const verificationRequestId = requireStableId(payload.verificationRequestId, "verificationRequestId");
  if (!Array.isArray(payload.evidenceAssetIds) || !payload.evidenceAssetIds.every((id) => typeof id === "string")) {
    validation([{ field: "evidenceAssetIds", rule: "STRING_ARRAY" }]);
  }
  const evidenceAssetIds = payload.evidenceAssetIds;
  if (new Set(evidenceAssetIds).size !== evidenceAssetIds.length) {
    validation([{ field: "evidenceAssetIds", rule: "UNIQUE_ITEMS" }]);
  }
  const userStatement = requireString2(payload.userStatement, "userStatement", { min: 10, max: 1e3 });
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, "verification.submit", requestId, payload, (state, now) => {
    const request = findOwnedVerification(state, verificationRequestId, ownerUserId);
    if (request.status !== "DRAFT" && request.status !== "NEEDS_CHANGES") {
      conflict("VERIFICATION_SUBMIT_STATE");
    }
    requireMutationExpectedVersion(payload.expectedVersion, request.version);
    const label = findApplicationLabel(state, request.labelId);
    if (evidenceAssetIds.length === 0) {
      throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, "At least one private evidence item is required.", {
        details: { code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, missingEvidenceKinds: ["PRIVATE_SUPPORTING_MATERIAL"] }
      });
    }
    if (evidenceAssetIds.length > label.maxEvidenceCount) {
      validation([{ field: "evidenceAssetIds", rule: "EXCEEDS_LABEL_MAX_COUNT" }]);
    }
    const invalidEvidence = evidenceAssetIds.filter((assetId) => {
      const asset = state.mediaAssets.find((candidate) => candidate._id === assetId);
      return asset === void 0 || asset.ownerUserId !== ownerUserId || asset.domain !== "VERIFICATION" || asset.verificationRequestId !== verificationRequestId || !isUtc(asset.uploadedAt) || !isUtc(asset.uploadExpiresAt) || Date.parse(asset.uploadedAt) > Date.parse(now) || Date.parse(asset.uploadedAt) > Date.parse(asset.uploadExpiresAt) || asset.publicState !== "PRIVATE" || !asset.storageFileId.startsWith("private/verification/") || !label.allowedMediaTypes.includes(asset.mediaType) || asset.fileSizeBytes > label.maxFileBytes;
    });
    if (invalidEvidence.length > 0) mediaRightsRequired(invalidEvidence);
    request.status = "SUBMITTED";
    request.evidenceAssetIds = clone(evidenceAssetIds);
    request.userStatement = userStatement;
    request.version += 1;
    request.updatedAt = now;
    appendInvalidation(state, {
      kind: "VERIFICATION_CHANGED",
      sourceAggregateId: request._id,
      sourceVersion: request.version,
      occurredAt: now,
      reason: "VERIFICATION_SUBMITTED",
      requestId,
      createId: dependencies.createId
    });
    return {
      data: { request: verificationProjection(request) },
      targetType: "VERIFICATION_REQUEST",
      targetId: request._id
    };
  });
}
async function listMyVerifications(dependencies, principal, payload) {
  exactPayload(payload, ["limit"], ["cursor", "status"]);
  const limit = requireLimit(payload.limit);
  if (payload.status !== void 0 && !Object.values(ReviewStatus).includes(payload.status)) {
    invalidRequest("status", "REVIEW_STATUS");
  }
  const ownerUserId = requirePrincipalUserId(principal);
  return dependencies.repository.read((state) => {
    const items = state.verificationRequests.filter((record) => record.subjectUserId === ownerUserId && (payload.status === void 0 || record.status === payload.status)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map(verificationProjection);
    return {
      page: paginate(items, limit, payload.cursor, `verification:${ownerUserId}:${String(payload.status ?? "*")}`)
    };
  });
}
async function getMyVerification(dependencies, principal, payload) {
  exactPayload(payload, ["verificationRequestId"]);
  const verificationRequestId = requireReadStableId(payload.verificationRequestId, "verificationRequestId");
  const ownerUserId = requirePrincipalUserId(principal);
  return dependencies.repository.read((state) => ({
    request: verificationProjection(findOwnedVerification(state, verificationRequestId, ownerUserId))
  }));
}
function withdrawVerification(dependencies, principal, requestId, payload) {
  exactPayload(payload, [
    "verificationRequestId",
    "expectedVersion",
    "idempotencyKey"
  ]);
  const verificationRequestId = requireStableId(payload.verificationRequestId, "verificationRequestId");
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, "verification.withdraw", requestId, payload, (state, now) => {
    const request = findOwnedVerification(state, verificationRequestId, ownerUserId);
    if (request.status !== "DRAFT" && request.status !== "SUBMITTED") {
      reviewTransition(request.status, "PHYSICAL_WITHDRAWAL");
    }
    requireExpectedVersion(payload.expectedVersion, request.version);
    const deletedVersion = request.version;
    const previousStatus = request.status;
    state.verificationRequests = state.verificationRequests.filter((candidate) => candidate._id !== request._id);
    appendInvalidation(state, {
      kind: "VERIFICATION_CHANGED",
      sourceAggregateId: request._id,
      sourceVersion: deletedVersion,
      occurredAt: now,
      reason: "VERIFICATION_REQUEST_WITHDRAWN",
      requestId,
      createId: dependencies.createId
    });
    return {
      data: {
        withdrawal: {
          verificationRequestId: request._id,
          previousStatus,
          deletedVersion,
          withdrawnAt: now,
          deletionMode: "PHYSICAL",
          projectionInvalidationAppended: true
        }
      },
      targetType: "VERIFICATION_REQUEST",
      targetId: request._id
    };
  });
}
async function dispatch(dependencies, principal, action, requestId, payload) {
  switch (action) {
    case "friend.request":
      return requestFriend(dependencies, principal, requestId, payload);
    case "friend.listIncoming":
      return listIncoming(dependencies, principal, payload);
    case "friend.listAccepted":
      return listAccepted(dependencies, principal, payload);
    case "friend.accept":
      return transitionFriendship(dependencies, principal, action, requestId, payload);
    case "friend.reject":
      return transitionFriendship(dependencies, principal, action, requestId, payload);
    case "friend.cancel":
      return transitionFriendship(dependencies, principal, action, requestId, payload);
    case "friend.remove":
      return removeFriend(dependencies, principal, requestId, payload);
    case "block.create":
      return createBlock(dependencies, principal, requestId, payload);
    case "block.remove":
      return removeBlock(dependencies, principal, requestId, payload);
    case "report.create":
      return createReport(dependencies, principal, requestId, payload);
    case "tag.catalog":
      return tagCatalog(dependencies, principal, payload);
    case "verification.createDraft":
      return createVerificationDraft(dependencies, principal, requestId, payload);
    case "verification.uploadPolicy":
      return issueUploadPolicy(dependencies, principal, requestId, payload);
    case "verification.submit":
      return submitVerification(dependencies, principal, requestId, payload);
    case "verification.listMine":
      return listMyVerifications(dependencies, principal, payload);
    case "verification.getMine":
      return getMyVerification(dependencies, principal, payload);
    case "verification.withdraw":
      return withdrawVerification(dependencies, principal, requestId, payload);
  }
}
var fallbackEndpoint = createNotImplementedEndpoint("socialApi", ACTIONS);
function createSocialApiEndpoint(input) {
  const dependencies = {
    repository: input.repository,
    getWxContext: input.getWxContext,
    loadPrincipal: input.loadPrincipal ?? ((openId) => input.repository.loadPrincipal(openId)),
    now: input.now ?? defaultNow,
    createId: input.createId ?? defaultCreateId
  };
  return Object.freeze({
    actions: ACTIONS,
    writeGuardPlans: fallbackEndpoint.writeGuardPlans,
    main: async (event) => {
      const fallbackRequestId = requestIdForFailure(event, dependencies.createId);
      try {
        const envelope = validateCallEnvelope(event, ACTIONS);
        const principal = await requireTrustedPrincipal(dependencies.getWxContext, dependencies.loadPrincipal);
        const data = await dispatch(
          dependencies,
          principal,
          envelope.action,
          envelope.requestId,
          envelope.payload
        );
        return success(data, envelope.requestId);
      } catch (error) {
        return safeFailureFromError(
          fallbackRequestId,
          error instanceof Error ? error : new Error("Non-error thrown at socialApi boundary")
        );
      }
    }
  });
}
var endpoint = fallbackEndpoint;
var main = endpoint.main;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  auditPublicVerificationClaim,
  createInMemorySocialRepository,
  createSocialApiEndpoint,
  endpoint,
  main
});
