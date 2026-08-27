// GENERATED FROM TYPESCRIPT BY scripts/build-cloud-runtime.mjs — DO NOT EDIT
// CLOUD_RUNTIME_SOURCE_SHA256:4f54b0888ea0693f6f062f4083a23a1d4567c9056d842942d7402bb1e98e24df
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
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

// miniprogram/shared/types/api.ts
var ApiErrorCode;
var init_api = __esm({
  "miniprogram/shared/types/api.ts"() {
    ApiErrorCode = {
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
  }
});

// cloudfunctions/_shared/errors/index.ts
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
var RETRYABLE_CODES, SafeApiError;
var init_errors = __esm({
  "cloudfunctions/_shared/errors/index.ts"() {
    init_api();
    RETRYABLE_CODES = /* @__PURE__ */ new Set([
      ApiErrorCode.RATE_LIMITED,
      ApiErrorCode.SERVICE_UNAVAILABLE,
      ApiErrorCode.INTERNAL_ERROR
    ]);
    SafeApiError = class extends Error {
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
  }
});

// miniprogram/shared/contracts/action-map.ts
var init_action_map = __esm({
  "miniprogram/shared/contracts/action-map.ts"() {
  }
});

// miniprogram/shared/contracts/action-registry.ts
var AuthRequirement, IdempotencyRequirement, PUBLIC_READ_ERRORS, USER_READ_ERRORS, USER_WRITE_ERRORS, REVIEW_READ_ERRORS, REVIEW_WRITE_ERRORS, CLOUD_ACTION_REGISTRY;
var init_action_registry = __esm({
  "miniprogram/shared/contracts/action-registry.ts"() {
    init_api();
    AuthRequirement = {
      PUBLIC: "PUBLIC",
      USER: "USER",
      REVIEWER: "REVIEWER",
      ADMIN: "ADMIN"
    };
    IdempotencyRequirement = {
      REQUIRED: "REQUIRED",
      NOT_APPLICABLE: "NOT_APPLICABLE"
    };
    PUBLIC_READ_ERRORS = [
      ApiErrorCode.NOT_IMPLEMENTED,
      ApiErrorCode.INVALID_REQUEST,
      ApiErrorCode.NOT_FOUND,
      ApiErrorCode.RATE_LIMITED,
      ApiErrorCode.SERVICE_UNAVAILABLE,
      ApiErrorCode.INTERNAL_ERROR
    ];
    USER_READ_ERRORS = [
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
    USER_WRITE_ERRORS = [
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
    REVIEW_READ_ERRORS = [
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
    REVIEW_WRITE_ERRORS = [
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
    CLOUD_ACTION_REGISTRY = {
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
  }
});

// miniprogram/shared/contracts/action-types.ts
var init_action_types = __esm({
  "miniprogram/shared/contracts/action-types.ts"() {
  }
});

// miniprogram/shared/types/enums.ts
var RecordOrigin, VerificationState, ReviewStatus, FriendshipState, EventState, PublicationState, MediaRightsState, ProjectionInvalidationKind;
var init_enums = __esm({
  "miniprogram/shared/types/enums.ts"() {
    RecordOrigin = {
      REAL: "REAL",
      SYNTHETIC: "SYNTHETIC"
    };
    VerificationState = {
      USER_DECLARED: "USER_DECLARED",
      AI_CONSISTENCY_CHECKED: "AI_CONSISTENCY_CHECKED",
      HUMAN_REVIEWED: "HUMAN_REVIEWED",
      NOT_APPLICABLE: "NOT_APPLICABLE"
    };
    ReviewStatus = {
      DRAFT: "DRAFT",
      SUBMITTED: "SUBMITTED",
      UNDER_REVIEW: "UNDER_REVIEW",
      NEEDS_CHANGES: "NEEDS_CHANGES",
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      EXPIRED: "EXPIRED",
      REVOKED: "REVOKED"
    };
    FriendshipState = {
      PENDING: "PENDING",
      ACCEPTED: "ACCEPTED",
      REJECTED: "REJECTED",
      CANCELLED: "CANCELLED",
      REMOVED: "REMOVED"
    };
    EventState = {
      DRAFT: "DRAFT",
      SUBMITTED: "SUBMITTED",
      UNDER_REVIEW: "UNDER_REVIEW",
      PUBLISHED: "PUBLISHED",
      PAUSED: "PAUSED",
      CANCELLED: "CANCELLED",
      COMPLETED: "COMPLETED",
      REJECTED: "REJECTED"
    };
    PublicationState = {
      DRAFT: "DRAFT",
      SUBMITTED: "SUBMITTED",
      UNDER_REVIEW: "UNDER_REVIEW",
      PUBLISHED: "PUBLISHED",
      UNPUBLISHED: "UNPUBLISHED",
      REJECTED: "REJECTED"
    };
    MediaRightsState = {
      UNVERIFIED: "UNVERIFIED",
      CLAIMED: "CLAIMED",
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
      EXPIRED: "EXPIRED",
      REVOKED: "REVOKED"
    };
    ProjectionInvalidationKind = {
      RELATIONSHIP_CHANGED: "RELATIONSHIP_CHANGED",
      VERIFICATION_CHANGED: "VERIFICATION_CHANGED",
      EVENT_CHANGED: "EVENT_CHANGED",
      CONTENT_CHANGED: "CONTENT_CHANGED",
      MEDIA_RIGHTS_CHANGED: "MEDIA_RIGHTS_CHANGED"
    };
  }
});

// miniprogram/shared/contracts/index.ts
var init_contracts = __esm({
  "miniprogram/shared/contracts/index.ts"() {
    init_action_map();
    init_action_registry();
    init_action_types();
    init_api();
    init_enums();
  }
});

// cloudfunctions/_shared/validation/index.ts
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
function defineWriteGuardPlan(action) {
  return Object.freeze({ action, checks: WRITE_GUARD_SEQUENCE, transactionRequired: true });
}
var REQUEST_ID_PATTERN, ALLOWED_ENVELOPE_KEYS, WRITE_GUARD_SEQUENCE;
var init_validation = __esm({
  "cloudfunctions/_shared/validation/index.ts"() {
    init_api();
    init_errors();
    REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
    ALLOWED_ENVELOPE_KEYS = /* @__PURE__ */ new Set(["action", "requestId", "payload"]);
    WRITE_GUARD_SEQUENCE = Object.freeze([
      "TRUSTED_OPENID",
      "RBAC",
      "OBJECT_OWNERSHIP",
      "CURRENT_STATE",
      "OPTIMISTIC_VERSION",
      "IDEMPOTENCY",
      "AUDIT_APPEND"
    ]);
  }
});

// cloudfunctions/adminApi/model.ts
var model_exports = {};
__export(model_exports, {
  AdminRole: () => AdminRole
});
var AdminRole;
var init_model = __esm({
  "cloudfunctions/adminApi/model.ts"() {
    AdminRole = {
      REVIEWER: "REVIEWER",
      EVENT_MANAGER: "EVENT_MANAGER",
      CONTENT_MANAGER: "CONTENT_MANAGER",
      SUPER_ADMIN: "SUPER_ADMIN"
    };
  }
});

// cloudfunctions/adminApi/time.ts
function isStrictUtcInstant(value) {
  if (typeof value !== "string") return false;
  const match = UTC_SHAPE.exec(value);
  if (match === null) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  const canonical = `${match[1]}.${(match[2] ?? "").padEnd(3, "0")}Z`;
  return new Date(parsed).toISOString() === canonical;
}
var UTC_SHAPE;
var init_time = __esm({
  "cloudfunctions/adminApi/time.ts"() {
    UTC_SHAPE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/;
  }
});

// cloudfunctions/adminApi/policy.ts
var policy_exports = {};
__export(policy_exports, {
  ADMIN_RBAC_MATRIX: () => ADMIN_RBAC_MATRIX,
  auditActorRole: () => auditActorRole,
  availableQueues: () => availableQueues,
  domainsForPrincipal: () => domainsForPrincipal,
  requireActionRole: () => requireActionRole,
  requireActiveAllowlistedAdmin: () => requireActiveAllowlistedAdmin,
  requireDomainAccess: () => requireDomainAccess,
  requireRequestedScope: () => requireRequestedScope,
  sessionRoles: () => sessionRoles
});
function deny(policy) {
  throw new SafeApiError(ApiErrorCode.FORBIDDEN, "This administrator is not authorized for the action.", {
    details: { code: ApiErrorCode.FORBIDDEN, policy }
  });
}
function requireActiveAllowlistedAdmin(principal, evaluatedAt) {
  if (principal === null || principal.allowlisted !== true) deny("ADMIN_ALLOWLIST_REQUIRED");
  if (!isPlainRecord(principal) || Object.keys(principal).length !== ADMIN_PRINCIPAL_FIELDS.length || Object.keys(principal).some((field) => !ADMIN_PRINCIPAL_FIELDS.includes(field)) || typeof principal.openId !== "string" || typeof principal.userId !== "string" || !ADMIN_ID_PATTERN.test(principal.openId) || !ADMIN_ID_PATTERN.test(principal.userId) || !Array.isArray(principal.roles) || principal.accountState !== "ACTIVE" && principal.accountState !== "DISABLED" || !isStrictUtcInstant(principal.expiresAt) || !isStrictUtcInstant(evaluatedAt)) {
    deny("MALFORMED_ADMIN_GRANT");
  }
  if (principal.accountState !== "ACTIVE") deny("ACTIVE_ADMIN_ACCOUNT_REQUIRED");
  if (Date.parse(principal.expiresAt) <= Date.parse(evaluatedAt)) {
    throw new SafeApiError(ApiErrorCode.SESSION_EXPIRED, "The administrator session has expired.", {
      details: { code: ApiErrorCode.SESSION_EXPIRED, expiredAt: principal.expiresAt }
    });
  }
  if (principal.roles.length === 0 || principal.roles.some((role) => typeof role !== "string" || !Object.values(AdminRole).includes(role))) {
    deny("SERVER_ASSIGNED_ADMIN_ROLE_REQUIRED");
  }
  return Object.freeze({ ...principal, roles: Object.freeze([...new Set(principal.roles)]) });
}
function requireActionRole(principal, action) {
  const allowed = ADMIN_RBAC_MATRIX[action];
  if (!principal.roles.some((role) => allowed.includes(role))) deny("ADMIN_ACTION_DENIED");
}
function availableQueues(principal) {
  const queues = /* @__PURE__ */ new Set();
  principal.roles.forEach((role) => QUEUES_BY_ROLE[role].forEach((queue) => queues.add(queue)));
  return Object.freeze(["SOCIAL", "EVENT", "CONTENT", "ORGANIZER", "REPORT"].filter((queue) => queues.has(queue)));
}
function requireRequestedScope(principal, requestedScope) {
  if (!principal.roles.some((role) => SCOPES_BY_ROLE[role].includes(requestedScope))) {
    deny("ADMIN_SCOPE_DENIED");
  }
}
function requireDomainAccess(principal, domain) {
  if (!availableQueues(principal).includes(domain)) deny("ADMIN_QUEUE_DENIED");
}
function domainsForPrincipal(principal) {
  return availableQueues(principal);
}
function sessionRoles(principal) {
  const roles = /* @__PURE__ */ new Set();
  principal.roles.forEach((role) => {
    if (role === AdminRole.REVIEWER) roles.add("REVIEWER");
    else roles.add("ADMIN");
  });
  return Object.freeze([...roles]);
}
function auditActorRole(principal) {
  return principal.roles.some((role) => role !== AdminRole.REVIEWER) ? "ADMIN" : "REVIEWER";
}
var ADMIN_RBAC_MATRIX, QUEUES_BY_ROLE, SCOPES_BY_ROLE, ADMIN_ID_PATTERN, ADMIN_PRINCIPAL_FIELDS;
var init_policy = __esm({
  "cloudfunctions/adminApi/policy.ts"() {
    init_api();
    init_errors();
    init_validation();
    init_time();
    init_model();
    ADMIN_RBAC_MATRIX = Object.freeze({
      "admin.bootstrap": Object.freeze([
        AdminRole.REVIEWER,
        AdminRole.EVENT_MANAGER,
        AdminRole.CONTENT_MANAGER,
        AdminRole.SUPER_ADMIN
      ]),
      "review.list": Object.freeze([
        AdminRole.REVIEWER,
        AdminRole.EVENT_MANAGER,
        AdminRole.CONTENT_MANAGER,
        AdminRole.SUPER_ADMIN
      ]),
      "review.get": Object.freeze([
        AdminRole.REVIEWER,
        AdminRole.EVENT_MANAGER,
        AdminRole.CONTENT_MANAGER,
        AdminRole.SUPER_ADMIN
      ]),
      "review.approve": Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
      "review.reject": Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
      "review.requestChanges": Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
      "review.revoke": Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
      "organizer.review": Object.freeze([AdminRole.EVENT_MANAGER, AdminRole.SUPER_ADMIN]),
      "event.review": Object.freeze([AdminRole.EVENT_MANAGER, AdminRole.SUPER_ADMIN]),
      "content.review": Object.freeze([AdminRole.CONTENT_MANAGER, AdminRole.SUPER_ADMIN]),
      "report.list": Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
      "report.resolve": Object.freeze([AdminRole.REVIEWER, AdminRole.SUPER_ADMIN]),
      "audit.list": Object.freeze([AdminRole.SUPER_ADMIN])
    });
    QUEUES_BY_ROLE = {
      REVIEWER: ["SOCIAL", "REPORT"],
      EVENT_MANAGER: ["EVENT", "ORGANIZER"],
      CONTENT_MANAGER: ["CONTENT"],
      SUPER_ADMIN: ["SOCIAL", "EVENT", "CONTENT", "ORGANIZER", "REPORT"]
    };
    SCOPES_BY_ROLE = {
      REVIEWER: ["REVIEW"],
      EVENT_MANAGER: ["OPERATIONS"],
      CONTENT_MANAGER: ["OPERATIONS"],
      SUPER_ADMIN: ["REVIEW", "OPERATIONS", "AUDIT"]
    };
    ADMIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    ADMIN_PRINCIPAL_FIELDS = Object.freeze([
      "openId",
      "userId",
      "roles",
      "accountState",
      "allowlisted",
      "expiresAt"
    ]);
  }
});

// miniprogram/shared/constants/review-transitions.ts
function isLegalReviewTransition(from, to) {
  return REVIEW_STATUS_TRANSITIONS.some(([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to);
}
var REVIEW_STATUS_TRANSITIONS;
var init_review_transitions = __esm({
  "miniprogram/shared/constants/review-transitions.ts"() {
    init_enums();
    REVIEW_STATUS_TRANSITIONS = [
      [ReviewStatus.DRAFT, ReviewStatus.SUBMITTED],
      [ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW],
      [ReviewStatus.UNDER_REVIEW, ReviewStatus.APPROVED],
      [ReviewStatus.UNDER_REVIEW, ReviewStatus.REJECTED],
      [ReviewStatus.UNDER_REVIEW, ReviewStatus.NEEDS_CHANGES],
      [ReviewStatus.NEEDS_CHANGES, ReviewStatus.SUBMITTED],
      [ReviewStatus.APPROVED, ReviewStatus.EXPIRED],
      [ReviewStatus.APPROVED, ReviewStatus.REVOKED]
    ];
  }
});

// cloudfunctions/_shared/auth/index.ts
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
var OPENID_PATTERN;
var init_auth = __esm({
  "cloudfunctions/_shared/auth/index.ts"() {
    init_api();
    init_errors();
    OPENID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
  }
});

// cloudfunctions/_shared/idempotency/index.ts
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
var import_node_crypto2, IDEMPOTENCY_KEY_PATTERN;
var init_idempotency = __esm({
  "cloudfunctions/_shared/idempotency/index.ts"() {
    import_node_crypto2 = require("node:crypto");
    init_api();
    init_errors();
    IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
  }
});

// miniprogram/shared/types/primitives.ts
var IanaTimezone;
var init_primitives = __esm({
  "miniprogram/shared/types/primitives.ts"() {
    IanaTimezone = {
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
  }
});

// miniprogram/shared/constants/geography.ts
var GLOBAL_ID, RegionId, CountryId, CityId, REGION_DIRECTORY, COUNTRY_DIRECTORY, CITY_DIRECTORY;
var init_geography = __esm({
  "miniprogram/shared/constants/geography.ts"() {
    init_primitives();
    GLOBAL_ID = "global";
    RegionId = {
      ASIA_PACIFIC: "asia-pacific",
      EUROPE: "europe",
      NORTH_AMERICA: "north-america"
    };
    CountryId = {
      CN: "cn",
      CH: "ch",
      IT: "it",
      FR: "fr",
      AU: "au",
      SG: "sg",
      CA: "ca"
    };
    CityId = {
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
    REGION_DIRECTORY = [
      { id: RegionId.ASIA_PACIFIC, parentId: GLOBAL_ID, name: { zh: "\u4E9A\u592A", en: "Asia Pacific" } },
      { id: RegionId.EUROPE, parentId: GLOBAL_ID, name: { zh: "\u6B27\u6D32", en: "Europe" } },
      { id: RegionId.NORTH_AMERICA, parentId: GLOBAL_ID, name: { zh: "\u5317\u7F8E", en: "North America" } }
    ];
    COUNTRY_DIRECTORY = [
      { id: CountryId.CN, parentId: RegionId.ASIA_PACIFIC, name: { zh: "\u4E2D\u56FD", en: "China" } },
      { id: CountryId.CH, parentId: RegionId.EUROPE, name: { zh: "\u745E\u58EB", en: "Switzerland" } },
      { id: CountryId.IT, parentId: RegionId.EUROPE, name: { zh: "\u610F\u5927\u5229", en: "Italy" } },
      { id: CountryId.FR, parentId: RegionId.EUROPE, name: { zh: "\u6CD5\u56FD", en: "France" } },
      { id: CountryId.AU, parentId: RegionId.ASIA_PACIFIC, name: { zh: "\u6FB3\u5927\u5229\u4E9A", en: "Australia" } },
      { id: CountryId.SG, parentId: RegionId.ASIA_PACIFIC, name: { zh: "\u65B0\u52A0\u5761", en: "Singapore" } },
      { id: CountryId.CA, parentId: RegionId.NORTH_AMERICA, name: { zh: "\u52A0\u62FF\u5927", en: "Canada" } }
    ];
    CITY_DIRECTORY = [
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
  }
});

// cloudfunctions/_shared/projections/index.ts
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
  const clone = JSON.parse(JSON.stringify(value));
  const freeze = (candidate) => {
    Object.values(candidate).forEach((child) => {
      if (child !== null && typeof child === "object" && !Object.isFrozen(child)) freeze(child);
    });
    Object.freeze(candidate);
  };
  if (clone !== null && typeof clone === "object") freeze(clone);
  return clone;
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
function assertVerificationClaimEffective(claim, evaluatedAt) {
  if (!UTC_PATTERN.test(evaluatedAt) || Number.isNaN(Date.parse(evaluatedAt))) {
    throw new Error("Invalid evaluation instant");
  }
  const instant = Date.parse(evaluatedAt);
  const starts = Date.parse(claim.validFrom);
  const ends = claim.validUntil === void 0 ? Number.POSITIVE_INFINITY : Date.parse(claim.validUntil);
  if (claim.reviewStatus !== ReviewStatus.APPROVED || claim.verificationState !== VerificationState.HUMAN_REVIEWED || !claim.publicVisible || instant < starts || instant >= ends) {
    throw new SafeApiError(ApiErrorCode.ELIGIBILITY_NOT_MET, "The verification claim is not effective.", {
      details: { code: ApiErrorCode.ELIGIBILITY_NOT_MET, missingLabelIds: [claim.labelId] }
    });
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
var UTC_PATTERN, STABLE_ID_PATTERN, PROJECTION_FIELDS, RELATIONSHIP_REVOCATION_STATES, VERIFICATION_REVOCATION_STATES, EVENT_REVOCATION_STATES, CONTENT_REVOCATION_STATES, MEDIA_REVOCATION_STATES;
var init_projections = __esm({
  "cloudfunctions/_shared/projections/index.ts"() {
    init_api();
    init_enums();
    init_primitives();
    init_geography();
    init_errors();
    init_validation();
    UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    PROJECTION_FIELDS = Object.freeze({
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
    RELATIONSHIP_REVOCATION_STATES = Object.freeze([
      FriendshipState.REMOVED,
      FriendshipState.CANCELLED,
      FriendshipState.REJECTED
    ]);
    VERIFICATION_REVOCATION_STATES = Object.freeze([
      ReviewStatus.REJECTED,
      ReviewStatus.EXPIRED,
      ReviewStatus.REVOKED
    ]);
    EVENT_REVOCATION_STATES = Object.freeze([
      EventState.CANCELLED,
      EventState.PAUSED,
      EventState.REJECTED
    ]);
    CONTENT_REVOCATION_STATES = Object.freeze([
      PublicationState.UNPUBLISHED,
      PublicationState.REJECTED
    ]);
    MEDIA_REVOCATION_STATES = Object.freeze([
      MediaRightsState.REJECTED,
      MediaRightsState.EXPIRED,
      MediaRightsState.REVOKED
    ]);
  }
});

// cloudfunctions/adminApi/dto.ts
function fail(type) {
  throw new Error(`Invalid ${type} returned by admin repository adapter`);
}
function exactRecord(value, type, required, optional = []) {
  if (!isPlainRecord(value)) fail(type);
  const keys = Object.keys(value);
  if (required.some((field) => !Object.prototype.hasOwnProperty.call(value, field)) || keys.some((field) => !required.includes(field) && !optional.includes(field))) fail(type);
  return value;
}
function stringField(record, field, type) {
  const value = record[field];
  if (typeof value !== "string" || value.length === 0 || value.length > 1e3 || value !== value.trim() || CONTROL_CHARACTER_PATTERN.test(value) || MATERIAL_LOCATOR_PATTERN.test(value)) fail(type);
  return value;
}
function idValue(value, type) {
  if (typeof value !== "string" || !STABLE_ID_PATTERN2.test(value)) fail(type);
  return value;
}
function idField(record, field, type) {
  return idValue(record[field], type);
}
function patternField(record, field, pattern, type) {
  const value = stringField(record, field, type);
  if (!pattern.test(value)) fail(type);
  return value;
}
function optionalString(record, field, type) {
  const value = record[field];
  if (value === void 0) return void 0;
  return stringField(record, field, type);
}
function utcField(record, field, type) {
  const value = stringField(record, field, type);
  if (!isStrictUtcInstant(value)) fail(type);
  return value;
}
function versionField(record, field, type) {
  const value = record[field];
  if (!Number.isSafeInteger(value) || value < 1) fail(type);
  return value;
}
function versionedFields(record, type) {
  const version = versionField(record, "version", type);
  const createdAt = utcField(record, "createdAt", type);
  const updatedAt = utcField(record, "updatedAt", type);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) fail(type);
  return Object.freeze({ version, createdAt, updatedAt });
}
function enumField(record, field, allowed, type) {
  const value = stringField(record, field, type);
  if (!allowed.includes(value)) fail(type);
  return value;
}
function localizedName(value, type) {
  const record = exactRecord(value, type, ["zh", "en"]);
  return Object.freeze({
    zh: stringField(record, "zh", type),
    en: stringField(record, "en", type)
  });
}
function sanitizeReviewCase(value) {
  const parsed = parseReadOnlyProjection("ReviewCaseProjection", value);
  idValue(parsed.reviewCaseId, "ReviewCaseProjection");
  idValue(parsed.aggregateId, "ReviewCaseProjection");
  stringField(parsed, "title", "ReviewCaseProjection");
  stringField(parsed, "summary", "ReviewCaseProjection");
  parsed.evidenceAssetIds.forEach((assetId) => idValue(assetId, "ReviewCaseProjection"));
  if (parsed.submitterUserId !== void 0) idValue(parsed.submitterUserId, "ReviewCaseProjection");
  if (parsed.assignedReviewerUserId !== void 0) idValue(parsed.assignedReviewerUserId, "ReviewCaseProjection");
  if (!isStrictUtcInstant(parsed.createdAt) || !isStrictUtcInstant(parsed.updatedAt)) {
    fail("ReviewCaseProjection");
  }
  return parsed;
}
function sanitizePublicEvent(value) {
  const parsed = parseReadOnlyProjection("PublicEventProjection", value);
  [parsed.eventId, parsed.clubNodeId, parsed.organizerId, parsed.cityId].forEach((identifier) => idValue(identifier, "PublicEventProjection"));
  if (parsed.coverAssetId !== void 0) idValue(parsed.coverAssetId, "PublicEventProjection");
  if (![parsed.createdAt, parsed.updatedAt, parsed.startsAt, parsed.endsAt].every(isStrictUtcInstant)) {
    fail("PublicEventProjection");
  }
  const record = parsed;
  stringField(record, "title", "PublicEventProjection");
  stringField(record, "summary", "PublicEventProjection");
  return parsed;
}
function sanitizePublicVerificationClaim(value) {
  const parsed = parseReadOnlyProjection("PublicVerificationClaimProjection", value);
  [parsed.claimId, parsed.subjectUserId, parsed.labelId].forEach((identifier) => idValue(identifier, "PublicVerificationClaimProjection"));
  if (![parsed.createdAt, parsed.updatedAt, parsed.validFrom].every(isStrictUtcInstant) || parsed.validUntil !== void 0 && !isStrictUtcInstant(parsed.validUntil)) {
    fail("PublicVerificationClaimProjection");
  }
  stringField(
    parsed.labelText,
    "zh",
    "PublicVerificationClaimProjection.labelText"
  );
  stringField(
    parsed.labelText,
    "en",
    "PublicVerificationClaimProjection.labelText"
  );
  return parsed;
}
function sanitizeReport(value) {
  const type = "ReportProjection";
  const record = exactRecord(value, type, [
    "reportId",
    "targetType",
    "targetId",
    "status",
    "reasonCode",
    "version",
    "createdAt",
    "updatedAt"
  ]);
  const versioned = versionedFields(record, type);
  return Object.freeze({
    reportId: idField(record, "reportId", type),
    targetType: enumField(record, "targetType", ["USER", "EVENT", "CONTENT"], type),
    targetId: idField(record, "targetId", type),
    status: enumField(record, "status", ["OPEN", "RESOLVED", "DISMISSED"], type),
    reasonCode: patternField(record, "reasonCode", CODE_PATTERN, type),
    ...versioned
  });
}
function sanitizeAuditEntry(value) {
  const type = "AuditEntryProjection";
  const record = exactRecord(value, type, [
    "auditEntryId",
    "actorRole",
    "action",
    "targetType",
    "targetId",
    "requestId",
    "occurredAt",
    "result"
  ], ["actorUserId", "reasonCode"]);
  const actorUserId = optionalString(record, "actorUserId", type);
  const reasonCode = optionalString(record, "reasonCode", type);
  return Object.freeze({
    auditEntryId: idField(record, "auditEntryId", type),
    ...actorUserId === void 0 ? {} : { actorUserId: idValue(actorUserId, type) },
    actorRole: enumField(record, "actorRole", ["SYSTEM", "MEMBER", "ORGANIZER", "REVIEWER", "ADMIN"], type),
    action: patternField(record, "action", ACTION_PATTERN, type),
    targetType: patternField(record, "targetType", TARGET_TYPE_PATTERN, type),
    targetId: idField(record, "targetId", type),
    requestId: patternField(record, "requestId", REQUEST_ID_PATTERN2, type),
    occurredAt: utcField(record, "occurredAt", type),
    result: enumField(record, "result", ["SUCCEEDED", "FAILED"], type),
    ...reasonCode === void 0 ? {} : {
      reasonCode: patternField(record, "reasonCode", CODE_PATTERN, type)
    }
  });
}
function sanitizePublicOrganizer(value) {
  const type = "PublicOrganizerProjection";
  const record = exactRecord(value, type, [
    "organizerId",
    "name",
    "summary",
    "cityIds",
    "reviewStatus",
    "verificationState",
    "version",
    "createdAt",
    "updatedAt"
  ]);
  if (!Array.isArray(record.cityIds) || record.cityIds.length === 0 || !record.cityIds.every((cityId) => typeof cityId === "string" && cityId.length > 0)) fail(type);
  if (record.reviewStatus !== ReviewStatus.APPROVED || record.verificationState !== VerificationState.HUMAN_REVIEWED) fail(type);
  const versioned = versionedFields(record, type);
  return Object.freeze({
    organizerId: idField(record, "organizerId", type),
    name: localizedName(record.name, `${type}.name`),
    summary: stringField(record, "summary", type),
    cityIds: Object.freeze(record.cityIds.map((cityId) => idValue(cityId, type))),
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    ...versioned
  });
}
function sanitizePublicContent(value) {
  const type = "PublicContentProjection";
  const record = exactRecord(value, type, [
    "contentId",
    "creatorId",
    "title",
    "summary",
    "category",
    "publicationState",
    "mediaRightsState",
    "origin",
    "verificationState",
    "version",
    "createdAt",
    "updatedAt"
  ], ["collectionId", "coverAssetId"]);
  const collectionId = optionalString(record, "collectionId", type);
  const coverAssetId = optionalString(record, "coverAssetId", type);
  const versioned = versionedFields(record, type);
  return Object.freeze({
    contentId: idField(record, "contentId", type),
    ...collectionId === void 0 ? {} : { collectionId: idValue(collectionId, type) },
    creatorId: idField(record, "creatorId", type),
    title: stringField(record, "title", type),
    summary: stringField(record, "summary", type),
    category: enumField(record, "category", ["ART", "ANTIQUE", "JEWELRY"], type),
    publicationState: enumField(record, "publicationState", Object.values(PublicationState), type),
    ...coverAssetId === void 0 ? {} : { coverAssetId: idValue(coverAssetId, type) },
    mediaRightsState: enumField(record, "mediaRightsState", Object.values(MediaRightsState), type),
    origin: enumField(record, "origin", Object.values(RecordOrigin), type),
    verificationState: enumField(record, "verificationState", Object.values(VerificationState), type),
    ...versioned
  });
}
function exactResponse(value, action, keys) {
  return exactRecord(value, `${action} idempotency result`, keys);
}
function sanitizeCaseMutationResponse(action, value) {
  switch (action) {
    case "review.approve":
    case "review.reject":
    case "review.revoke": {
      const record = exactResponse(value, action, ["reviewCase", "projectionInvalidated"]);
      if (record.projectionInvalidated !== true) fail(`${action} idempotency result`);
      return Object.freeze({ reviewCase: sanitizeReviewCase(record.reviewCase), projectionInvalidated: true });
    }
    case "review.requestChanges": {
      const record = exactResponse(value, action, ["reviewCase"]);
      return Object.freeze({ reviewCase: sanitizeReviewCase(record.reviewCase) });
    }
    case "organizer.review": {
      const record = exactResponse(value, action, ["reviewCase", "organizer"]);
      return Object.freeze({
        reviewCase: sanitizeReviewCase(record.reviewCase),
        organizer: sanitizePublicOrganizer(record.organizer)
      });
    }
    case "event.review": {
      const record = exactResponse(value, action, ["reviewCase", "event"]);
      return Object.freeze({
        reviewCase: sanitizeReviewCase(record.reviewCase),
        event: sanitizePublicEvent(record.event)
      });
    }
    case "content.review": {
      const record = exactResponse(value, action, ["reviewCase", "content"]);
      return Object.freeze({
        reviewCase: sanitizeReviewCase(record.reviewCase),
        content: sanitizePublicContent(record.content)
      });
    }
    default:
      fail(`${action} idempotency result`);
  }
}
function sanitizeReportResolveResponse(value) {
  const record = exactRecord(value, "report.resolve idempotency result", ["report"]);
  return Object.freeze({ report: sanitizeReport(record.report) });
}
function assertPublishedEventSafety(event) {
  if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED) {
    if (event.reservationAvailable) fail("PublicEventProjection availability");
  }
}
function sanitizeVerificationClaimRevocation(value) {
  const type = "VerificationClaimRevocationProof";
  const record = exactRecord(value, type, ["reviewCaseId", "source"]);
  const source = exactRecord(record.source, `${type}.source`, [
    "collection",
    "aggregateId",
    "expectedVersion",
    "patch"
  ]);
  const patch = exactRecord(source.patch, `${type}.source.patch`, [
    "version",
    "reviewStatus",
    "publicVisible"
  ]);
  const expectedVersion = versionField(source, "expectedVersion", type);
  const version = versionField(patch, "version", type);
  if (source.collection !== "verification_claims" || patch.reviewStatus !== ReviewStatus.REVOKED || patch.publicVisible !== false || version !== expectedVersion + 1) fail(type);
  return Object.freeze({
    reviewCaseId: idField(record, "reviewCaseId", type),
    source: Object.freeze({
      collection: "verification_claims",
      aggregateId: idField(source, "aggregateId", type),
      expectedVersion,
      patch: Object.freeze({
        version,
        reviewStatus: ReviewStatus.REVOKED,
        publicVisible: false
      })
    })
  });
}
function sanitizeCursorResult(value, limit, itemSanitizer) {
  const type = "CursorResult";
  const record = exactRecord(value, type, ["items", "hasMore"], ["nextCursor"]);
  if (!Array.isArray(record.items) || record.items.length > limit || typeof record.hasMore !== "boolean") fail(type);
  const nextCursor = record.nextCursor;
  if (nextCursor !== void 0 && (typeof nextCursor !== "string" || !CURSOR_PATTERN.test(nextCursor))) fail(type);
  if (record.hasMore !== (nextCursor !== void 0) || record.hasMore && record.items.length === 0) fail(type);
  return Object.freeze({
    items: Object.freeze(record.items.map(itemSanitizer)),
    hasMore: record.hasMore,
    ...nextCursor === void 0 ? {} : { nextCursor }
  });
}
function assertEventDecisionResult(decision, event) {
  const prePublicationStates = Object.freeze([
    EventState.DRAFT,
    EventState.SUBMITTED,
    EventState.UNDER_REVIEW
  ]);
  const prePublicationPublicationStates = Object.freeze([
    PublicationState.DRAFT,
    PublicationState.SUBMITTED,
    PublicationState.UNDER_REVIEW
  ]);
  const valid = decision === "APPROVE" ? event.state === EventState.PUBLISHED && event.publicationState === PublicationState.PUBLISHED && event.verificationState === VerificationState.HUMAN_REVIEWED : decision === "REJECT" ? event.state === EventState.REJECTED && event.publicationState === PublicationState.REJECTED && event.reservationAvailable === false : decision === "REQUEST_CHANGES" ? prePublicationStates.includes(event.state) && prePublicationPublicationStates.includes(event.publicationState) && event.reservationAvailable === false : decision === "PAUSE" ? event.state === EventState.PAUSED && event.publicationState === PublicationState.UNPUBLISHED && event.reservationAvailable === false : event.state === EventState.CANCELLED && event.publicationState === PublicationState.UNPUBLISHED && event.reservationAvailable === false;
  if (!valid) fail(`event.review ${decision} result`);
  assertPublishedEventSafety(event);
}
function assertContentDecisionResult(decision, content) {
  const prePublicationStates = Object.freeze([
    PublicationState.DRAFT,
    PublicationState.SUBMITTED,
    PublicationState.UNDER_REVIEW
  ]);
  const valid = decision === "APPROVE" ? content.publicationState === PublicationState.PUBLISHED && content.verificationState === VerificationState.HUMAN_REVIEWED : decision === "REJECT" ? content.publicationState === PublicationState.REJECTED : decision === "REQUEST_CHANGES" ? prePublicationStates.includes(content.publicationState) : content.publicationState === PublicationState.UNPUBLISHED;
  if (!valid) fail(`content.review ${decision} result`);
}
var STABLE_ID_PATTERN2, REQUEST_ID_PATTERN2, CURSOR_PATTERN, ACTION_PATTERN, CODE_PATTERN, TARGET_TYPE_PATTERN, MATERIAL_LOCATOR_PATTERN, CONTROL_CHARACTER_PATTERN;
var init_dto = __esm({
  "cloudfunctions/adminApi/dto.ts"() {
    init_enums();
    init_validation();
    init_projections();
    init_time();
    STABLE_ID_PATTERN2 = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    REQUEST_ID_PATTERN2 = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
    CURSOR_PATTERN = /^[A-Za-z0-9._~:-]{1,512}$/;
    ACTION_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{0,99}$/;
    CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{0,63}$/;
    TARGET_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
    MATERIAL_LOCATOR_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9])/i;
    CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
  }
});

// cloudfunctions/adminApi/service.ts
var service_exports = {};
__export(service_exports, {
  AI_AUTOMATION_DISABLED: () => AI_AUTOMATION_DISABLED,
  assertApprovedDataMayProject: () => assertApprovedDataMayProject,
  auditApprovedData: () => auditApprovedData,
  executeAdminAction: () => executeAdminAction,
  invalidationUpdatesEveryViewer: () => invalidationUpdatesEveryViewer,
  redactAuditEntry: () => redactAuditEntry,
  redactReportForList: () => redactReportForList,
  redactReviewCaseForList: () => redactReviewCaseForList
});
function notFound(resourceType, resourceId) {
  throw new SafeApiError(ApiErrorCode.NOT_FOUND, "The requested admin resource was not found.", {
    details: { code: ApiErrorCode.NOT_FOUND, resourceType, resourceId }
  });
}
function invalidTransition(from, to) {
  throw new SafeApiError(ApiErrorCode.REVIEW_INVALID_TRANSITION, "The review state does not allow this decision.", {
    details: { code: ApiErrorCode.REVIEW_INVALID_TRANSITION, from, to }
  });
}
function requireMutationField(value, field) {
  if (value === void 0) {
    throw new SafeApiError(ApiErrorCode.INTERNAL_ERROR, "The review adapter returned an incomplete result.", {
      details: { code: ApiErrorCode.INTERNAL_ERROR, incidentId: `admin-result-${field}` }
    });
  }
  return value;
}
function assertMutationResultEnvelope(action, mutation) {
  const expectedFields = {
    "review.approve": ["reviewCase", "approvedClaim", "sourceAggregateId", "sourceVersion"],
    "review.reject": ["reviewCase", "sourceAggregateId", "sourceVersion"],
    "review.requestChanges": ["reviewCase", "sourceAggregateId", "sourceVersion"],
    "review.revoke": ["reviewCase", "revokedClaim", "sourceAggregateId", "sourceVersion"],
    "organizer.review": ["reviewCase", "organizer", "sourceAggregateId", "sourceVersion"],
    "event.review": ["reviewCase", "event", "sourceAggregateId", "sourceVersion"],
    "content.review": ["reviewCase", "content", "sourceAggregateId", "sourceVersion"],
    "report.resolve": ["report", "sourceAggregateId", "sourceVersion"]
  };
  const required = expectedFields[action];
  if (!isPlainRecord(mutation) || Object.keys(mutation).length !== required.length || required.some((field) => !Object.prototype.hasOwnProperty.call(mutation, field)) || Object.keys(mutation).some((field) => !required.includes(field))) {
    throw new Error("Admin adapter returned an unexpected mutation result envelope");
  }
}
function plusTtl(instant) {
  return new Date(Date.parse(instant) + IDEMPOTENCY_TTL_MS).toISOString();
}
function assertPrincipalMatchesTrustedOpenId(principal, openId) {
  if (principal !== null && principal.openId !== openId) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "Authentication is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
}
async function authenticate(dependencies, action) {
  const openId = requireTrustedOpenId(dependencies.getWxContext);
  const loaded = await dependencies.loadAdminPrincipal(openId);
  assertPrincipalMatchesTrustedOpenId(loaded, openId);
  const principal = requireActiveAllowlistedAdmin(loaded, dependencies.now());
  requireActionRole(principal, action);
  return principal;
}
function redactReviewCaseForList(reviewCase) {
  return Object.freeze({
    reviewCaseId: reviewCase.reviewCaseId,
    domain: reviewCase.domain,
    aggregateId: REDACTED_TARGET_ID,
    status: reviewCase.status,
    title: `${reviewCase.domain} \u53D7\u9650\u5BA1\u6838\u6848\u4EF6`,
    summary: "\u8BE6\u60C5\u4EC5\u5728\u670D\u52A1\u7AEF\u6388\u6743\u540E\u8FD4\u56DE\uFF1B\u51BB\u7ED3\u534F\u8BAE\u672A\u63D0\u4F9B\u6750\u6599\u8BBF\u95EE\u5BA1\u8BA1\uFF0C\u539F\u59CB\u6750\u6599\u4FDD\u6301\u4E0D\u53EF\u89C1\u3002",
    evidenceAssetIds: Object.freeze([]),
    version: reviewCase.version,
    createdAt: reviewCase.createdAt,
    updatedAt: reviewCase.updatedAt
  });
}
function redactReportForList(report) {
  return Object.freeze({
    reportId: report.reportId,
    targetType: report.targetType,
    targetId: REDACTED_TARGET_ID,
    status: report.status,
    reasonCode: report.reasonCode,
    version: report.version,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  });
}
function redactAuditEntry(entry) {
  return Object.freeze({
    auditEntryId: REDACTED_AUDIT_ENTRY_ID,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType,
    targetId: REDACTED_TARGET_ID,
    requestId: REDACTED_REQUEST_ID,
    occurredAt: entry.occurredAt,
    result: entry.result,
    ...entry.reasonCode === void 0 ? {} : { reasonCode: entry.reasonCode }
  });
}
function freezePage(result, items) {
  return Object.freeze({
    items: Object.freeze([...items]),
    hasMore: result.hasMore,
    ...result.nextCursor === void 0 ? {} : { nextCursor: result.nextCursor }
  });
}
function readListQuery(payload, domains) {
  return {
    domains,
    limit: payload.limit,
    ...payload.status === void 0 ? {} : { status: payload.status },
    ...payload.cursor === void 0 ? {} : { cursor: payload.cursor }
  };
}
function readReportListQuery(payload) {
  return {
    limit: payload.limit,
    ...payload.status === void 0 ? {} : { status: payload.status },
    ...payload.cursor === void 0 ? {} : { cursor: payload.cursor }
  };
}
function readAuditListQuery(payload) {
  return {
    limit: payload.limit,
    ...payload.action === void 0 ? {} : { action: payload.action },
    ...payload.targetId === void 0 ? {} : { targetId: payload.targetId },
    ...payload.occurredAfter === void 0 ? {} : { occurredAfter: payload.occurredAfter },
    ...payload.occurredBefore === void 0 ? {} : { occurredBefore: payload.occurredBefore },
    ...payload.cursor === void 0 ? {} : { cursor: payload.cursor }
  };
}
function reviewPlan(action, payload) {
  switch (action) {
    case "review.approve":
      return {
        domain: "SOCIAL",
        nextStatus: ReviewStatus.APPROVED,
        reviewScope: "TAG_VERIFICATION",
        reasonCode: "ADMIN_REVIEW_APPROVED",
        reason: payload.decisionNote,
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED
      };
    case "review.reject":
      return {
        domain: "SOCIAL",
        nextStatus: ReviewStatus.REJECTED,
        reviewScope: "TAG_VERIFICATION",
        reasonCode: payload.reasonCode,
        reason: payload.decisionNote,
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED
      };
    case "review.requestChanges":
      return {
        domain: "SOCIAL",
        nextStatus: ReviewStatus.NEEDS_CHANGES,
        reviewScope: "TAG_VERIFICATION",
        reasonCode: "ADMIN_REVIEW_CHANGES_REQUESTED",
        reason: payload.requiredChanges.join("\uFF1B"),
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED
      };
    case "review.revoke":
      return {
        domain: "SOCIAL",
        nextStatus: ReviewStatus.REVOKED,
        reviewScope: "TAG_VERIFICATION",
        reasonCode: payload.reasonCode,
        reason: payload.reasonCode,
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED
      };
    case "organizer.review": {
      const decision = payload.decision;
      if (decision !== "APPROVE") {
        throw new SafeApiError(ApiErrorCode.NOT_IMPLEMENTED, "The frozen response cannot represent a non-approved organizer.", {
          details: { code: ApiErrorCode.NOT_IMPLEMENTED, action, contractVersion: "1.0.0" }
        });
      }
      return {
        domain: "ORGANIZER",
        nextStatus: ReviewStatus.APPROVED,
        reviewScope: "ORGANIZER_APPLICATION",
        reasonCode: "ORGANIZER_APPROVED",
        reason: payload.note,
        invalidationKind: ProjectionInvalidationKind.EVENT_CHANGED
      };
    }
    case "event.review": {
      const decision = payload.decision;
      const nextStatus = decision === "APPROVE" ? ReviewStatus.APPROVED : decision === "REJECT" ? ReviewStatus.REJECTED : decision === "REQUEST_CHANGES" ? ReviewStatus.NEEDS_CHANGES : ReviewStatus.REVOKED;
      return {
        domain: "EVENT",
        nextStatus,
        reviewScope: "EVENT_PUBLICATION",
        reasonCode: `EVENT_${decision}`,
        reason: payload.note,
        invalidationKind: ProjectionInvalidationKind.EVENT_CHANGED
      };
    }
    case "content.review": {
      const decision = payload.decision;
      const nextStatus = decision === "APPROVE" ? ReviewStatus.APPROVED : decision === "REJECT" ? ReviewStatus.REJECTED : decision === "REQUEST_CHANGES" ? ReviewStatus.NEEDS_CHANGES : ReviewStatus.REVOKED;
      return {
        domain: "CONTENT",
        nextStatus,
        reviewScope: "CONTENT_PUBLICATION",
        reasonCode: `CONTENT_${decision}`,
        reason: payload.note,
        invalidationKind: ProjectionInvalidationKind.CONTENT_CHANGED
      };
    }
  }
}
function assertOriginalSnapshot(snapshot, reviewCase, occurredAt) {
  if (snapshot === null || !isPlainRecord(snapshot) || Object.keys(snapshot).length !== 5 || Object.keys(snapshot).some((field) => ![
    "reviewCaseId",
    "aggregateId",
    "sourceVersion",
    "capturedAt",
    "raw"
  ].includes(field)) || snapshot.reviewCaseId !== reviewCase.reviewCaseId || snapshot.aggregateId !== reviewCase.aggregateId || !Number.isSafeInteger(snapshot.sourceVersion) || snapshot.sourceVersion < 1 || typeof snapshot.capturedAt !== "string" || !isValidUtcInstant(snapshot.capturedAt) || Date.parse(snapshot.capturedAt) > Date.parse(occurredAt) || snapshot.raw === null || snapshot.raw === void 0) {
    throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, "The immutable original application snapshot is required.", {
      details: { code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, missingEvidenceKinds: ["ORIGINAL_APPLICATION_SNAPSHOT"] }
    });
  }
}
function createAuditEntryId(dependencies) {
  const value = dependencies.createId("audit-entry");
  if (typeof value !== "string" || !DATA_AUDIT_ID_PATTERN.test(value)) {
    throw new Error("Admin audit ID generator returned an invalid identifier");
  }
  return value;
}
function assertApprovalEvidence(action, plan, reviewCase) {
  if (action === "review.approve" && reviewCase.submitterUserId === void 0) {
    throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, "A subject binding is required for verification approval.", {
      details: {
        code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED,
        missingEvidenceKinds: ["SUBMITTER_BINDING"]
      }
    });
  }
  if (plan.nextStatus === ReviewStatus.APPROVED && (action === "review.approve" || action === "content.review") && reviewCase.evidenceAssetIds.length === 0) {
    throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, "Human approval requires submitted evidence.", {
      details: {
        code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED,
        missingEvidenceKinds: [action === "content.review" ? "MEDIA_RIGHTS_EVIDENCE" : "APPLICATION_EVIDENCE"]
      }
    });
  }
}
function requireCaseAssignment(principal, reviewCase) {
  if (reviewCase.assignedReviewerUserId !== void 0 && reviewCase.assignedReviewerUserId !== principal.userId && !principal.roles.includes(AdminRole.SUPER_ADMIN)) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "The case is assigned to another reviewer.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "CASE_ASSIGNED_TO_ANOTHER_REVIEWER" }
    });
  }
}
function requireActionAggregateMatch(action, payload, reviewCase) {
  const actionAggregateId = action === "organizer.review" ? payload.organizerId : action === "event.review" ? payload.eventId : action === "content.review" ? payload.contentId : reviewCase.aggregateId;
  if (actionAggregateId !== reviewCase.aggregateId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "The action target does not match the review case.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "ACTION_AGGREGATE_MISMATCH" }
    });
  }
}
function assertCaseMutationResult(before, after, plan, occurredAt) {
  const parsed = sanitizeReviewCase(after);
  if (parsed.reviewCaseId !== before.reviewCaseId || parsed.aggregateId !== before.aggregateId || parsed.domain !== before.domain || parsed.title !== before.title || parsed.summary !== before.summary || parsed.submitterUserId !== before.submitterUserId || parsed.assignedReviewerUserId !== before.assignedReviewerUserId || parsed.evidenceAssetIds.length !== before.evidenceAssetIds.length || parsed.evidenceAssetIds.some((assetId, index) => assetId !== before.evidenceAssetIds[index]) || parsed.status !== plan.nextStatus || parsed.version !== before.version + 1 || parsed.createdAt !== before.createdAt || Date.parse(occurredAt) < Date.parse(before.updatedAt) || parsed.updatedAt !== occurredAt) {
    throw new Error("Admin adapter returned a non-sequential or mismatched ReviewCaseProjection");
  }
  return parsed;
}
function assertAuthoritativeMutationBinding(action, before, snapshot, mutation, payload, occurredAt) {
  if ((action === "review.reject" || action === "review.requestChanges") && (mutation.sourceAggregateId !== snapshot.aggregateId || mutation.sourceVersion !== snapshot.sourceVersion + 1)) {
    throw new Error("Verification-request invalidation must reference the sequential reviewed source version");
  }
  if (action === "review.revoke") {
    const proof = sanitizeVerificationClaimRevocation(
      requireMutationField(mutation.revokedClaim, "revokedClaim")
    );
    if (proof.reviewCaseId !== before.reviewCaseId || mutation.sourceAggregateId !== proof.source.aggregateId || mutation.sourceVersion !== proof.source.patch.version) {
      throw new Error("Verification revocation invalidation must reference its sequential claim patch");
    }
  } else if (mutation.revokedClaim !== void 0) {
    throw new Error("Only review.revoke may return a verification claim revocation proof");
  }
  if (action === "organizer.review") {
    const organizer = sanitizePublicOrganizer(requireMutationField(mutation.organizer, "organizer"));
    if (organizer.organizerId !== before.aggregateId || mutation.sourceAggregateId !== organizer.organizerId || mutation.sourceVersion !== organizer.version || organizer.updatedAt !== occurredAt) {
      throw new Error("Organizer review returned a mismatched public projection");
    }
  }
  if (action === "event.review") {
    const event = sanitizePublicEvent(requireMutationField(mutation.event, "event"));
    if (event.eventId !== before.aggregateId || mutation.sourceAggregateId !== event.eventId || mutation.sourceVersion !== event.version || event.updatedAt !== occurredAt) {
      throw new Error("Event review returned a mismatched public projection");
    }
    assertEventDecisionResult(
      payload.decision,
      event
    );
  }
  if (action === "content.review") {
    const content = sanitizePublicContent(requireMutationField(mutation.content, "content"));
    if (content.contentId !== before.aggregateId || mutation.sourceAggregateId !== content.contentId || mutation.sourceVersion !== content.version || content.updatedAt !== occurredAt) {
      throw new Error("Content review returned a mismatched public projection");
    }
    assertContentDecisionResult(
      payload.decision,
      content
    );
  }
}
function createReviewLog(dependencies, principal, action, requestId, occurredAt, before, after, snapshot, plan) {
  return Object.freeze({
    auditEntryId: createAuditEntryId(dependencies),
    actorUserId: principal.userId,
    actorRole: auditActorRole(principal),
    action,
    targetType: "REVIEW_CASE",
    targetId: before.aggregateId,
    requestId,
    occurredAt,
    result: "SUCCEEDED",
    reasonCode: plan.reasonCode,
    reviewCaseId: before.reviewCaseId,
    reviewedBy: principal.userId,
    reviewedAt: occurredAt,
    reviewScope: plan.reviewScope,
    reason: plan.reason,
    beforeStatus: before.status,
    afterStatus: after.status,
    expectedVersion: before.version,
    sourceSnapshotVersion: snapshot.sourceVersion,
    version: after.version
  });
}
function idempotencyNamespace(action, principal, key) {
  return `adminApi:${action}:${principal.openId}:${key}`;
}
function sanitizeIdempotencyRecord(existing, expectedNamespace) {
  if (existing === null) return null;
  const record = existing;
  if (!isPlainRecord(existing) || Object.keys(existing).length !== IDEMPOTENCY_RECORD_FIELDS.length || Object.keys(existing).some((field) => !IDEMPOTENCY_RECORD_FIELDS.includes(field)) || record.namespace !== expectedNamespace || typeof record.requestFingerprint !== "string" || !SHA256_FINGERPRINT_PATTERN.test(record.requestFingerprint) || typeof record.requestId !== "string" || !DATA_AUDIT_REQUEST_ID_PATTERN.test(record.requestId) || record.status !== "COMPLETED" || typeof record.createdAt !== "string" || typeof record.expiresAt !== "string" || !isValidUtcInstant(record.createdAt) || !isValidUtcInstant(record.expiresAt) || Date.parse(record.expiresAt) <= Date.parse(record.createdAt)) {
    throw new Error("Admin repository returned a malformed idempotency record");
  }
  return Object.freeze({
    namespace: record.namespace,
    requestFingerprint: record.requestFingerprint,
    requestId: record.requestId,
    status: "COMPLETED",
    result: record.result,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt
  });
}
function idempotencyReplayOrConflict(existing, expectedNamespace, fingerprint) {
  const safeExisting = sanitizeIdempotencyRecord(existing, expectedNamespace);
  if (safeExisting === null) return void 0;
  if (safeExisting.requestFingerprint !== fingerprint) {
    throw new SafeApiError(ApiErrorCode.IDEMPOTENCY_CONFLICT, "The idempotency key was already used.", {
      details: { code: ApiErrorCode.IDEMPOTENCY_CONFLICT, firstRequestId: safeExisting.requestId }
    });
  }
  return safeExisting.result;
}
function responseForCaseMutation(action, result, reviewCase, payload) {
  switch (action) {
    case "review.approve":
    case "review.reject":
    case "review.revoke":
      return Object.freeze({ reviewCase, projectionInvalidated: true });
    case "review.requestChanges":
      return Object.freeze({ reviewCase });
    case "organizer.review": {
      const organizer = sanitizePublicOrganizer(requireMutationField(result.organizer, "organizer"));
      if (organizer.reviewStatus !== ReviewStatus.APPROVED || organizer.verificationState !== VerificationState.HUMAN_REVIEWED) {
        throw new Error("Organizer approval adapter returned a non-public organizer projection");
      }
      return Object.freeze({ reviewCase, organizer });
    }
    case "event.review": {
      const event = sanitizePublicEvent(requireMutationField(result.event, "event"));
      assertEventDecisionResult(
        payload.decision,
        event
      );
      return Object.freeze({ reviewCase, event });
    }
    case "content.review": {
      const content = sanitizePublicContent(requireMutationField(result.content, "content"));
      assertContentDecisionResult(
        payload.decision,
        content
      );
      return Object.freeze({
        reviewCase,
        content
      });
    }
  }
}
function sameReviewCase(left, right) {
  return left.reviewCaseId === right.reviewCaseId && left.domain === right.domain && left.aggregateId === right.aggregateId && left.status === right.status && left.title === right.title && left.summary === right.summary && left.submitterUserId === right.submitterUserId && left.assignedReviewerUserId === right.assignedReviewerUserId && left.version === right.version && left.createdAt === right.createdAt && left.updatedAt === right.updatedAt && left.evidenceAssetIds.length === right.evidenceAssetIds.length && left.evidenceAssetIds.every((assetId, index) => assetId === right.evidenceAssetIds[index]);
}
function sanitizeCaseMutationReplay(action, value, current, plan, payload) {
  const data = sanitizeCaseMutationResponse(action, value);
  const replayCase = sanitizeReviewCase(data.reviewCase);
  if (replayCase.status !== plan.nextStatus || !sameReviewCase(replayCase, current)) {
    throw new Error("Stored admin idempotency result does not match the current review case");
  }
  if (action === "organizer.review") {
    const organizer = sanitizePublicOrganizer(data.organizer);
    if (organizer.organizerId !== current.aggregateId || organizer.updatedAt !== current.updatedAt) {
      throw new Error("Stored organizer idempotency result is stale or mismatched");
    }
  } else if (action === "event.review") {
    const event = sanitizePublicEvent(data.event);
    if (event.eventId !== current.aggregateId || event.updatedAt !== current.updatedAt) {
      throw new Error("Stored event idempotency result is stale or mismatched");
    }
    assertEventDecisionResult(
      payload.decision,
      event
    );
  } else if (action === "content.review") {
    const content = sanitizePublicContent(data.content);
    if (content.contentId !== current.aggregateId || content.updatedAt !== current.updatedAt) {
      throw new Error("Stored content idempotency result is stale or mismatched");
    }
    assertContentDecisionResult(
      payload.decision,
      content
    );
    if (payload.decision === "APPROVE" && content.mediaRightsState !== MediaRightsState.APPROVED) {
      throw new Error("Stored approved content result no longer satisfies media-rights policy");
    }
  }
  return data;
}
function sameReport(left, right) {
  return left.reportId === right.reportId && left.targetType === right.targetType && left.targetId === right.targetId && left.status === right.status && left.reasonCode === right.reasonCode && left.version === right.version && left.createdAt === right.createdAt && left.updatedAt === right.updatedAt;
}
async function executeCaseMutation(dependencies, principal, action, requestId, payload) {
  const occurredAt = dependencies.now();
  const plan = reviewPlan(action, payload);
  const reviewCaseId = payload.reviewCaseId;
  const expectedVersion = payload.expectedVersion;
  const key = payload.idempotencyKey;
  const namespace = idempotencyNamespace(action, principal, key);
  const fingerprint = fingerprintPayload(payload);
  return dependencies.repository.runTransaction(async (transaction) => {
    const existing = await transaction.getIdempotency(namespace);
    const beforeCandidate = await transaction.getReviewCase(reviewCaseId);
    if (beforeCandidate === null) notFound("ReviewCase", reviewCaseId);
    const before = sanitizeReviewCase(beforeCandidate);
    requireDomainAccess(principal, before.domain);
    requireCaseAssignment(principal, before);
    requireActionAggregateMatch(action, payload, before);
    if (before.domain !== plan.domain) {
      throw new SafeApiError(ApiErrorCode.FORBIDDEN, "The action does not own this review domain.", {
        details: { code: ApiErrorCode.FORBIDDEN, policy: "ACTION_DOMAIN_MISMATCH" }
      });
    }
    const replay = idempotencyReplayOrConflict(existing, namespace, fingerprint);
    if (replay !== void 0) return sanitizeCaseMutationReplay(action, replay, before, plan, payload);
    requireExpectedVersion(expectedVersion, before.version);
    if (!isLegalReviewTransition(before.status, plan.nextStatus)) {
      invalidTransition(before.status, plan.nextStatus);
    }
    const snapshot = await transaction.getOriginalApplicationSnapshot(reviewCaseId);
    assertOriginalSnapshot(snapshot, before, occurredAt);
    assertApprovalEvidence(action, plan, before);
    const mutation = await transaction.applyMutation(Object.freeze({
      action,
      writableCollections: CLOUD_ACTION_REGISTRY[action].writableCollections,
      payload,
      principal,
      requestId,
      occurredAt,
      beforeReviewCase: before,
      nextReviewStatus: plan.nextStatus,
      originalSnapshot: snapshot
    }));
    assertMutationResultEnvelope(action, mutation);
    const after = assertCaseMutationResult(
      before,
      requireMutationField(mutation.reviewCase, "reviewCase"),
      plan,
      occurredAt
    );
    if (!Number.isSafeInteger(mutation.sourceVersion) || mutation.sourceVersion < 1) {
      throw new Error("Admin adapter returned an invalid authoritative source version");
    }
    if (action === "review.approve") {
      const approvedClaim = sanitizePublicVerificationClaim(
        requireMutationField(mutation.approvedClaim, "approvedClaim")
      );
      try {
        assertVerificationClaimEffective(approvedClaim, occurredAt);
      } catch {
        throw new Error("Verification approval returned a claim that is not currently effective");
      }
      if (mutation.sourceAggregateId !== approvedClaim.claimId || mutation.sourceVersion !== approvedClaim.version || before.submitterUserId !== void 0 && approvedClaim.subjectUserId !== before.submitterUserId || approvedClaim.reviewStatus !== ReviewStatus.APPROVED || approvedClaim.verificationState !== VerificationState.HUMAN_REVIEWED || approvedClaim.publicVisible !== true || approvedClaim.updatedAt !== occurredAt) {
        throw new Error("Verification approval invalidation must reference the approved claim version");
      }
    } else if (mutation.approvedClaim !== void 0) {
      throw new Error("Only review.approve may create an approved public verification claim");
    }
    assertAuthoritativeMutationBinding(action, before, snapshot, mutation, payload, occurredAt);
    if (action === "content.review" && payload.decision === "APPROVE" && sanitizePublicContent(
      requireMutationField(mutation.content, "content")
    ).mediaRightsState !== MediaRightsState.APPROVED) {
      throw new SafeApiError(ApiErrorCode.MEDIA_RIGHTS_REQUIRED, "Approved media rights are required before publication.", {
        details: {
          code: ApiErrorCode.MEDIA_RIGHTS_REQUIRED,
          mediaAssetIds: [...before.evidenceAssetIds]
        }
      });
    }
    const invalidation = createProjectionInvalidation({
      eventId: dependencies.createId("projection-invalidation"),
      kind: plan.invalidationKind,
      sourceAggregateId: mutation.sourceAggregateId,
      sourceVersion: mutation.sourceVersion,
      occurredAt,
      reason: plan.reasonCode,
      requestId
    });
    const reviewLog = createReviewLog(
      dependencies,
      principal,
      action,
      requestId,
      occurredAt,
      before,
      after,
      snapshot,
      plan
    );
    if (after.status === ReviewStatus.APPROVED && !isCompleteApprovalLog(after, reviewLog)) {
      throw new Error("Generated approval ReviewLog failed the projection audit gate");
    }
    const data = responseForCaseMutation(action, mutation, after, payload);
    await transaction.appendReviewLog(reviewLog);
    await transaction.appendProjectionInvalidation(invalidation);
    await transaction.completeIdempotency(Object.freeze({
      namespace,
      requestFingerprint: fingerprint,
      requestId,
      status: "COMPLETED",
      result: data,
      expiresAt: plusTtl(occurredAt),
      createdAt: occurredAt
    }));
    return data;
  });
}
async function executeReportResolve(dependencies, principal, requestId, payload) {
  const occurredAt = dependencies.now();
  const reportId = payload.reportId;
  const expectedVersion = payload.expectedVersion;
  const key = payload.idempotencyKey;
  const namespace = idempotencyNamespace("report.resolve", principal, key);
  const fingerprint = fingerprintPayload(payload);
  return dependencies.repository.runTransaction(async (transaction) => {
    const existing = await transaction.getIdempotency(namespace);
    const beforeCandidate = await transaction.getReport(reportId);
    if (beforeCandidate === null) notFound("Report", reportId);
    const before = sanitizeReport(beforeCandidate);
    const replay = idempotencyReplayOrConflict(existing, namespace, fingerprint);
    if (replay !== void 0) {
      const data2 = sanitizeReportResolveResponse(replay);
      const replayReport = sanitizeReport(data2.report);
      if (!sameReport(replayReport, before)) {
        throw new Error("Stored report idempotency result does not match the current report");
      }
      return data2;
    }
    requireExpectedVersion(expectedVersion, before.version);
    if (before.status !== "OPEN") invalidTransition(before.status, payload.resolution);
    const mutation = await transaction.applyMutation(Object.freeze({
      action: "report.resolve",
      writableCollections: CLOUD_ACTION_REGISTRY["report.resolve"].writableCollections,
      payload,
      principal,
      requestId,
      occurredAt
    }));
    assertMutationResultEnvelope("report.resolve", mutation);
    const report = sanitizeReport(requireMutationField(mutation.report, "report"));
    const expectedStatus = payload.resolution === "DISMISSED" ? "DISMISSED" : "RESOLVED";
    if (report.reportId !== before.reportId || report.version !== before.version + 1 || report.status !== expectedStatus || report.targetType !== before.targetType || report.targetId !== before.targetId || report.reasonCode !== before.reasonCode || report.createdAt !== before.createdAt || Date.parse(occurredAt) < Date.parse(before.updatedAt) || report.updatedAt !== occurredAt) {
      throw new Error("Admin adapter returned a mismatched ReportProjection");
    }
    if (mutation.sourceAggregateId !== report.reportId || mutation.sourceVersion !== report.version) {
      throw new Error("Report mutation source must match the resulting ReportProjection");
    }
    const audit = Object.freeze({
      auditEntryId: createAuditEntryId(dependencies),
      actorUserId: principal.userId,
      actorRole: auditActorRole(principal),
      action: "report.resolve",
      targetType: "REPORT",
      targetId: reportId,
      requestId,
      occurredAt,
      result: "SUCCEEDED",
      reasonCode: payload.resolution
    });
    const data = Object.freeze({ report });
    await transaction.appendAudit(audit);
    await transaction.completeIdempotency(Object.freeze({
      namespace,
      requestFingerprint: fingerprint,
      requestId,
      status: "COMPLETED",
      result: data,
      expiresAt: plusTtl(occurredAt),
      createdAt: occurredAt
    }));
    return data;
  });
}
async function getReviewDetail(dependencies, principal, reviewCaseId) {
  return dependencies.repository.runTransaction(async (transaction) => {
    const candidate = await transaction.getReviewCase(reviewCaseId);
    if (candidate === null) notFound("ReviewCase", reviewCaseId);
    const reviewCase = sanitizeReviewCase(candidate);
    requireDomainAccess(principal, reviewCase.domain);
    requireCaseAssignment(principal, reviewCase);
    return Object.freeze({ reviewCase });
  });
}
async function executeAdminAction(dependencies, action, requestId, payload) {
  const principal = await authenticate(dependencies, action);
  switch (action) {
    case "admin.bootstrap": {
      requireRequestedScope(principal, payload.requestedScope);
      return Object.freeze({
        session: Object.freeze({
          userId: principal.userId,
          roles: sessionRoles(principal),
          runtimeMode: dependencies.runtimeMode,
          contractVersion: "1.0.0",
          profileComplete: true,
          expiresAt: principal.expiresAt
        }),
        availableQueues: availableQueues(principal)
      });
    }
    case "review.list": {
      const requestedDomain = payload.domain;
      if (requestedDomain !== void 0) requireDomainAccess(principal, requestedDomain);
      const domains = requestedDomain === void 0 ? domainsForPrincipal(principal) : [requestedDomain];
      const limit = payload.limit;
      const result = sanitizeCursorResult(
        await dependencies.repository.listReviewCases(readListQuery(payload, domains)),
        limit,
        sanitizeReviewCase
      );
      const requestedStatus = payload.status;
      const filtered = result.items.filter((item) => domains.includes(item.domain) && (requestedStatus === void 0 || item.status === requestedStatus));
      const redacted = filtered.map(redactReviewCaseForList);
      return Object.freeze({ page: freezePage(result, redacted) });
    }
    case "review.get":
      return getReviewDetail(dependencies, principal, payload.reviewCaseId);
    case "review.approve":
    case "review.reject":
    case "review.requestChanges":
    case "review.revoke":
    case "organizer.review":
    case "event.review":
    case "content.review":
      return executeCaseMutation(dependencies, principal, action, requestId, payload);
    case "report.list": {
      const result = sanitizeCursorResult(
        await dependencies.repository.listReports(readReportListQuery(payload)),
        payload.limit,
        sanitizeReport
      );
      const requestedStatus = payload.status;
      const filtered = result.items.filter((item) => requestedStatus === void 0 || item.status === requestedStatus);
      return Object.freeze({ page: freezePage(result, filtered.map(redactReportForList)) });
    }
    case "report.resolve":
      return executeReportResolve(dependencies, principal, requestId, payload);
    case "audit.list": {
      const result = sanitizeCursorResult(
        await dependencies.repository.listAuditEntries(readAuditListQuery(payload)),
        payload.limit,
        sanitizeAuditEntry
      );
      return Object.freeze({ page: freezePage(result, result.items.map(redactAuditEntry)) });
    }
    default:
      throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The action is not owned by adminApi.", {
        details: { code: ApiErrorCode.INVALID_REQUEST, field: "action", reason: "ACTION_NOT_REGISTERED" }
      });
  }
}
function expectedApprovalLogIdentity(reviewCase) {
  switch (reviewCase.domain) {
    case "SOCIAL":
      return {
        action: "review.approve",
        scope: "TAG_VERIFICATION",
        reasonCode: "ADMIN_REVIEW_APPROVED",
        actorRoles: ["REVIEWER", "ADMIN"]
      };
    case "ORGANIZER":
      return {
        action: "organizer.review",
        scope: "ORGANIZER_APPLICATION",
        reasonCode: "ORGANIZER_APPROVED",
        actorRoles: ["ADMIN"]
      };
    case "EVENT":
      return {
        action: "event.review",
        scope: "EVENT_PUBLICATION",
        reasonCode: "EVENT_APPROVE",
        actorRoles: ["ADMIN"]
      };
    case "CONTENT":
      return {
        action: "content.review",
        scope: "CONTENT_PUBLICATION",
        reasonCode: "CONTENT_APPROVE",
        actorRoles: ["ADMIN"]
      };
    case "REPORT":
      return null;
  }
}
function isValidUtcInstant(value) {
  return isStrictUtcInstant(value);
}
function isCompleteApprovalLog(reviewCase, log) {
  const logRecord = log;
  if (!isPlainRecord(log) || Object.keys(log).length !== REVIEW_LOG_FIELDS.length || Object.keys(log).some((field) => !REVIEW_LOG_FIELDS.includes(field)) || REVIEW_LOG_STRING_FIELDS.some((field) => typeof logRecord[field] !== "string") || typeof log.expectedVersion !== "number" || typeof log.sourceSnapshotVersion !== "number" || typeof log.version !== "number") {
    return false;
  }
  let safeReviewCase;
  try {
    safeReviewCase = sanitizeReviewCase(reviewCase);
  } catch {
    return false;
  }
  const identity = expectedApprovalLogIdentity(safeReviewCase);
  if (identity === null) return false;
  return log.reviewCaseId === safeReviewCase.reviewCaseId && log.targetType === "REVIEW_CASE" && log.targetId === safeReviewCase.aggregateId && log.action === identity.action && log.reviewScope === identity.scope && log.result === "SUCCEEDED" && identity.actorRoles.includes(log.actorRole) && log.actorUserId === log.reviewedBy && (log.actorRole !== "REVIEWER" || safeReviewCase.assignedReviewerUserId === void 0 || log.reviewedBy === safeReviewCase.assignedReviewerUserId) && DATA_AUDIT_ID_PATTERN.test(log.reviewedBy) && DATA_AUDIT_ID_PATTERN.test(log.auditEntryId) && DATA_AUDIT_REQUEST_ID_PATTERN.test(log.requestId) && isValidUtcInstant(log.reviewedAt) && isValidUtcInstant(log.occurredAt) && log.reviewedAt === log.occurredAt && log.reviewedAt === safeReviewCase.updatedAt && log.beforeStatus === ReviewStatus.UNDER_REVIEW && log.afterStatus === ReviewStatus.APPROVED && isLegalReviewTransition(log.beforeStatus, log.afterStatus) && Number.isSafeInteger(log.expectedVersion) && log.expectedVersion > 0 && log.expectedVersion + 1 === log.version && log.version === safeReviewCase.version && Number.isSafeInteger(log.sourceSnapshotVersion) && log.sourceSnapshotVersion > 0 && typeof log.reasonCode === "string" && DATA_AUDIT_REASON_CODE_PATTERN.test(log.reasonCode) && log.reasonCode === identity.reasonCode && typeof log.reason === "string" && log.reason === log.reason.trim() && log.reason.length >= 2 && log.reason.length <= 500 && !DATA_AUDIT_FORBIDDEN_REASON_PATTERN.test(log.reason);
}
function auditApprovedData(input) {
  const missing = input.reviewCases.filter((reviewCase) => reviewCase.status === ReviewStatus.APPROVED).filter((reviewCase) => !input.reviewLogs.some((log) => isCompleteApprovalLog(reviewCase, log))).map((reviewCase) => typeof reviewCase.reviewCaseId === "string" && DATA_AUDIT_ID_PATTERN.test(reviewCase.reviewCaseId) ? reviewCase.reviewCaseId : REDACTED_REVIEW_CASE_ID);
  return Object.freeze({ ok: missing.length === 0, missingReviewLogCaseIds: Object.freeze(missing) });
}
function assertApprovedDataMayProject(reviewCase, reviewLogs) {
  const result = auditApprovedData({ reviewCases: [reviewCase], reviewLogs });
  if (!result.ok) {
    throw new Error("APPROVED data without a complete ReviewLog cannot be projected");
  }
}
function invalidationUpdatesEveryViewer(invalidation) {
  const verificationChanged = invalidation.kind === ProjectionInvalidationKind.VERIFICATION_CHANGED;
  return Object.freeze({
    publicTagDirty: verificationChanged,
    oldShareDirty: verificationChanged,
    friendViewDirty: verificationChanged
  });
}
var AI_AUTOMATION_DISABLED, REDACTED_TARGET_ID, REDACTED_AUDIT_ENTRY_ID, REDACTED_REQUEST_ID, IDEMPOTENCY_TTL_MS, IDEMPOTENCY_RECORD_FIELDS, SHA256_FINGERPRINT_PATTERN, DATA_AUDIT_ID_PATTERN, DATA_AUDIT_REQUEST_ID_PATTERN, DATA_AUDIT_FORBIDDEN_REASON_PATTERN, DATA_AUDIT_REASON_CODE_PATTERN, REDACTED_REVIEW_CASE_ID, REVIEW_LOG_FIELDS, REVIEW_LOG_STRING_FIELDS;
var init_service = __esm({
  "cloudfunctions/adminApi/service.ts"() {
    init_contracts();
    init_review_transitions();
    init_api();
    init_enums();
    init_auth();
    init_errors();
    init_idempotency();
    init_projections();
    init_validation();
    init_dto();
    init_model();
    init_time();
    init_policy();
    AI_AUTOMATION_DISABLED = true;
    REDACTED_TARGET_ID = "REDACTED_TARGET";
    REDACTED_AUDIT_ENTRY_ID = "audit_REDACTED";
    REDACTED_REQUEST_ID = "request_REDACTED";
    IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1e3;
    IDEMPOTENCY_RECORD_FIELDS = Object.freeze([
      "namespace",
      "requestFingerprint",
      "requestId",
      "status",
      "result",
      "expiresAt",
      "createdAt"
    ]);
    SHA256_FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;
    DATA_AUDIT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    DATA_AUDIT_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
    DATA_AUDIT_FORBIDDEN_REASON_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9]|[\u0000-\u001F\u007F])/i;
    DATA_AUDIT_REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,63}$/;
    REDACTED_REVIEW_CASE_ID = "review_case_REDACTED";
    REVIEW_LOG_FIELDS = Object.freeze([
      "auditEntryId",
      "actorUserId",
      "actorRole",
      "action",
      "targetType",
      "targetId",
      "requestId",
      "occurredAt",
      "result",
      "reasonCode",
      "reviewCaseId",
      "reviewedBy",
      "reviewedAt",
      "reviewScope",
      "reason",
      "beforeStatus",
      "afterStatus",
      "expectedVersion",
      "sourceSnapshotVersion",
      "version"
    ]);
    REVIEW_LOG_STRING_FIELDS = Object.freeze([
      "auditEntryId",
      "actorUserId",
      "actorRole",
      "action",
      "targetType",
      "targetId",
      "requestId",
      "occurredAt",
      "result",
      "reasonCode",
      "reviewCaseId",
      "reviewedBy",
      "reviewedAt",
      "reviewScope",
      "reason",
      "beforeStatus",
      "afterStatus"
    ]);
  }
});

