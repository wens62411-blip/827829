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

// miniprogram/shared/contracts/action-map.ts
var CLOUD_ACTIONS_BY_FUNCTION;
var init_action_map = __esm({
  "miniprogram/shared/contracts/action-map.ts"() {
    CLOUD_ACTIONS_BY_FUNCTION = {
      identityApi: [
        "identity.bootstrap",
        "profile.getMine",
        "profile.updateMine",
        "card.getMine",
        "card.getForViewer",
        "card.refreshProjection",
        "share.create",
        "share.resolve",
        "share.revoke",
        "share.createQrScene"
      ],
      socialApi: [
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
      ],
      eventApi: [
        "geo.listRegions",
        "geo.listCountries",
        "geo.listCities",
        "geo.getNode",
        "event.list",
        "event.get",
        "event.checkEligibility",
        "event.registerInterest",
        "event.cancelInterest",
        "event.getEnrollment",
        "organizer.getPublic",
        "payment.getCapability"
      ],
      contentApi: [
        "content.list",
        "content.get",
        "content.listCollections",
        "content.getCreator",
        "content.listRelatedEvents",
        "content.intent.create",
        "content.intent.cancel"
      ],
      adminApi: [
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
      ]
    };
  }
});

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
var RecordOrigin, VerificationState, ReviewStatus, FriendshipState, EventState, PublicationState, MediaRightsState;
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
var import_node_crypto;
var init_envelope = __esm({
  "cloudfunctions/_shared/errors/envelope.ts"() {
    import_node_crypto = require("node:crypto");
    init_contracts();
    init_validation();
    init_errors();
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
var OPENID_PATTERN;
var init_auth = __esm({
  "cloudfunctions/_shared/auth/index.ts"() {
    init_api();
    init_errors();
    OPENID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
  }
});

// cloudfunctions/_shared/audit/index.ts
function createAuditAppend(input) {
  return Object.freeze({ ...input });
}
var init_audit = __esm({
  "cloudfunctions/_shared/audit/index.ts"() {
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
var import_node_crypto2, IDEMPOTENCY_KEY_PATTERN;
var init_idempotency = __esm({
  "cloudfunctions/_shared/idempotency/index.ts"() {
    import_node_crypto2 = require("node:crypto");
    init_api();
    init_errors();
    IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
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
function assertProjectionReadable(state) {
  const invalidFields = [];
  if (typeof state.dirty !== "boolean") invalidFields.push({ field: "dirty", rule: "BOOLEAN" });
  if (typeof state.sourceAllowsRead !== "boolean") invalidFields.push({ field: "sourceAllowsRead", rule: "BOOLEAN" });
  if (!Number.isSafeInteger(state.projectedSourceVersion) || state.projectedSourceVersion < 1) {
    invalidFields.push({ field: "projectedSourceVersion", rule: "POSITIVE_SAFE_INTEGER" });
  }
  if (!Number.isSafeInteger(state.requiredSourceVersion) || state.requiredSourceVersion < 1) {
    invalidFields.push({ field: "requiredSourceVersion", rule: "POSITIVE_SAFE_INTEGER" });
  }
  if (invalidFields.length > 0) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "Projection read state is malformed.", {
      details: { code: ApiErrorCode.VALIDATION_FAILED, issues: invalidFields }
    });
  }
  if (state.dirty || state.projectedSourceVersion < state.requiredSourceVersion) {
    throw new SafeApiError(ApiErrorCode.PROJECTION_STALE, "The projection is stale and cannot grant access.", {
      details: {
        code: ApiErrorCode.PROJECTION_STALE,
        projectionType: state.projectionType,
        requiredSourceVersion: state.requiredSourceVersion
      }
    });
  }
  if (!state.sourceAllowsRead) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "The authoritative source denies this read.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "AUTHORITATIVE_SOURCE_DENY" }
    });
  }
}
var UTC_PATTERN, PROJECTION_FIELDS, RELATIONSHIP_REVOCATION_STATES, VERIFICATION_REVOCATION_STATES, EVENT_REVOCATION_STATES, CONTENT_REVOCATION_STATES, MEDIA_REVOCATION_STATES;
var init_projections = __esm({
  "cloudfunctions/_shared/projections/index.ts"() {
    init_api();
    init_enums();
    init_primitives();
    init_geography();
    init_errors();
    init_validation();
    UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
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

// cloudfunctions/contentApi/service.ts
var service_exports = {};
__export(service_exports, {
  createContentApiEndpoint: () => createContentApiEndpoint
});
function responseRequestId2(event) {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId;
  return `srv_${(0, import_node_crypto3.randomUUID)()}`;
}
function success(requestId, data) {
  return { ok: true, data, requestId };
}
function invalidRequest(field, reason) {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The request contains an invalid field.", {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason }
  });
}
function validationFailed(field, rule) {
  throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "The request failed validation.", {
    details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field, rule }] }
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
function conflict(conflictType) {
  throw new SafeApiError(ApiErrorCode.CONFLICT, "The request conflicts with the current resource state.", {
    details: { code: ApiErrorCode.CONFLICT, conflictType }
  });
}
function requireExactKeys(value, allowed) {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== void 0) invalidRequest(extra, "UNEXPECTED_FIELD");
}
function validateContractVersion(payload) {
  if (payload.contractVersion !== void 0 && payload.contractVersion !== "1.0.0") {
    invalidRequest("contractVersion", "UNSUPPORTED_CONTRACT_VERSION");
  }
}
function requireStableId(value, field) {
  if (typeof value !== "string" || !STABLE_ID_PATTERN.test(value)) invalidRequest(field, "MALFORMED_STABLE_ID");
  return value;
}
function requireOptionalCategory(value) {
  if (value === void 0) return void 0;
  if (typeof value !== "string" || !CATEGORY_VALUES.includes(value)) {
    invalidRequest("category", "UNSUPPORTED_CATEGORY");
  }
  return value;
}
function parsePageRequest(payload) {
  if (!Number.isSafeInteger(payload.limit) || payload.limit < 1 || payload.limit > MAX_PAGE_SIZE) {
    invalidRequest("limit", "LIMIT_OUT_OF_RANGE");
  }
  if (payload.cursor !== void 0 && (typeof payload.cursor !== "string" || payload.cursor.length < 1 || payload.cursor.length > MAX_CURSOR_LENGTH)) {
    invalidRequest("cursor", "MALFORMED_CURSOR");
  }
  return {
    limit: payload.limit,
    ...payload.cursor === void 0 ? {} : { cursor: payload.cursor }
  };
}
function requireCityId(value, field = "cityId") {
  if (typeof value !== "string" || !CITY_IDS.has(value)) invalidRequest(field, "UNKNOWN_FROZEN_CITY_ID");
  return value;
}
function readRecord(value, name) {
  if (!isPlainRecord(value)) throw new Error(`Invalid ${name} record`);
  return value;
}
function readString(record, field) {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Invalid ${field}`);
  return value;
}
function readOptionalString(record, field) {
  const value = record[field];
  if (value === void 0) return void 0;
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Invalid ${field}`);
  return value;
}
function readUtc(record, field) {
  const value = readString(record, field);
  if (!UTC_PATTERN2.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`Invalid ${field}`);
  return value;
}
function readVersion(record, field = "version") {
  const value = record[field];
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${field}`);
  return value;
}
function readStringArray(record, field) {
  const value = record[field];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim().length > 0)) {
    throw new Error(`Invalid ${field}`);
  }
  return Object.freeze([...value]);
}
function readHttpsUrl(record, field) {
  const raw = readString(record, field);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid ${field}`);
  }
  if (url.protocol !== HTTPS_PROTOCOL || url.username !== "" || url.password !== "") throw new Error(`Invalid ${field}`);
  return url.toString();
}
function readEnum(record, field, values) {
  const value = readString(record, field);
  if (!values.includes(value)) throw new Error(`Invalid ${field}`);
  return value;
}
function parseDetails(record, category) {
  const details = readRecord(record.details, "details");
  if (category === "ART") {
    requireExactInternalKeys(details, [
      "author",
      "workTitle",
      "year",
      "medium",
      "dimensions",
      "edition",
      "exhibitionHistory",
      "provenanceInformation",
      "imageRightsStatement"
    ], "art details");
    return Object.freeze({
      category,
      art: Object.freeze({
        author: readString(details, "author"),
        workTitle: readString(details, "workTitle"),
        year: readString(details, "year"),
        medium: readString(details, "medium"),
        dimensions: readString(details, "dimensions"),
        edition: readString(details, "edition"),
        exhibitionHistory: readString(details, "exhibitionHistory"),
        provenanceInformation: readString(details, "provenanceInformation"),
        imageRightsStatement: readString(details, "imageRightsStatement")
      })
    });
  }
  if (category === "ANTIQUE") {
    requireExactInternalKeys(details, [
      "dateRange",
      "objectType",
      "knownProvenance",
      "conditionStatement",
      "thirdPartyReportReferences",
      "platformAuthenticityStatement"
    ], "antique details");
    return Object.freeze({
      category,
      antique: Object.freeze({
        dateRange: readString(details, "dateRange"),
        objectType: readString(details, "objectType"),
        knownProvenance: readString(details, "knownProvenance"),
        conditionStatement: readString(details, "conditionStatement"),
        thirdPartyReportReferences: readStringArray(details, "thirdPartyReportReferences"),
        platformAuthenticityStatement: readString(details, "platformAuthenticityStatement")
      })
    });
  }
  requireExactInternalKeys(details, [
    "subtype",
    "materialStatement",
    "gemOrPearlInformation",
    "dimensions",
    "reportReferences",
    "displayAuthorization",
    "investmentDisclaimer"
  ], "jewelry details");
  const subtype = readEnum(details, "subtype", ["GEMSTONE", "PEARL", "METALWORK", "OTHER"]);
  return Object.freeze({
    category,
    jewelry: Object.freeze({
      subtype,
      materialStatement: readString(details, "materialStatement"),
      gemOrPearlInformation: readString(details, "gemOrPearlInformation"),
      dimensions: readString(details, "dimensions"),
      reportReferences: readStringArray(details, "reportReferences"),
      displayAuthorization: readString(details, "displayAuthorization"),
      investmentDisclaimer: readString(details, "investmentDisclaimer")
    })
  });
}
function requireExactInternalKeys(record, fields, name) {
  const actual = Object.keys(record).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((field, index) => field !== expected[index])) {
    throw new Error(`Invalid ${name} shape`);
  }
}
function isPublicCandidate(value) {
  return isPlainRecord(value) && value.publicationState === PublicationState.PUBLISHED && value.publicVisible === true;
}
function parsePublishedContent(value) {
  const record = readRecord(value, "art content");
  if (record.publicationState !== PublicationState.PUBLISHED || record.publicVisible !== true) {
    throw new Error("Only public PUBLISHED content may be projected");
  }
  const id = requireInternalStableId(record._id, "_id");
  const category = readEnum(record, "category", CATEGORY_VALUES);
  const recordOrigin = readEnum(record, "recordOrigin", Object.values(RecordOrigin));
  if (record.origin !== void 0 && record.origin !== recordOrigin) throw new Error("origin and recordOrigin differ");
  const rightsStatus = readEnum(record, "rightsStatus", Object.values(MediaRightsState));
  if (record.mediaRightsState !== rightsStatus) throw new Error("rightsStatus and mediaRightsState differ");
  const cityId = requireInternalCityId(record.cityId);
  const createdAt = readUtc(record, "createdAt");
  const updatedAt = readUtc(record, "updatedAt");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error("updatedAt precedes createdAt");
  const reviewedAt = readUtc(record, "reviewedAt");
  const collectionId = readOptionalString(record, "collectionId");
  const evidenceLabel = readOptionalString(record, "evidenceLabel");
  if (evidenceLabel !== void 0 && evidenceLabel !== "DEMO_ONLY") throw new Error("Invalid evidenceLabel");
  if (evidenceLabel === "DEMO_ONLY" && recordOrigin !== RecordOrigin.SYNTHETIC) {
    throw new Error("DEMO_ONLY content must be SYNTHETIC");
  }
  return Object.freeze({
    _id: id,
    ...collectionId === void 0 ? {} : { collectionId: requireInternalStableId(collectionId, "collectionId") },
    creatorId: requireInternalStableId(record.creatorId, "creatorId"),
    title: readString(record, "title"),
    summary: readString(record, "summary"),
    category,
    publicationState: PublicationState.PUBLISHED,
    publicVisible: true,
    recordOrigin,
    verificationState: readEnum(record, "verificationState", Object.values(VerificationState)),
    sourceTitle: readString(record, "sourceTitle"),
    sourceUrl: readHttpsUrl(record, "sourceUrl"),
    rightsStatus,
    rightsSummary: readString(record, "rightsSummary"),
    reviewedAt,
    cityId,
    alt: readString(record, "alt"),
    creatorDisplayName: readString(record, "creatorDisplayName"),
    ...evidenceLabel === void 0 ? {} : { evidenceLabel: "DEMO_ONLY" },
    relatedEventIds: record.relatedEventIds === void 0 ? Object.freeze([]) : readStringArray(record, "relatedEventIds"),
    ...record.media === void 0 ? {} : { media: record.media },
    details: parseDetails(record, category),
    version: readVersion(record),
    createdAt,
    updatedAt
  });
}
function requireInternalStableId(value, field) {
  if (typeof value !== "string" || !STABLE_ID_PATTERN.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}
function requireInternalCityId(value) {
  if (typeof value !== "string" || !CITY_IDS.has(value)) throw new Error("Invalid cityId");
  return value;
}
function publicImage(record, usage, now) {
  if (record.media === void 0 || record.rightsStatus !== MediaRightsState.APPROVED) return void 0;
  try {
    const media = readRecord(record.media, "media");
    if (media.publicState !== "PUBLIC") return void 0;
    const rights = readRecord(media.rights, "media rights");
    if (rights.state !== MediaRightsState.APPROVED) return void 0;
    const permitted = readStringArray(rights, "permittedUses");
    if (!permitted.every((item) => ["THUMBNAIL", "DETAIL", "SHARE"].includes(item)) || !permitted.includes(usage)) return void 0;
    const reviewedAt = readUtc(rights, "reviewedAt");
    if (Date.parse(reviewedAt) > Date.parse(now)) return void 0;
    const validFrom = readOptionalString(rights, "validFrom");
    const validUntil = readOptionalString(rights, "validUntil");
    if (validFrom !== void 0 && (!UTC_PATTERN2.test(validFrom) || Number.isNaN(Date.parse(validFrom)) || Date.parse(now) < Date.parse(validFrom))) return void 0;
    if (validUntil !== void 0 && (!UTC_PATTERN2.test(validUntil) || Number.isNaN(Date.parse(validUntil)) || Date.parse(now) >= Date.parse(validUntil))) return void 0;
    const sha256 = readString(media, "sha256");
    if (!SHA256_PATTERN.test(sha256)) return void 0;
    return Object.freeze({
      mediaAssetId: requireInternalStableId(media.assetId, "media.assetId"),
      url: readHttpsUrl(media, "publicUrl"),
      sourceUrl: readHttpsUrl(media, "sourceUrl"),
      license: readString(media, "license"),
      rightsHolder: readString(rights, "rightsHolderName"),
      sha256,
      permittedUses: permitted,
      alt: record.alt,
      rightsReviewedAt: reviewedAt
    });
  } catch {
    return void 0;
  }
}
function categoryAliases(details) {
  if (details.category === "ART") {
    return {
      artwork: {
        author: details.art.author,
        workTitle: details.art.workTitle,
        year: details.art.year,
        medium: details.art.medium,
        dimensions: details.art.dimensions,
        edition: details.art.edition,
        exhibitionHistory: details.art.exhibitionHistory,
        provenanceInformation: details.art.provenanceInformation
      }
    };
  }
  if (details.category === "ANTIQUE") {
    return {
      antique: {
        periodRange: details.antique.dateRange,
        objectType: details.antique.objectType,
        knownProvenance: details.antique.knownProvenance,
        conditionStatement: details.antique.conditionStatement,
        thirdPartyReportReference: details.antique.thirdPartyReportReferences.join("\uFF1B") || "\u672A\u63D0\u4F9B\u7B2C\u4E09\u65B9\u62A5\u544A\u5F15\u7528"
      }
    };
  }
  return {
    jewelry: {
      jewelryKind: details.jewelry.subtype,
      materialStatement: details.jewelry.materialStatement,
      gemstoneOrPearlInformation: details.jewelry.gemOrPearlInformation,
      dimensions: details.jewelry.dimensions,
      reportReference: details.jewelry.reportReferences.join("\uFF1B") || "\u672A\u63D0\u4F9B\u62A5\u544A\u5F15\u7528",
      displayAuthorization: details.jewelry.displayAuthorization
    }
  };
}
function projectContent(value, usage, now) {
  const record = parsePublishedContent(value);
  const image = publicImage(record, usage, now);
  const base = {
    contentId: record._id,
    ...record.collectionId === void 0 ? {} : { collectionId: record.collectionId },
    creatorId: record.creatorId,
    title: record.title,
    summary: record.summary,
    category: record.category,
    publicationState: record.publicationState,
    ...image === void 0 ? {} : { coverAssetId: image.mediaAssetId },
    mediaRightsState: record.rightsStatus,
    origin: record.recordOrigin,
    verificationState: record.verificationState,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    recordOrigin: record.recordOrigin,
    evidenceScope: record.evidenceLabel === "DEMO_ONLY" ? "DEMO_ONLY" : "PUBLIC",
    sourceTitle: record.sourceTitle,
    sourceUrl: record.sourceUrl,
    rightsStatus: record.rightsStatus,
    rightsSummary: record.rightsSummary,
    reviewedAt: record.reviewedAt,
    ...image === void 0 ? {} : { rightsReviewedAt: image.rightsReviewedAt },
    cityId: record.cityId,
    alt: record.alt,
    creatorDisplayName: record.creatorDisplayName,
    ...record.evidenceLabel === void 0 ? {} : { evidenceLabel: record.evidenceLabel },
    ...image === void 0 ? {} : { image },
    imageDisabled: image === void 0,
    ...image === void 0 ? { imageDisabledReason: record.media === void 0 ? "NO_MEDIA" : "RIGHTS_NOT_PUBLIC" } : {},
    details: record.details,
    ...categoryAliases(record.details)
  };
  return deepFreezeClone(base);
}
function tryProjectContent(value, usage, now) {
  try {
    return projectContent(value, usage, now);
  } catch {
    return void 0;
  }
}
function deepFreezeClone(value) {
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
function sortContent(items) {
  return [...items].sort((left, right) => {
    const byTime = right.updatedAt.localeCompare(left.updatedAt);
    return byTime === 0 ? left.contentId.localeCompare(right.contentId) : byTime;
  });
}
function encodeCursor(kind, filterHash, anchor) {
  const value = Buffer.from(JSON.stringify({ v: 1, kind, filterHash, ...anchor }), "utf8").toString("base64url");
  return value;
}
function decodeCursor(raw, kind, filterHash) {
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!isPlainRecord(decoded)) invalidCursor("MALFORMED");
    requireExactInternalKeys(decoded, ["v", "kind", "filterHash", "updatedAt", "id"], "cursor");
    if (decoded.v !== 1 || decoded.kind !== kind) invalidCursor("MALFORMED");
    if (decoded.filterHash !== filterHash) invalidCursor("FILTER_MISMATCH");
    if (typeof decoded.updatedAt !== "string" || !UTC_PATTERN2.test(decoded.updatedAt)) invalidCursor("MALFORMED");
    if (typeof decoded.id !== "string" || !STABLE_ID_PATTERN.test(decoded.id)) invalidCursor("MALFORMED");
    return { updatedAt: decoded.updatedAt, id: decoded.id };
  } catch (error) {
    if (error instanceof SafeApiError) throw error;
    invalidCursor("MALFORMED");
  }
}
function invalidCursor(reason) {
  throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, "The pagination cursor is invalid.", {
    details: { code: ApiErrorCode.INVALID_CURSOR, reason }
  });
}
function paginate(input) {
  let start = 0;
  if (input.page.cursor !== void 0) {
    const anchor = decodeCursor(input.page.cursor, input.cursorKind, input.filterHash);
    const index = input.items.findIndex((item) => item.updatedAt === anchor.updatedAt && input.idOf(item) === anchor.id);
    if (index < 0) invalidCursor("EXPIRED");
    start = index + 1;
  }
  const items = input.items.slice(start, start + input.page.limit);
  const hasMore = start + items.length < input.items.length;
  const last = items.length === 0 ? void 0 : items[items.length - 1];
  return Object.freeze({
    items: Object.freeze(items),
    ...hasMore && last !== void 0 ? { nextCursor: encodeCursor(input.cursorKind, input.filterHash, { updatedAt: last.updatedAt, id: input.idOf(last) }) } : {},
    hasMore
  });
}
function parseCreator(value) {
  const record = readRecord(value, "creator");
  const createdAt = readUtc(record, "createdAt");
  const updatedAt = readUtc(record, "updatedAt");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error("Creator updatedAt precedes createdAt");
  const recordOrigin = readEnum(record, "recordOrigin", Object.values(RecordOrigin));
  const evidenceScope = readEnum(record, "evidenceScope", ["PUBLIC", "DEMO_ONLY"]);
  if (evidenceScope === "DEMO_ONLY" && recordOrigin !== RecordOrigin.SYNTHETIC) {
    throw new Error("DEMO_ONLY creator must be SYNTHETIC");
  }
  return deepFreezeClone({
    creatorId: requireInternalStableId(record._id ?? record.creatorId, "creatorId"),
    displayName: readString(record, "displayName"),
    biography: readString(record, "biography"),
    verificationState: readEnum(record, "verificationState", Object.values(VerificationState)),
    creatorKind: readEnum(record, "creatorKind", ["ARTIST", "INSTITUTION", "MAKER"]),
    recordOrigin,
    evidenceScope,
    sourceTitle: readString(record, "sourceTitle"),
    sourceUrl: readHttpsUrl(record, "sourceUrl"),
    reviewedAt: readUtc(record, "reviewedAt"),
    cityId: requireInternalCityId(record.cityId),
    version: readVersion(record),
    createdAt,
    updatedAt
  });
}
function parseCollection(value) {
  const record = readRecord(value, "art collection");
  const title = readRecord(record.title, "collection title");
  requireExactInternalKeys(title, ["zh", "en"], "collection title");
  const rawCategories = readStringArray(record, "categories");
  if (!rawCategories.every((category) => CATEGORY_VALUES.includes(category))) {
    throw new Error("Invalid collection categories");
  }
  if (rawCategories.length === 0 || new Set(rawCategories).size !== rawCategories.length) {
    throw new Error("Collection categories must be non-empty and unique");
  }
  const recordOrigin = readEnum(record, "recordOrigin", Object.values(RecordOrigin));
  const evidenceScope = readEnum(record, "evidenceScope", ["PUBLIC", "DEMO_ONLY"]);
  if (evidenceScope === "DEMO_ONLY" && recordOrigin !== RecordOrigin.SYNTHETIC) {
    throw new Error("DEMO_ONLY collection must be SYNTHETIC");
  }
  const createdAt = readUtc(record, "createdAt");
  const updatedAt = readUtc(record, "updatedAt");
  return deepFreezeClone({
    collectionId: requireInternalStableId(record._id, "collectionId"),
    title: { zh: readString(title, "zh"), en: readString(title, "en") },
    summary: readString(record, "summary"),
    publicationState: PublicationState.PUBLISHED,
    categories: rawCategories,
    recordOrigin,
    evidenceScope,
    sourceTitle: readString(record, "sourceTitle"),
    sourceUrl: readHttpsUrl(record, "sourceUrl"),
    reviewedAt: readUtc(record, "reviewedAt"),
    version: readVersion(record),
    createdAt,
    updatedAt
  });
}
function tryParseCollection(value) {
  try {
    return parseCollection(value);
  } catch {
    return void 0;
  }
}
function isPublicCollection(value) {
  return isPlainRecord(value) && value.publicationState === PublicationState.PUBLISHED && value.publicVisible === true;
}
function parsePurpose(message) {
  if (typeof message !== "string" || message.length < 1 || message.length > MAX_MESSAGE_LENGTH) {
    validationFailed("message", "PURPOSE_PREFIX_AND_OPTIONAL_BODY_REQUIRED");
  }
  const match = /^\[PURPOSE:(VIEWING|COLLABORATION)\](?:\r?\n([\s\S]*))?$/.exec(message);
  if (match === null) validationFailed("message", "CONTROLLED_PURPOSE_PREFIX_MUST_BE_FIRST_LINE");
  const purpose = match[1];
  const body = match[2]?.trim();
  if (body !== void 0 && body.length > 500) validationFailed("message", "BODY_MAX_500_CHARS");
  return Object.freeze({
    purpose,
    ...body === void 0 || body.length === 0 ? {} : { message: body },
    raw: message
  });
}
function projectIntent(record) {
  return deepFreezeClone({
    intentId: record._id,
    contentId: record.contentId,
    userId: record.userId,
    state: record.state,
    purpose: record.purpose,
    ...record.message === void 0 ? {} : { message: record.message },
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}
function requirePrincipalUser(principal) {
  if (principal.userId === void 0) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "Authentication is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
  return principal.userId;
}
function actorRole(principal) {
  for (const role of ["ADMIN", "REVIEWER", "ORGANIZER", "MEMBER"]) {
    if (principal.roles.includes(role)) return role;
  }
  return "MEMBER";
}
function assertReplayOwner(response, userId) {
  if (response.intent.userId !== userId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "The resource is not owned by this account.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "OBJECT_OWNER_REQUIRED" }
    });
  }
}
function completedIdempotency(input) {
  return deepFreezeClone({
    ...input.claim,
    status: "COMPLETED",
    responseData: input.responseData
  });
}
function assertValidNow(value) {
  if (!UTC_PATTERN2.test(value) || Number.isNaN(Date.parse(value))) throw new Error("deps.now returned an invalid UTC instant");
  return value;
}
function idempotencyExpiry(now) {
  return new Date(Date.parse(now) + IDEMPOTENCY_TTL_MS).toISOString();
}
function auditEntry(input) {
  return createAuditAppend({
    auditEntryId: requireInternalStableId(input.dependencies.newId("audit-entry"), "auditEntryId"),
    actorUserId: requirePrincipalUser(input.principal),
    actorRole: actorRole(input.principal),
    action: input.action,
    targetType: "CONTENT_INTENT",
    targetId: input.targetId,
    requestId: input.requestId,
    occurredAt: input.occurredAt,
    result: "SUCCEEDED"
  });
}
async function listContent(dependencies, payload) {
  requireExactKeys(payload, ["contractVersion", "cursor", "limit", "category", "collectionId"]);
  validateContractVersion(payload);
  const pageRequest = parsePageRequest(payload);
  const category = requireOptionalCategory(payload.category);
  const collectionId = payload.collectionId === void 0 ? void 0 : requireStableId(payload.collectionId, "collectionId");
  const now = assertValidNow(dependencies.now());
  const raw = await dependencies.reads.listContentRecords();
  const projected = raw.filter(isPublicCandidate).map((record) => tryProjectContent(record, "THUMBNAIL", now)).filter((record) => record !== void 0).filter((record) => category === void 0 || record.category === category).filter((record) => collectionId === void 0 || record.collectionId === collectionId);
  const items = sortContent(projected);
  const filterHash = fingerprintPayload({
    action: "content.list",
    category: category ?? null,
    collectionId: collectionId ?? null,
    publicationState: PublicationState.PUBLISHED,
    publicVisible: true
  });
  return {
    page: paginate({
      items,
      idOf: (item) => item.contentId,
      page: pageRequest,
      cursorKind: "content",
      filterHash
    })
  };
}
async function getPublicContentRecord(dependencies, contentId, usage) {
  const raw = await dependencies.reads.getContentRecord(contentId);
  if (!isPublicCandidate(raw)) notFound("CONTENT", contentId);
  return projectContent(raw, usage, assertValidNow(dependencies.now()));
}
async function getContent(dependencies, payload) {
  requireExactKeys(payload, ["contractVersion", "contentId"]);
  validateContractVersion(payload);
  const contentId = requireStableId(payload.contentId, "contentId");
  const content = await getPublicContentRecord(dependencies, contentId, "DETAIL");
  const creatorRaw = await dependencies.reads.getCreatorRecord(content.creatorId);
  if (creatorRaw === null) notFound("CONTENT", contentId);
  const creator = parseCreator(creatorRaw);
  if (creator.creatorId !== content.creatorId) throw new Error("Creator projection does not match content creatorId");
  if (creator.displayName !== content.creatorDisplayName) {
    throw new Error("Creator displayName does not match content creatorDisplayName");
  }
  return { content, creator };
}
async function listCollections(dependencies, payload) {
  requireExactKeys(payload, ["contractVersion", "cursor", "limit", "category"]);
  validateContractVersion(payload);
  const pageRequest = parsePageRequest(payload);
  const category = requireOptionalCategory(payload.category);
  const publicItems = (await dependencies.reads.listContentRecords()).filter(isPublicCandidate).map((record) => tryProjectContent(record, "THUMBNAIL", assertValidNow(dependencies.now()))).filter((record) => record !== void 0);
  const publicCollectionIds = new Set(publicItems.filter((item) => category === void 0 || item.category === category).map((item) => item.collectionId).filter((id) => id !== void 0));
  const records = (await dependencies.reads.listCollectionRecords()).filter(isPublicCollection).map(tryParseCollection).filter((record) => record !== void 0).filter((record) => publicCollectionIds.has(record.collectionId)).filter((record) => category === void 0 || record.categories.includes(category)).sort((left, right) => {
    const byTime = right.updatedAt.localeCompare(left.updatedAt);
    return byTime === 0 ? left.collectionId.localeCompare(right.collectionId) : byTime;
  });
  const filterHash = fingerprintPayload({
    action: "content.listCollections",
    category: category ?? null,
    publicationState: PublicationState.PUBLISHED,
    publicVisible: true
  });
  return {
    page: paginate({
      items: records,
      idOf: (item) => item.collectionId,
      page: pageRequest,
      cursorKind: "collection",
      filterHash
    })
  };
}
async function getCreator(dependencies, payload) {
  requireExactKeys(payload, ["contractVersion", "creatorId"]);
  validateContractVersion(payload);
  const creatorId = requireStableId(payload.creatorId, "creatorId");
  const hasPublicContent = (await dependencies.reads.listContentRecords()).some((record) => {
    if (!isPublicCandidate(record) || record.creatorId !== creatorId) return false;
    try {
      return projectContent(record, "THUMBNAIL", assertValidNow(dependencies.now())).creatorId === creatorId;
    } catch {
      return false;
    }
  });
  if (!hasPublicContent) notFound("CREATOR", creatorId);
  const creatorRaw = await dependencies.reads.getCreatorRecord(creatorId);
  if (creatorRaw === null) notFound("CREATOR", creatorId);
  const creator = parseCreator(creatorRaw);
  if (creator.creatorId !== creatorId) throw new Error("Creator projection identifier mismatch");
  return { creator };
}
async function listRelatedEvents(dependencies, payload) {
  requireExactKeys(payload, ["contractVersion", "contentId", "cityId"]);
  validateContractVersion(payload);
  const contentId = requireStableId(payload.contentId, "contentId");
  const cityId = payload.cityId === void 0 ? void 0 : requireCityId(payload.cityId);
  const contentRaw = await dependencies.reads.getContentRecord(contentId);
  if (!isPublicCandidate(contentRaw)) notFound("CONTENT", contentId);
  const content = parsePublishedContent(contentRaw);
  const candidates = await dependencies.reads.getRelatedEventCandidates(content.relatedEventIds);
  const relatedIds = new Set(content.relatedEventIds);
  const emittedIds = /* @__PURE__ */ new Set();
  const events = [];
  let filteredUnavailableCount = 0;
  for (const candidate of candidates) {
    try {
      assertProjectionReadable(candidate.readState);
      const event = parseReadOnlyProjection("PublicEventProjection", candidate.projection);
      if (!relatedIds.has(event.eventId) || emittedIds.has(event.eventId)) {
        filteredUnavailableCount += 1;
        continue;
      }
      if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED) {
        filteredUnavailableCount += 1;
        continue;
      }
      if (cityId !== void 0 && event.cityId !== cityId) continue;
      events.push(event);
      emittedIds.add(event.eventId);
    } catch (error) {
      if (error instanceof SafeApiError && error.code === ApiErrorCode.PROJECTION_STALE) throw error;
      filteredUnavailableCount += 1;
    }
  }
  return { events: Object.freeze(events), filteredUnavailableCount };
}
function idempotencyPayload(value) {
  return value;
}
async function createIntent(dependencies, payload, requestId) {
  requireExactKeys(payload, ["contractVersion", "idempotencyKey", "expectedVersion", "contentId", "message"]);
  validateContractVersion(payload);
  if (payload.expectedVersion !== void 0 && (!Number.isSafeInteger(payload.expectedVersion) || payload.expectedVersion < 1)) {
    validationFailed("expectedVersion", "POSITIVE_INTEGER_WHEN_REACTIVATING");
  }
  const expectedVersion = payload.expectedVersion;
  const contentId = requireStableId(payload.contentId, "contentId");
  const purposeInput = parsePurpose(payload.message);
  const principal = await requireTrustedPrincipal(dependencies.getWxContext, dependencies.loadPrincipal);
  const userId = requirePrincipalUser(principal);
  const idempotencyKey = requireIdempotencyKey(payload.idempotencyKey);
  const now = assertValidNow(dependencies.now());
  const claim = createIdempotencyClaim({
    functionName: "contentApi",
    action: "content.intent.create",
    openId: principal.openId,
    key: idempotencyKey,
    payload: idempotencyPayload({
      contractVersion: payload.contractVersion === void 0 ? null : "1.0.0",
      contentId,
      message: purposeInput.raw,
      expectedVersion: expectedVersion ?? null
    }),
    requestId,
    expiresAt: idempotencyExpiry(now)
  });
  return dependencies.intents.runTransaction(async (transaction) => {
    const existingKey = await transaction.getIdempotency(claim.namespace);
    const disposition = assertIdempotencyCompatible(claim, existingKey);
    if (disposition === "REPLAY" && existingKey !== null) {
      assertReplayOwner(existingKey.responseData, userId);
      return existingKey.responseData;
    }
    if (disposition === "IN_PROGRESS") conflict("IDEMPOTENCY_IN_PROGRESS");
    const contentRaw = await transaction.getContentRecord(contentId);
    if (!isPublicCandidate(contentRaw)) notFound("CONTENT", contentId);
    parsePublishedContent(contentRaw);
    const existingIntent = await transaction.getIntentByUserContent(userId, contentId);
    if (existingIntent?.state === "ACTIVE") {
      if (expectedVersion !== void 0) requireExpectedVersion(expectedVersion, existingIntent.version);
      const responseData2 = deepFreezeClone({ intent: projectIntent(existingIntent) });
      await transaction.putIdempotency(completedIdempotency({ claim, responseData: responseData2 }));
      return responseData2;
    }
    let intent;
    if (existingIntent?.state === "CANCELLED") {
      if (expectedVersion === void 0) validationFailed("expectedVersion", "REQUIRED_TO_REACTIVATE_CANCELLED_INTENT");
      requireExpectedVersion(expectedVersion, existingIntent.version);
      const version = existingIntent.version + 1;
      const historyEntry = Object.freeze({
        state: "ACTIVE",
        purpose: purposeInput.purpose,
        ...purposeInput.message === void 0 ? {} : { message: purposeInput.message },
        version,
        recordedAt: now
      });
      intent = Object.freeze({
        _id: existingIntent._id,
        contentId: existingIntent.contentId,
        userId: existingIntent.userId,
        purpose: purposeInput.purpose,
        ...purposeInput.message === void 0 ? {} : { message: purposeInput.message },
        state: "ACTIVE",
        version,
        createdAt: existingIntent.createdAt,
        updatedAt: now,
        history: Object.freeze([...existingIntent.history, historyEntry])
      });
    } else {
      if (expectedVersion !== void 0) validationFailed("expectedVersion", "NOT_APPLICABLE_TO_NEW_INTENT");
      const version = 1;
      const historyEntry = Object.freeze({
        state: "ACTIVE",
        purpose: purposeInput.purpose,
        ...purposeInput.message === void 0 ? {} : { message: purposeInput.message },
        version,
        recordedAt: now
      });
      intent = Object.freeze({
        _id: requireInternalStableId(dependencies.newId("content-intent"), "intentId"),
        contentId,
        userId,
        purpose: purposeInput.purpose,
        ...purposeInput.message === void 0 ? {} : { message: purposeInput.message },
        state: "ACTIVE",
        history: Object.freeze([historyEntry]),
        version,
        createdAt: now,
        updatedAt: now
      });
    }
    const responseData = deepFreezeClone({ intent: projectIntent(intent) });
    await transaction.putIntent(intent);
    await transaction.appendAudit(auditEntry({
      dependencies,
      principal,
      action: "content.intent.create",
      targetId: intent._id,
      requestId,
      occurredAt: now
    }));
    await transaction.putIdempotency(completedIdempotency({ claim, responseData }));
    return responseData;
  });
}
async function cancelIntent(dependencies, payload, requestId) {
  requireExactKeys(payload, ["contractVersion", "idempotencyKey", "expectedVersion", "intentId"]);
  validateContractVersion(payload);
  const intentId = requireStableId(payload.intentId, "intentId");
  if (!Number.isSafeInteger(payload.expectedVersion) || payload.expectedVersion < 1) {
    validationFailed("expectedVersion", "POSITIVE_INTEGER_REQUIRED");
  }
  const expectedVersion = payload.expectedVersion;
  const principal = await requireTrustedPrincipal(dependencies.getWxContext, dependencies.loadPrincipal);
  const userId = requirePrincipalUser(principal);
  const idempotencyKey = requireIdempotencyKey(payload.idempotencyKey);
  const now = assertValidNow(dependencies.now());
  const claim = createIdempotencyClaim({
    functionName: "contentApi",
    action: "content.intent.cancel",
    openId: principal.openId,
    key: idempotencyKey,
    payload: idempotencyPayload({
      contractVersion: payload.contractVersion === void 0 ? null : "1.0.0",
      intentId,
      expectedVersion
    }),
    requestId,
    expiresAt: idempotencyExpiry(now)
  });
  return dependencies.intents.runTransaction(async (transaction) => {
    const existingKey = await transaction.getIdempotency(claim.namespace);
    const disposition = assertIdempotencyCompatible(claim, existingKey);
    if (disposition === "REPLAY" && existingKey !== null) {
      assertReplayOwner(existingKey.responseData, userId);
      return existingKey.responseData;
    }
    if (disposition === "IN_PROGRESS") conflict("IDEMPOTENCY_IN_PROGRESS");
    const current = await transaction.getIntentById(intentId);
    if (current === null) notFound("CONTENT_INTENT", intentId);
    if (current.userId !== userId) {
      throw new SafeApiError(ApiErrorCode.FORBIDDEN, "The resource is not owned by this account.", {
        details: { code: ApiErrorCode.FORBIDDEN, policy: "OBJECT_OWNER_REQUIRED" }
      });
    }
    if (current.state !== "ACTIVE") conflict("INTENT_NOT_ACTIVE");
    requireExpectedVersion(expectedVersion, current.version);
    const cancelled = Object.freeze({
      ...current,
      state: "CANCELLED",
      version: current.version + 1,
      updatedAt: now,
      history: Object.freeze([
        ...current.history,
        Object.freeze({
          state: "CANCELLED",
          purpose: current.purpose,
          ...current.message === void 0 ? {} : { message: current.message },
          version: current.version + 1,
          recordedAt: now
        })
      ])
    });
    const responseData = deepFreezeClone({ intent: projectIntent(cancelled) });
    await transaction.putIntent(cancelled);
    await transaction.appendAudit(auditEntry({
      dependencies,
      principal,
      action: "content.intent.cancel",
      targetId: intentId,
      requestId,
      occurredAt: now
    }));
    await transaction.putIdempotency(completedIdempotency({ claim, responseData }));
    return responseData;
  });
}
async function dispatch(dependencies, action, payload, requestId) {
  switch (action) {
    case "content.list":
      return listContent(dependencies, payload);
    case "content.get":
      return getContent(dependencies, payload);
    case "content.listCollections":
      return listCollections(dependencies, payload);
    case "content.getCreator":
      return getCreator(dependencies, payload);
    case "content.listRelatedEvents":
      return listRelatedEvents(dependencies, payload);
    case "content.intent.create":
      return createIntent(dependencies, payload, requestId);
    case "content.intent.cancel":
      return cancelIntent(dependencies, payload, requestId);
  }
}
function createContentApiEndpoint(dependencies) {
  if (typeof dependencies?.getWxContext !== "function" || typeof dependencies.loadPrincipal !== "function" || typeof dependencies.now !== "function" || typeof dependencies.newId !== "function" || typeof dependencies.reads?.listContentRecords !== "function" || typeof dependencies.intents?.runTransaction !== "function") {
    throw new Error("ContentApiDependencies are incomplete");
  }
  const main2 = async (event) => {
    const fallbackRequestId = responseRequestId2(event);
    try {
      const request = validateCallEnvelope(event, ACTIONS);
      const data = await dispatch(dependencies, request.action, request.payload, request.requestId);
      return success(request.requestId, data);
    } catch (error) {
      return safeFailureFromError(
        fallbackRequestId,
        error instanceof Error ? error : new Error("Non-error thrown at contentApi boundary")
      );
    }
  };
  return Object.freeze({
    actions: ACTIONS,
    writeGuardPlans: CONTRACT_ENDPOINT.writeGuardPlans,
    main: main2
  });
}
var import_node_crypto3, ACTIONS, CONTRACT_ENDPOINT, CITY_IDS, CATEGORY_VALUES, STABLE_ID_PATTERN, UTC_PATTERN2, SHA256_PATTERN, HTTPS_PROTOCOL, MAX_PAGE_SIZE, MAX_CURSOR_LENGTH, MAX_MESSAGE_LENGTH, IDEMPOTENCY_TTL_MS;
var init_service = __esm({
  "cloudfunctions/contentApi/service.ts"() {
    import_node_crypto3 = require("node:crypto");
    init_geography();
    init_contracts();
    init_enums();
    init_api();
    init_auth();
    init_audit();
    init_errors();
    init_envelope();
    init_idempotency();
    init_projections();
    init_validation();
    ACTIONS = CLOUD_ACTIONS_BY_FUNCTION.contentApi;
    CONTRACT_ENDPOINT = createNotImplementedEndpoint("contentApi", ACTIONS);
    CITY_IDS = new Set(CITY_DIRECTORY.map((city) => city.id));
    CATEGORY_VALUES = Object.freeze(["ART", "ANTIQUE", "JEWELRY"]);
    STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    UTC_PATTERN2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    SHA256_PATTERN = /^[a-f0-9]{64}$/;
    HTTPS_PROTOCOL = "https:";
    MAX_PAGE_SIZE = 20;
    MAX_CURSOR_LENGTH = 1024;
    MAX_MESSAGE_LENGTH = 600;
    IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1e3;
  }
});

// cloudfunctions/contentApi/index.ts
var contentApi_exports = {};
__export(contentApi_exports, {
  ACTIONS: () => ACTIONS2,
  createContentApiEndpoint: () => createContentApiEndpoint2,
  endpoint: () => endpoint,
  main: () => main
});
module.exports = __toCommonJS(contentApi_exports);
init_contracts();
init_envelope();
var ContentRuntime = (init_service(), __toCommonJS(service_exports));
var ACTIONS2 = CLOUD_ACTIONS_BY_FUNCTION.contentApi;
var endpoint = createNotImplementedEndpoint("contentApi", ACTIONS2);
var main = endpoint.main;
var createContentApiEndpoint2 = ContentRuntime.createContentApiEndpoint;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  createContentApiEndpoint,
  endpoint,
  main
});