// cloudfunctions/adminApi/validation.ts
var validation_exports = {};
__export(validation_exports, {
  isWriteAction: () => isWriteAction,
  validateAdminPayload: () => validateAdminPayload
});
function invalid(field, reason) {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The admin action payload is invalid.", {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason }
  });
}
function requireExactFields(action, payload) {
  const allowed = ALLOWED_FIELDS[action];
  const unexpected = Object.keys(payload).find((field) => !allowed.includes(field));
  if (unexpected !== void 0) invalid(unexpected, "UNEXPECTED_FIELD");
}
function requireContractVersion(payload) {
  if (payload.contractVersion !== void 0 && payload.contractVersion !== "1.0.0") {
    invalid("contractVersion", "UNSUPPORTED_CONTRACT_VERSION");
  }
}
function requireString2(payload, field, options = {}) {
  const value = payload[field];
  const min = options.min ?? 1;
  const max = options.max ?? 500;
  if (typeof value !== "string" || value.length < min || value.length > max || value !== value.trim() || CONTROL_CHARACTER_PATTERN2.test(value)) {
    invalid(field, `STRING_LENGTH_${min}_TO_${max}`);
  }
  const normalized = value;
  if (options.noMaterialLocator === true && MATERIAL_LOCATOR_PATTERN2.test(normalized)) {
    invalid(field, "RAW_MATERIAL_LOCATOR_FORBIDDEN");
  }
  return normalized;
}
function requireId(payload, field) {
  const value = requireString2(payload, field, { max: 128 });
  if (!ID_PATTERN.test(value)) invalid(field, "MALFORMED_STABLE_ID");
  return value;
}
function requireReasonCode(payload, field) {
  const value = requireString2(payload, field, { min: 2, max: 64, noMaterialLocator: true });
  if (!REASON_CODE_PATTERN.test(value)) invalid(field, "UPPERCASE_REASON_CODE_REQUIRED");
  return value;
}
function requireEnum2(payload, field, allowed) {
  const value = requireString2(payload, field, { max: 64 });
  if (!allowed.includes(value)) invalid(field, "UNSUPPORTED_VALUE");
  return value;
}
function requireLimit(payload) {
  if (!Number.isSafeInteger(payload.limit) || payload.limit < 1 || payload.limit > 50) {
    invalid("limit", "INTEGER_1_TO_50");
  }
}
function requireOptionalCursor(payload) {
  if (payload.cursor !== void 0 && (typeof payload.cursor !== "string" || !CURSOR_PATTERN2.test(payload.cursor))) {
    invalid("cursor", "MALFORMED_CURSOR");
  }
}
function requireUtc2(payload, field) {
  const value = payload[field];
  if (value !== void 0 && !isStrictUtcInstant(value)) invalid(field, "RFC3339_UTC_REQUIRED");
}
function requireWriteGuards(payload) {
  requireIdempotencyKey(payload.idempotencyKey);
  if (!Number.isSafeInteger(payload.expectedVersion) || payload.expectedVersion < 1) {
    invalid("expectedVersion", "POSITIVE_INTEGER_REQUIRED");
  }
}
function requireOptionalEnum(payload, field, allowed) {
  if (payload[field] !== void 0) requireEnum2(payload, field, allowed);
}
function validateAdminPayload(action, candidate) {
  if (!isPlainRecord(candidate)) invalid("payload", "OBJECT_REQUIRED");
  const payload = Object.freeze({ ...candidate });
  requireExactFields(action, payload);
  requireContractVersion(payload);
  if (WRITE_ACTIONS.has(action)) requireWriteGuards(payload);
  switch (action) {
    case "admin.bootstrap":
      requireEnum2(payload, "requestedScope", ["REVIEW", "OPERATIONS", "AUDIT"]);
      break;
    case "review.list":
      requireLimit(payload);
      requireOptionalCursor(payload);
      requireOptionalEnum(payload, "domain", ["SOCIAL", "EVENT", "CONTENT", "ORGANIZER", "REPORT"]);
      requireOptionalEnum(payload, "status", Object.values(ReviewStatus));
      break;
    case "review.get":
      requireId(payload, "reviewCaseId");
      break;
    case "review.approve":
      requireId(payload, "reviewCaseId");
      requireString2(payload, "decisionNote", { min: 2, max: 500, noMaterialLocator: true });
      break;
    case "review.reject":
      requireId(payload, "reviewCaseId");
      requireReasonCode(payload, "reasonCode");
      requireString2(payload, "decisionNote", { min: 2, max: 500, noMaterialLocator: true });
      break;
    case "review.requestChanges": {
      requireId(payload, "reviewCaseId");
      if (!Array.isArray(payload.requiredChanges) || payload.requiredChanges.length < 1 || payload.requiredChanges.length > 10 || !payload.requiredChanges.every((item) => typeof item === "string" && item.length >= 2 && item.length <= 200 && item === item.trim() && !CONTROL_CHARACTER_PATTERN2.test(item) && !MATERIAL_LOCATOR_PATTERN2.test(item))) invalid("requiredChanges", "ONE_TO_TEN_SAFE_TEXT_ITEMS_REQUIRED");
      break;
    }
    case "review.revoke":
      requireId(payload, "reviewCaseId");
      requireReasonCode(payload, "reasonCode");
      break;
    case "organizer.review":
      requireId(payload, "reviewCaseId");
      requireId(payload, "organizerId");
      requireEnum2(payload, "decision", ["APPROVE", "REJECT", "REQUEST_CHANGES"]);
      requireString2(payload, "note", { min: 2, max: 500, noMaterialLocator: true });
      break;
    case "event.review":
      requireId(payload, "reviewCaseId");
      requireId(payload, "eventId");
      requireEnum2(payload, "decision", ["APPROVE", "REJECT", "REQUEST_CHANGES", "PAUSE", "CANCEL"]);
      requireString2(payload, "note", { min: 2, max: 500, noMaterialLocator: true });
      break;
    case "content.review":
      requireId(payload, "reviewCaseId");
      requireId(payload, "contentId");
      requireEnum2(payload, "decision", ["APPROVE", "REJECT", "REQUEST_CHANGES", "UNPUBLISH"]);
      requireString2(payload, "note", { min: 2, max: 500, noMaterialLocator: true });
      break;
    case "report.list":
      requireLimit(payload);
      requireOptionalCursor(payload);
      requireOptionalEnum(payload, "status", ["OPEN", "RESOLVED", "DISMISSED"]);
      break;
    case "report.resolve":
      requireId(payload, "reportId");
      requireEnum2(payload, "resolution", ["ACTION_TAKEN", "DISMISSED"]);
      requireString2(payload, "note", { min: 2, max: 500, noMaterialLocator: true });
      break;
    case "audit.list":
      requireLimit(payload);
      requireOptionalCursor(payload);
      if (payload.action !== void 0) requireString2(payload, "action", { max: 100 });
      if (payload.targetId !== void 0) requireId(payload, "targetId");
      requireUtc2(payload, "occurredAfter");
      requireUtc2(payload, "occurredBefore");
      if (typeof payload.occurredAfter === "string" && typeof payload.occurredBefore === "string" && Date.parse(payload.occurredAfter) >= Date.parse(payload.occurredBefore)) {
        invalid("occurredAfter", "MUST_PRECEDE_OCCURRED_BEFORE");
      }
      break;
  }
  const detached = Object.fromEntries(Object.entries(payload).map(([field, value]) => [
    field,
    Array.isArray(value) ? Object.freeze([...value]) : value
  ]));
  return Object.freeze(detached);
}
function isWriteAction(action) {
  return WRITE_ACTIONS.has(action);
}
var ID_PATTERN, CURSOR_PATTERN2, MATERIAL_LOCATOR_PATTERN2, REASON_CODE_PATTERN, CONTROL_CHARACTER_PATTERN2, ALLOWED_FIELDS, WRITE_ACTIONS;
var init_validation2 = __esm({
  "cloudfunctions/adminApi/validation.ts"() {
    init_enums();
    init_api();
    init_errors();
    init_idempotency();
    init_validation();
    init_time();
    ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    CURSOR_PATTERN2 = /^[A-Za-z0-9._~:-]{1,512}$/;
    MATERIAL_LOCATOR_PATTERN2 = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9])/i;
    REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,63}$/;
    CONTROL_CHARACTER_PATTERN2 = /[\u0000-\u001F\u007F]/;
    ALLOWED_FIELDS = Object.freeze({
      "admin.bootstrap": ["contractVersion", "requestedScope"],
      "review.list": ["contractVersion", "cursor", "limit", "domain", "status"],
      "review.get": ["contractVersion", "reviewCaseId"],
      "review.approve": ["contractVersion", "reviewCaseId", "decisionNote", "idempotencyKey", "expectedVersion"],
      "review.reject": ["contractVersion", "reviewCaseId", "reasonCode", "decisionNote", "idempotencyKey", "expectedVersion"],
      "review.requestChanges": ["contractVersion", "reviewCaseId", "requiredChanges", "idempotencyKey", "expectedVersion"],
      "review.revoke": ["contractVersion", "reviewCaseId", "reasonCode", "idempotencyKey", "expectedVersion"],
      "organizer.review": ["contractVersion", "reviewCaseId", "organizerId", "decision", "note", "idempotencyKey", "expectedVersion"],
      "event.review": ["contractVersion", "reviewCaseId", "eventId", "decision", "note", "idempotencyKey", "expectedVersion"],
      "content.review": ["contractVersion", "reviewCaseId", "contentId", "decision", "note", "idempotencyKey", "expectedVersion"],
      "report.list": ["contractVersion", "cursor", "limit", "status"],
      "report.resolve": ["contractVersion", "reportId", "resolution", "note", "idempotencyKey", "expectedVersion"],
      "audit.list": ["contractVersion", "cursor", "limit", "action", "targetId", "occurredAfter", "occurredBefore"]
    });
    WRITE_ACTIONS = /* @__PURE__ */ new Set([
      "review.approve",
      "review.reject",
      "review.requestChanges",
      "review.revoke",
      "organizer.review",
      "event.review",
      "content.review",
      "report.resolve"
    ]);
  }
});

// cloudfunctions/adminApi/index.ts
var adminApi_exports = {};
__export(adminApi_exports, {
  ACTIONS: () => ACTIONS,
  ADMIN_RBAC_MATRIX: () => ADMIN_RBAC_MATRIX2,
  AI_AUTOMATION_DISABLED: () => AI_AUTOMATION_DISABLED2,
  AdminRole: () => AdminRole2,
  assertApprovedDataMayProject: () => assertApprovedDataMayProject2,
  auditActorRole: () => auditActorRole2,
  auditApprovedData: () => auditApprovedData2,
  availableQueues: () => availableQueues2,
  createAdminEndpoint: () => createAdminEndpoint,
  domainsForPrincipal: () => domainsForPrincipal2,
  endpoint: () => endpoint,
  executeAdminAction: () => executeAdminAction2,
  invalidationUpdatesEveryViewer: () => invalidationUpdatesEveryViewer2,
  main: () => main,
  redactAuditEntry: () => redactAuditEntry2,
  redactReportForList: () => redactReportForList2,
  redactReviewCaseForList: () => redactReviewCaseForList2,
  requireActionRole: () => requireActionRole2,
  requireActiveAllowlistedAdmin: () => requireActiveAllowlistedAdmin2,
  requireDomainAccess: () => requireDomainAccess2,
  requireRequestedScope: () => requireRequestedScope2,
  sessionRoles: () => sessionRoles2
});
module.exports = __toCommonJS(adminApi_exports);
init_errors();

// cloudfunctions/_shared/errors/envelope.ts
var import_node_crypto = require("node:crypto");
init_contracts();
init_validation();
init_errors();
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

// cloudfunctions/adminApi/index.ts
init_validation();
var AdminModel = (init_model(), __toCommonJS(model_exports));
var AdminPolicy = (init_policy(), __toCommonJS(policy_exports));
var AdminService = (init_service(), __toCommonJS(service_exports));
var AdminValidation = (init_validation2(), __toCommonJS(validation_exports));
var ACTIONS = [
  "admin.bootstrap",
  "review.list",
  "review.get",
  "review.approve",
  "review.reject",
  "review.requestChanges",
  "review.revoke",
  "organizer.review",
  "event.review",
  "content.review",
  "report.list",
  "report.resolve",
  "audit.list"
];
function responseRequestId2(event) {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId;
  return "srv_admin_invalid_request";
}
var fallbackEndpoint = createNotImplementedEndpoint("adminApi", ACTIONS);
function createAdminEndpoint(dependencies) {
  const main2 = async (event) => {
    const fallbackRequestId = responseRequestId2(event);
    try {
      const request = validateCallEnvelope(event, ACTIONS);
      const payload = AdminValidation.validateAdminPayload(request.action, request.payload);
      const data = await AdminService.executeAdminAction(
        dependencies,
        request.action,
        request.requestId,
        payload
      );
      return { ok: true, data, requestId: request.requestId };
    } catch (error) {
      return safeFailureFromError(
        fallbackRequestId,
        error instanceof Error ? error : new Error("Non-error thrown at adminApi boundary")
      );
    }
  };
  return Object.freeze({
    actions: ACTIONS,
    writeGuardPlans: fallbackEndpoint.writeGuardPlans,
    main: main2
  });
}
var endpoint = fallbackEndpoint;
var main = endpoint.main;
var AdminRole2 = AdminModel.AdminRole;
var ADMIN_RBAC_MATRIX2 = AdminPolicy.ADMIN_RBAC_MATRIX;
var AI_AUTOMATION_DISABLED2 = AdminService.AI_AUTOMATION_DISABLED;
var assertApprovedDataMayProject2 = AdminService.assertApprovedDataMayProject;
var auditActorRole2 = AdminPolicy.auditActorRole;
var auditApprovedData2 = AdminService.auditApprovedData;
var availableQueues2 = AdminPolicy.availableQueues;
var domainsForPrincipal2 = AdminPolicy.domainsForPrincipal;
var executeAdminAction2 = AdminService.executeAdminAction;
var invalidationUpdatesEveryViewer2 = AdminService.invalidationUpdatesEveryViewer;
var redactAuditEntry2 = AdminService.redactAuditEntry;
var redactReportForList2 = AdminService.redactReportForList;
var redactReviewCaseForList2 = AdminService.redactReviewCaseForList;
var requireActionRole2 = AdminPolicy.requireActionRole;
var requireActiveAllowlistedAdmin2 = AdminPolicy.requireActiveAllowlistedAdmin;
var requireDomainAccess2 = AdminPolicy.requireDomainAccess;
var requireRequestedScope2 = AdminPolicy.requireRequestedScope;
var sessionRoles2 = AdminPolicy.sessionRoles;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  ADMIN_RBAC_MATRIX,
  AI_AUTOMATION_DISABLED,
  AdminRole,
  assertApprovedDataMayProject,
  auditActorRole,
  auditApprovedData,
  availableQueues,
  createAdminEndpoint,
  domainsForPrincipal,
  endpoint,
  executeAdminAction,
  invalidationUpdatesEveryViewer,
  main,
  redactAuditEntry,
  redactReportForList,
  redactReviewCaseForList,
  requireActionRole,
  requireActiveAllowlistedAdmin,
  requireDomainAccess,
  requireRequestedScope,
  sessionRoles
});
