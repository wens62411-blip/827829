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

// cloudfunctions/eventApi/index.ts
var eventApi_exports = {};
__export(eventApi_exports, {
  ACTIONS: () => ACTIONS,
  DEFAULT_CITY_OVERLAYS: () => DEFAULT_CITY_OVERLAYS,
  DEFAULT_PAYMENT_CONFIGURATION: () => DEFAULT_PAYMENT_CONFIGURATION,
  EVENT_INTEREST_TERMS_VERSION: () => EVENT_INTEREST_TERMS_VERSION,
  assertEventApiSeed: () => assertEventApiSeed,
  assertFrozenCityOverlays: () => assertFrozenCityOverlays,
  createEventApi: () => createEventApi,
  createInMemoryEventApiStore: () => createInMemoryEventApiStore,
  endpoint: () => endpoint,
  main: () => main
});
module.exports = __toCommonJS(eventApi_exports);

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
var OperationalState = {
  PLANNED: "PLANNED",
  RECRUITING_HOST: "RECRUITING_HOST",
  PILOT: "PILOT",
  LIVE: "LIVE",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED"
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
var EnrollmentState = {
  INTERESTED: "INTERESTED",
  WAITLISTED: "WAITLISTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  ATTENDED: "ATTENDED",
  NO_SHOW: "NO_SHOW"
};
var PaymentState = {
  DISABLED: "DISABLED",
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED"
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

// cloudfunctions/_shared/projections/index.ts
var UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
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

// cloudfunctions/eventApi/index.ts
var ACTIONS = [
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
];
var EVENT_INTEREST_TERMS_VERSION = "event-interest-terms-v1";
var UTC_PATTERN2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
var STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
var ACTIVE_ENROLLMENTS = /* @__PURE__ */ new Set([
  EnrollmentState.INTERESTED,
  EnrollmentState.WAITLISTED,
  EnrollmentState.CONFIRMED
]);
var OPERATING_STATES = /* @__PURE__ */ new Set([OperationalState.PILOT, OperationalState.LIVE]);
var CITY_STATES = new Set(Object.values(OperationalState));
var CITY_BY_ID = new Map(CITY_DIRECTORY.map((city) => [city.id, city]));
var COUNTRY_BY_ID = new Map(COUNTRY_DIRECTORY.map((country) => [country.id, country]));
var REGION_BY_ID = new Map(REGION_DIRECTORY.map((region) => [region.id, region]));
var SEED_TIME = "2026-08-27T00:00:00Z";
var DEFAULT_CITY_OVERLAYS = Object.freeze(
  CITY_DIRECTORY.map((city) => Object.freeze({
    _id: city.id,
    operationalState: OperationalState.PLANNED,
    version: 1,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  }))
);
var DEFAULT_PAYMENT_CONFIGURATION = Object.freeze({
  featureFlag: "DISABLED",
  subjectQualified: false,
  categoryApproved: false,
  filingComplete: false,
  merchantIdConfigured: false,
  certificateConfigured: false,
  callbackVerified: false,
  reconciliationReady: false,
  refundSlaApproved: false
});
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function isUtc(value) {
  return typeof value === "string" && UTC_PATTERN2.test(value) && !Number.isNaN(Date.parse(value));
}
function isStableId(value) {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}
function isHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
function exactKeys(record, expected) {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
function assertFrozenCityOverlays(value) {
  if (!Array.isArray(value) || value.length !== CITY_DIRECTORY.length) {
    throw new Error("cities seed must contain exactly the frozen 13 operational overlays");
  }
  const expectedIds = CITY_DIRECTORY.map((city) => city.id);
  const actualIds = [];
  for (const entry of value) {
    if (!isPlainRecord(entry) || !exactKeys(entry, ["_id", "operationalState", "version", "createdAt", "updatedAt"])) {
      throw new Error("cities seed may contain operational overlay fields only");
    }
    if (typeof entry._id !== "string") throw new Error("cities seed contains an invalid city id");
    actualIds.push(entry._id);
    if (!CITY_STATES.has(String(entry.operationalState)) || !Number.isSafeInteger(entry.version) || Number(entry.version) < 1 || !isUtc(entry.createdAt) || !isUtc(entry.updatedAt)) {
      throw new Error(`cities seed contains invalid data for ${entry._id}`);
    }
  }
  if (new Set(actualIds).size !== actualIds.length || actualIds.some((id, index) => id !== expectedIds[index])) {
    throw new Error("cities seed ids must match frozen directory order without drift");
  }
}
function assertVersioned(record) {
  if (!Number.isSafeInteger(record.version) || record.version < 1 || !isUtc(record.createdAt) || !isUtc(record.updatedAt)) {
    throw new Error("record has an invalid version or timestamp");
  }
}
function assertUniqueIds(label, records) {
  if (new Set(records.map((record) => record._id)).size !== records.length) {
    throw new Error(`${label} seed contains duplicate ids`);
  }
}
function assertEventApiSeed(seed) {
  assertFrozenCityOverlays(seed.cityOverlays);
  const nodes = seed.clubNodes ?? [];
  const organizers = seed.organizers ?? [];
  const events = seed.events ?? [];
  const claims = seed.claims ?? [];
  assertUniqueIds("club_nodes", nodes);
  assertUniqueIds("organizers", organizers);
  assertUniqueIds("events", events);
  if (new Set(claims.map((claim) => claim.claimId)).size !== claims.length) {
    throw new Error("verification claim seed contains duplicate ids");
  }
  for (const claim of claims) parseReadOnlyProjection("PublicVerificationClaimProjection", claim);
  if (new Set(seed.dirtyVerificationUserIds ?? []).size !== (seed.dirtyVerificationUserIds ?? []).length || (seed.dirtyVerificationUserIds ?? []).some((userId) => !isStableId(userId))) {
    throw new Error("dirty verification user seed contains invalid ids");
  }
  const nodeMap = new Map(nodes.map((node) => [node._id, node]));
  const organizerMap = new Map(organizers.map((organizer) => [organizer._id, organizer]));
  const overlayMap = new Map(seed.cityOverlays.map((overlay) => [overlay._id, overlay]));
  if (new Set(nodes.map((node) => node.cityId)).size !== nodes.length) {
    throw new Error("club_nodes seed must contain at most one AB Club node per frozen city");
  }
  for (const node of nodes) {
    if (!isStableId(node._id) || !CITY_BY_ID.has(node.cityId)) {
      throw new Error(`club node ${node._id} contains directory drift`);
    }
    const overlay = overlayMap.get(node.cityId);
    const organizer = node.organizerId === void 0 ? void 0 : organizerMap.get(node.organizerId);
    if (overlay === void 0 || overlay.operationalState !== node.operationalState || node.organizerId !== void 0 && (organizer === void 0 || !organizer.cityIds.includes(node.cityId))) {
      throw new Error(`club node ${node._id} has inconsistent city operations or organizer scope`);
    }
    assertVersioned(node);
  }
  for (const organizer of organizers) {
    if (!isStableId(organizer._id) || !isStableId(organizer.ownerUserId) || organizer.name.zh.trim().length === 0 || organizer.name.en.trim().length === 0 || organizer.summary.trim().length === 0 || organizer.cityIds.length === 0 || new Set(organizer.cityIds).size !== organizer.cityIds.length || organizer.cityIds.some((cityId) => !CITY_BY_ID.has(cityId))) {
      throw new Error(`organizer ${organizer._id} contains directory drift`);
    }
    assertVersioned(organizer);
  }
  for (const event of events) {
    const city = CITY_BY_ID.get(event.cityId);
    const node = nodeMap.get(event.clubNodeId);
    if (city === void 0 || node === void 0 || node.cityId !== event.cityId || !organizerMap.has(event.organizerId) || node.organizerId !== event.organizerId) {
      throw new Error(`event ${event._id} violates frozen hierarchy`);
    }
    if (!isStableId(event._id) || !isStableId(event.organizerId) || !isStableId(event.clubNodeId) || event.title.trim().length === 0 || event.summary.trim().length === 0 || event.addressScope.trim().length === 0 || event.source.label.trim().length === 0 || !isUtc(event.source.retrievedAt) || !isUtc(event.startsAt) || !isUtc(event.endsAt) || Date.parse(event.endsAt) <= Date.parse(event.startsAt) || event.timezone !== city.timezone || !Number.isSafeInteger(event.capacity) || event.capacity < 1 || !event.requiredLabelIds.every(isStableId) || event.termsVersion.trim().length === 0 || !["INTEREST", "OFFICIAL_URL", "WECHAT_PAYMENT"].includes(event.registrationMethod) || typeof event.minParticipantsEnabled !== "boolean" || typeof event.requiresPayment !== "boolean" || typeof event.reservationAvailable !== "boolean" || event.imageRights.alt.trim().length === 0 || !["OFFICIAL_ORGANIZER", "AUTHORIZED_PARTNER", "INTERNAL_DEMO"].includes(event.source.kind) || !["VERIFIED", "CONTENT_LIVE_UNVERIFIED", "DEMO_ONLY"].includes(event.source.contentStatus) || !Object.values(EventState).includes(event.state) || !Object.values(PublicationState).includes(event.publicationState) || !Object.values(RecordOrigin).includes(event.origin) || !Object.values(VerificationState).includes(event.verificationState) || !Object.values(MediaRightsState).includes(event.imageRights.state)) {
      throw new Error(`event ${event._id} is missing required fields`);
    }
    if (event.registrationMethod === "INTEREST" && event.termsVersion !== EVENT_INTEREST_TERMS_VERSION) {
      throw new Error(`event ${event._id} uses an unsupported interest terms version`);
    }
    if (event.requiresPayment !== (event.registrationMethod === "WECHAT_PAYMENT")) {
      throw new Error(`event ${event._id} has inconsistent payment registration fields`);
    }
    if (event.registrationMethod === "OFFICIAL_URL" && !isHttpsUrl(event.officialRegistrationUrl)) {
      throw new Error(`event ${event._id} requires an official registration URL`);
    }
    if (event.registrationMethod !== "OFFICIAL_URL" && event.officialRegistrationUrl !== void 0) {
      throw new Error(`event ${event._id} has an unexpected official registration URL`);
    }
    if (event.minParticipantsEnabled) {
      if (!Number.isSafeInteger(event.minParticipants) || Number(event.minParticipants) < 1 || Number(event.minParticipants) > event.capacity) {
        throw new Error(`event ${event._id} has invalid minParticipants`);
      }
    } else if (event.minParticipants !== void 0) {
      throw new Error(`event ${event._id} must omit minParticipants while disabled`);
    }
    if (event.coverAssetId !== void 0) {
      if (event.imageRights.state !== MediaRightsState.APPROVED || !isHttpsUrl(event.imageRights.sourcePageUrl) || !event.imageRights.author || !event.imageRights.license || !isUtc(event.imageRights.downloadedAt) || typeof event.imageRights.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(event.imageRights.sha256) || !Number.isSafeInteger(event.imageRights.width) || Number(event.imageRights.width) < 1 || !Number.isSafeInteger(event.imageRights.height) || Number(event.imageRights.height) < 1) {
        throw new Error(`event ${event._id} cannot use an image without complete approved rights evidence`);
      }
    }
    if (event.state === EventState.PUBLISHED || event.publicationState === PublicationState.PUBLISHED) {
      const organizer = organizerMap.get(event.organizerId);
      const overlay = overlayMap.get(event.cityId);
      if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED || event.origin !== RecordOrigin.REAL || event.verificationState !== VerificationState.HUMAN_REVIEWED || event.source.contentStatus !== "VERIFIED" || !isHttpsUrl(event.source.sourcePageUrl) || organizer === void 0 || organizer.reviewStatus !== ReviewStatus.APPROVED || organizer.verificationState !== VerificationState.HUMAN_REVIEWED || !organizer.cityIds.includes(event.cityId) || node.reviewStatus !== ReviewStatus.APPROVED || !OPERATING_STATES.has(node.operationalState) || overlay === void 0 || !OPERATING_STATES.has(overlay.operationalState) || overlay.operationalState !== node.operationalState) {
        throw new Error(`event ${event._id} cannot be published without complete human approval and source evidence`);
      }
    } else if (event.reservationAvailable) {
      throw new Error(`event ${event._id} cannot accept reservations before publication`);
    }
    assertVersioned(event);
  }
}
var InMemoryEventApiStore = class {
  cityOverlays;
  nodes;
  organizers;
  events;
  principals;
  claims;
  dirtyVerificationUserIds;
  enrollments;
  idempotency = /* @__PURE__ */ new Map();
  audits = [];
  blocked;
  payment;
  transactionTail = Promise.resolve();
  constructor(seed) {
    assertEventApiSeed(seed);
    this.cityOverlays = new Map(seed.cityOverlays.map((record) => [record._id, clone(record)]));
    this.nodes = new Map((seed.clubNodes ?? []).map((record) => [record._id, clone(record)]));
    this.organizers = new Map((seed.organizers ?? []).map((record) => [record._id, clone(record)]));
    this.events = new Map((seed.events ?? []).map((record) => [record._id, clone(record)]));
    this.principals = new Map((seed.principals ?? []).map((record) => [record.openId, clone(record)]));
    this.claims = clone(seed.claims ?? []);
    this.dirtyVerificationUserIds = new Set(seed.dirtyVerificationUserIds ?? []);
    this.enrollments = new Map((seed.enrollments ?? []).map((record) => [this.key(record.eventId, record.userId), clone(record)]));
    this.blocked = new Set((seed.blockedEventUsers ?? []).map((entry) => `${entry.eventId}:${entry.userId}`));
    this.payment = clone(seed.payment ?? DEFAULT_PAYMENT_CONFIGURATION);
  }
  key(eventId, userId) {
    return `${eventId}:${userId}`;
  }
  async listCityOverlays() {
    return clone([...this.cityOverlays.values()]);
  }
  async getCityOverlay(cityId) {
    const value = this.cityOverlays.get(cityId);
    return value === void 0 ? void 0 : clone(value);
  }
  async getNodeByCity(cityId) {
    const value = [...this.nodes.values()].find((record) => record.cityId === cityId);
    return value === void 0 ? void 0 : clone(value);
  }
  async getNode(nodeId) {
    const value = this.nodes.get(nodeId);
    return value === void 0 ? void 0 : clone(value);
  }
  async getOrganizer(organizerId) {
    const value = this.organizers.get(organizerId);
    return value === void 0 ? void 0 : clone(value);
  }
  async listEvents() {
    return clone([...this.events.values()]);
  }
  async getEvent(eventId) {
    const value = this.events.get(eventId);
    return value === void 0 ? void 0 : clone(value);
  }
  async loadPrincipal(openId) {
    const value = this.principals.get(openId);
    return value === void 0 ? null : clone(value);
  }
  async listClaims(userId) {
    return clone(this.claims.filter((claim) => claim.subjectUserId === userId));
  }
  async hasDirtyVerificationProjection(userId) {
    return this.dirtyVerificationUserIds.has(userId);
  }
  async getEnrollment(eventId, userId) {
    const value = this.enrollments.get(this.key(eventId, userId));
    return value === void 0 ? void 0 : clone(value);
  }
  async countActiveEnrollments(eventId) {
    return [...this.enrollments.values()].filter((record) => record.eventId === eventId && ACTIVE_ENROLLMENTS.has(record.state)).length;
  }
  async isBlocked(eventId, userId) {
    return this.blocked.has(`${eventId}:${userId}`);
  }
  async getPaymentConfiguration() {
    return clone(this.payment);
  }
  async runTransaction(operation) {
    let unlock;
    const ticket = new Promise((resolve) => {
      unlock = resolve;
    });
    const previous = this.transactionTail;
    this.transactionTail = previous.then(() => ticket);
    await previous;
    const enrollments = new Map([...this.enrollments.entries()].map(([key, value]) => [key, clone(value)]));
    const idempotency = new Map([...this.idempotency.entries()].map(([key, value]) => [key, clone(value)]));
    const audits = clone(this.audits);
    const base = this;
    const transaction = {
      listCityOverlays: () => base.listCityOverlays(),
      getCityOverlay: (cityId) => base.getCityOverlay(cityId),
      getNodeByCity: (cityId) => base.getNodeByCity(cityId),
      getNode: (nodeId) => base.getNode(nodeId),
      getOrganizer: (organizerId) => base.getOrganizer(organizerId),
      listEvents: () => base.listEvents(),
      getEvent: (eventId) => base.getEvent(eventId),
      loadPrincipal: (openId) => base.loadPrincipal(openId),
      listClaims: (userId) => base.listClaims(userId),
      hasDirtyVerificationProjection: (userId) => base.hasDirtyVerificationProjection(userId),
      getEnrollment: async (eventId, userId) => {
        const value = enrollments.get(base.key(eventId, userId));
        return value === void 0 ? void 0 : clone(value);
      },
      countActiveEnrollments: async (eventId) => [...enrollments.values()].filter((record) => record.eventId === eventId && ACTIVE_ENROLLMENTS.has(record.state)).length,
      isBlocked: (eventId, userId) => base.isBlocked(eventId, userId),
      getPaymentConfiguration: () => base.getPaymentConfiguration(),
      getIdempotency: async (namespace) => {
        const value = idempotency.get(namespace);
        return value === void 0 ? null : clone(value);
      },
      saveIdempotency: async (record) => {
        idempotency.set(record.namespace, clone(record));
      },
      saveEnrollment: async (record) => {
        enrollments.set(base.key(record.eventId, record.userId), clone(record));
      },
      appendAudit: async (record) => {
        audits.push(clone(record));
      }
    };
    try {
      const result = await operation(transaction);
      this.enrollments = enrollments;
      this.idempotency = idempotency;
      this.audits = audits;
      return clone(result);
    } finally {
      if (unlock !== void 0) unlock();
    }
  }
  snapshot() {
    return clone({ enrollments: [...this.enrollments.values()], audits: this.audits });
  }
};
function createInMemoryEventApiStore(seed) {
  return new InMemoryEventApiStore(seed);
}
function invalid(field, reason) {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, "The request payload is invalid.", {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason }
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
function assertPayload(payload, allowed, required = []) {
  const allowedKeys = /* @__PURE__ */ new Set(["contractVersion", ...allowed]);
  const extra = Object.keys(payload).find((key) => !allowedKeys.has(key));
  if (extra !== void 0) invalid(extra, "UNEXPECTED_FIELD");
  const missing = required.find((key) => !(key in payload));
  if (missing !== void 0) invalid(missing, "REQUIRED");
  if (payload.contractVersion !== void 0 && payload.contractVersion !== "1.0.0") {
    invalid("contractVersion", "CONTRACT_VERSION_MISMATCH");
  }
}
function requireString2(payload, field) {
  const value = payload[field];
  if (typeof value !== "string" || value.trim().length === 0) invalid(field, "NON_EMPTY_STRING_REQUIRED");
  return value;
}
function requireStableId(payload, field) {
  const value = requireString2(payload, field);
  if (!isStableId(value)) invalid(field, "MALFORMED_STABLE_ID");
  return value;
}
function requireCityId(value, field = "cityId") {
  if (typeof value !== "string" || !CITY_BY_ID.has(value)) invalid(field, "FROZEN_CITY_ID_REQUIRED");
  return value;
}
function requireCountryId(value) {
  if (typeof value !== "string" || !COUNTRY_BY_ID.has(value)) invalid("countryId", "FROZEN_COUNTRY_ID_REQUIRED");
  return value;
}
function requireRegionId(value) {
  if (typeof value !== "string" || !REGION_BY_ID.has(value)) invalid("regionId", "FROZEN_REGION_ID_REQUIRED");
  return value;
}
function requireUtc2(payload, field) {
  const value = payload[field];
  if (!isUtc(value)) invalid(field, "RFC3339_UTC_REQUIRED");
  return value;
}
function requirePositiveVersion(value) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "expectedVersion must be a positive integer.", {
      details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field: "expectedVersion", rule: "POSITIVE_INTEGER" }] }
    });
  }
  return Number(value);
}
function optionalPositiveVersion(value) {
  return value === void 0 ? void 0 : requirePositiveVersion(value);
}
function regions() {
  return REGION_DIRECTORY.map((region) => Object.freeze({ id: region.id, name: clone(region.name) }));
}
function countries(regionId) {
  return COUNTRY_DIRECTORY.filter((country) => regionId === void 0 || country.parentId === regionId).map((country) => Object.freeze({ id: country.id, regionId: country.parentId, name: clone(country.name) }));
}
async function cityProjection(store, cityId) {
  const city = CITY_BY_ID.get(cityId);
  if (city === void 0) notFound("CITY", cityId);
  const overlay = await store.getCityOverlay(cityId);
  if (overlay === void 0) throw new Error(`missing operational overlay for ${cityId}`);
  return Object.freeze({
    id: city.id,
    countryId: city.parentId,
    regionId: city.regionId,
    name: clone(city.name),
    timezone: city.timezone,
    operationalState: overlay.operationalState
  });
}
function approvedOrganizer(record) {
  return record !== void 0 && record.reviewStatus === ReviewStatus.APPROVED && record.verificationState === VerificationState.HUMAN_REVIEWED;
}
function organizerProjection(record) {
  const organizerId = record._id;
  if (!approvedOrganizer(record)) notFound("ORGANIZER", organizerId);
  return Object.freeze({
    organizerId: record._id,
    name: clone(record.name),
    summary: record.summary,
    cityIds: Object.freeze([...record.cityIds]),
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}
function paymentReady(configuration) {
  return configuration.featureFlag === "ENABLED" && configuration.subjectQualified === true && configuration.categoryApproved === true && configuration.filingComplete === true && configuration.merchantIdConfigured === true && configuration.certificateConfigured === true && configuration.callbackVerified === true && configuration.reconciliationReady === true && configuration.refundSlaApproved === true;
}
async function isEventPublic(store, event) {
  if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED || event.origin !== RecordOrigin.REAL || event.verificationState !== VerificationState.HUMAN_REVIEWED || event.source.contentStatus !== "VERIFIED" || !isHttpsUrl(event.source.sourcePageUrl)) return false;
  const [overlay, node, organizer] = await Promise.all([
    store.getCityOverlay(event.cityId),
    store.getNode(event.clubNodeId),
    store.getOrganizer(event.organizerId)
  ]);
  return overlay !== void 0 && OPERATING_STATES.has(overlay.operationalState) && node !== void 0 && node.cityId === event.cityId && node.organizerId === event.organizerId && node.reviewStatus === ReviewStatus.APPROVED && OPERATING_STATES.has(node.operationalState) && node.operationalState === overlay.operationalState && approvedOrganizer(organizer) && organizer.cityIds.includes(event.cityId) && (event.coverAssetId === void 0 || event.imageRights.state === MediaRightsState.APPROVED && isHttpsUrl(event.imageRights.sourcePageUrl) && Boolean(event.imageRights.author?.trim()) && Boolean(event.imageRights.license?.trim()) && isUtc(event.imageRights.downloadedAt) && typeof event.imageRights.sha256 === "string" && /^[a-f0-9]{64}$/i.test(event.imageRights.sha256) && Number.isSafeInteger(event.imageRights.width) && Number(event.imageRights.width) > 0 && Number.isSafeInteger(event.imageRights.height) && Number(event.imageRights.height) > 0 && event.imageRights.alt.trim().length > 0);
}
function eventProjection(event, now) {
  const projection = {
    eventId: event._id,
    clubNodeId: event.clubNodeId,
    organizerId: event.organizerId,
    cityId: event.cityId,
    title: event.title,
    summary: event.summary,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    state: EventState.PUBLISHED,
    publicationState: PublicationState.PUBLISHED,
    reservationAvailable: event.reservationAvailable && event.registrationMethod === "INTEREST" && Date.parse(event.startsAt) > Date.parse(now),
    ...event.coverAssetId === void 0 ? {} : { coverAssetId: event.coverAssetId },
    origin: RecordOrigin.REAL,
    verificationState: event.verificationState,
    version: event.version,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
  return parseReadOnlyProjection("PublicEventProjection", projection);
}
function enrollmentProjection(record) {
  return Object.freeze({
    enrollmentId: record._id,
    eventId: record.eventId,
    userId: record.userId,
    state: record.state,
    paymentState: record.paymentState,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}
function effectiveClaims(claims, now) {
  return claims.map((claim) => parseReadOnlyProjection("PublicVerificationClaimProjection", claim)).filter((claim) => Date.parse(claim.validFrom) <= Date.parse(now) && (claim.validUntil === void 0 || Date.parse(now) < Date.parse(claim.validUntil)));
}
async function effectiveClaimsForUser(store, userId, now) {
  if (await store.hasDirtyVerificationProjection(userId)) return Object.freeze([]);
  return effectiveClaims(await store.listClaims(userId), now);
}
async function evaluateEligibility(store, event, userId, now) {
  if (!await isEventPublic(store, event) || Date.parse(event.startsAt) <= Date.parse(now) || !event.reservationAvailable || event.registrationMethod !== "INTEREST") {
    return Object.freeze({
      eventId: event._id,
      eligible: false,
      evaluatedAt: now,
      requiredLabelIds: Object.freeze([]),
      satisfiedClaimIds: Object.freeze([]),
      failureReason: "EVENT_UNAVAILABLE"
    });
  }
  const requiredLabelIds = Object.freeze(event.requiredLabelIds.map((id) => id));
  if (await store.isBlocked(event._id, userId)) {
    return Object.freeze({
      eventId: event._id,
      eligible: false,
      evaluatedAt: now,
      requiredLabelIds,
      satisfiedClaimIds: Object.freeze([]),
      failureReason: "BLOCKED"
    });
  }
  const claims = await effectiveClaimsForUser(store, userId, now);
  const matching = claims.filter((claim) => event.requiredLabelIds.includes(claim.labelId));
  const labels = new Set(matching.map((claim) => claim.labelId));
  const eligible = event.requiredLabelIds.every((labelId) => labels.has(labelId));
  return Object.freeze({
    eventId: event._id,
    eligible,
    evaluatedAt: now,
    requiredLabelIds,
    satisfiedClaimIds: Object.freeze(matching.map((claim) => claim.claimId)),
    ...eligible ? {} : { failureReason: "MISSING_APPROVED_CLAIM" }
  });
}
function actorRole(principal) {
  for (const role of ["ADMIN", "REVIEWER", "ORGANIZER"]) {
    if (principal.roles.includes(role)) return role;
  }
  return "MEMBER";
}
function principalUserId(principal) {
  if (principal.userId === void 0) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "A linked user account is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
  return principal.userId;
}
function success(requestId, data) {
  return { ok: true, data, requestId };
}
function encodeCursor(offset, filter) {
  return Buffer.from(JSON.stringify({ version: 1, offset, filter }), "utf8").toString("base64url");
}
function decodeCursor(value, expectedFilter) {
  if (typeof value !== "string" || value.length < 4 || value.length > 512) {
    throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, "The pagination cursor is malformed.", {
      details: { code: ApiErrorCode.INVALID_CURSOR, reason: "MALFORMED" }
    });
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!isPlainRecord(parsed) || parsed.version !== 1 || !Number.isSafeInteger(parsed.offset) || Number(parsed.offset) < 0 || typeof parsed.filter !== "string") throw new Error("malformed");
    if (parsed.filter !== expectedFilter) {
      throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, "The pagination cursor does not match the filters.", {
        details: { code: ApiErrorCode.INVALID_CURSOR, reason: "FILTER_MISMATCH" }
      });
    }
    return Number(parsed.offset);
  } catch (error) {
    if (error instanceof SafeApiError) throw error;
    throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, "The pagination cursor is malformed.", {
      details: { code: ApiErrorCode.INVALID_CURSOR, reason: "MALFORMED" }
    });
  }
}
function createEventApi(dependencies) {
  const now = dependencies.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  const getWxContext = dependencies.getWxContext ?? ((context) => ({
    ...typeof context?.OPENID === "string" ? { OPENID: context.OPENID } : {}
  }));
  async function authenticate(context) {
    return requireTrustedPrincipal(
      () => getWxContext(context),
      (openId) => dependencies.store.loadPrincipal(openId)
    );
  }
  async function implementedMain(rawEvent, context) {
    let responseRequestId2 = `srv_event_${Date.now()}`;
    try {
      const request = validateCallEnvelope(rawEvent, ACTIONS);
      responseRequestId2 = request.requestId;
      const payload = request.payload;
      switch (request.action) {
        case "geo.listRegions": {
          assertPayload(payload, ["includeOperationalSummary"], ["includeOperationalSummary"]);
          if (typeof payload.includeOperationalSummary !== "boolean") invalid("includeOperationalSummary", "BOOLEAN_REQUIRED");
          await dependencies.store.listCityOverlays();
          return success(request.requestId, { regions: regions() });
        }
        case "geo.listCountries": {
          assertPayload(payload, ["regionId"]);
          const regionId = payload.regionId === void 0 ? void 0 : requireRegionId(payload.regionId);
          return success(request.requestId, { countries: countries(regionId) });
        }
        case "geo.listCities": {
          assertPayload(payload, ["regionId", "countryId"]);
          const regionId = payload.regionId === void 0 ? void 0 : requireRegionId(payload.regionId);
          const countryId = payload.countryId === void 0 ? void 0 : requireCountryId(payload.countryId);
          if (regionId !== void 0 && countryId !== void 0 && COUNTRY_BY_ID.get(countryId)?.parentId !== regionId) invalid("countryId", "FILTER_CONFLICT");
          const selected = CITY_DIRECTORY.filter((city) => (regionId === void 0 || city.regionId === regionId) && (countryId === void 0 || city.parentId === countryId));
          const cities = await Promise.all(selected.map((city) => cityProjection(dependencies.store, city.id)));
          return success(request.requestId, { cities });
        }
        case "geo.getNode": {
          assertPayload(payload, ["cityId"], ["cityId"]);
          const cityId = requireCityId(payload.cityId);
          const city = await cityProjection(dependencies.store, cityId);
          const record = await dependencies.store.getNodeByCity(cityId);
          let node;
          if (record !== void 0 && record.reviewStatus === ReviewStatus.APPROVED && record.organizerId !== void 0 && record.operationalState === city.operationalState) {
            const organizer = await dependencies.store.getOrganizer(record.organizerId);
            if (approvedOrganizer(organizer) && organizer.cityIds.includes(cityId)) {
              node = Object.freeze({
                nodeId: record._id,
                cityId,
                name: clone(record.name),
                operationalState: record.operationalState,
                organizer: organizerProjection(organizer),
                version: record.version,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
              });
            }
          }
          return success(request.requestId, { city, ...node === void 0 ? {} : { node } });
        }
        case "event.list": {
          assertPayload(payload, ["cityId", "startsAfter", "startsBefore", "cursor", "limit"], ["limit"]);
          if (!Number.isSafeInteger(payload.limit) || Number(payload.limit) < 1 || Number(payload.limit) > 50) {
            invalid("limit", "INTEGER_1_TO_50_REQUIRED");
          }
          const cityId = payload.cityId === void 0 ? void 0 : requireCityId(payload.cityId);
          const startsAfter = payload.startsAfter === void 0 ? void 0 : requireUtc2(payload, "startsAfter");
          const startsBefore = payload.startsBefore === void 0 ? void 0 : requireUtc2(payload, "startsBefore");
          if (startsAfter !== void 0 && startsBefore !== void 0 && Date.parse(startsAfter) >= Date.parse(startsBefore)) invalid("startsBefore", "MUST_BE_AFTER_STARTS_AFTER");
          const filter = JSON.stringify({ cityId: cityId ?? null, startsAfter: startsAfter ?? null, startsBefore: startsBefore ?? null });
          const offset = payload.cursor === void 0 ? 0 : decodeCursor(payload.cursor, filter);
          const currentTime = now();
          if (!isUtc(currentTime)) throw new Error("runtime clock must return RFC3339 UTC");
          const candidates = (await dependencies.store.listEvents()).filter((event) => cityId === void 0 || event.cityId === cityId).filter((event) => startsAfter === void 0 || Date.parse(event.startsAt) >= Date.parse(startsAfter)).filter((event) => startsBefore === void 0 || Date.parse(event.startsAt) < Date.parse(startsBefore)).sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left._id.localeCompare(right._id));
          const visible = [];
          for (const event of candidates) if (await isEventPublic(dependencies.store, event)) visible.push(event);
          const limit = Number(payload.limit);
          const selected = visible.slice(offset, offset + limit);
          const nextOffset = offset + selected.length;
          const hasMore = nextOffset < visible.length;
          return success(request.requestId, {
            page: {
              items: selected.map((event) => eventProjection(event, currentTime)),
              ...hasMore ? { nextCursor: encodeCursor(nextOffset, filter) } : {},
              hasMore
            }
          });
        }
        case "event.get": {
          assertPayload(payload, ["eventId"], ["eventId"]);
          const eventId = requireStableId(payload, "eventId");
          const event = await dependencies.store.getEvent(eventId);
          if (event === void 0 || !await isEventPublic(dependencies.store, event)) {
            throw new SafeApiError(ApiErrorCode.EVENT_NOT_AVAILABLE, "The event is not publicly available.", {
              details: { code: ApiErrorCode.EVENT_NOT_AVAILABLE, eventState: "UNAVAILABLE" }
            });
          }
          const organizer = await dependencies.store.getOrganizer(event.organizerId);
          if (!approvedOrganizer(organizer)) notFound("ORGANIZER", event.organizerId);
          return success(request.requestId, {
            event: eventProjection(event, now()),
            organizer: organizerProjection(organizer)
          });
        }
        case "event.checkEligibility": {
          assertPayload(payload, ["eventId"], ["eventId"]);
          const eventId = requireStableId(payload, "eventId");
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const event = await dependencies.store.getEvent(eventId);
          const evaluatedAt = now();
          if (!isUtc(evaluatedAt)) throw new Error("runtime clock must return RFC3339 UTC");
          if (event === void 0) {
            return success(request.requestId, {
              eligibility: Object.freeze({
                eventId,
                eligible: false,
                evaluatedAt,
                requiredLabelIds: Object.freeze([]),
                satisfiedClaimIds: Object.freeze([]),
                failureReason: "EVENT_UNAVAILABLE"
              })
            });
          }
          return success(request.requestId, {
            eligibility: await evaluateEligibility(dependencies.store, event, userId, evaluatedAt)
          });
        }
        case "event.registerInterest": {
          assertPayload(payload, ["eventId", "acknowledgedTermsVersion", "idempotencyKey", "expectedVersion"], [
            "eventId",
            "acknowledgedTermsVersion",
            "idempotencyKey"
          ]);
          const eventId = requireStableId(payload, "eventId");
          const termsVersion = requireString2(payload, "acknowledgedTermsVersion");
          const key = requireIdempotencyKey(payload.idempotencyKey);
          const expectedVersion = optionalPositiveVersion(payload.expectedVersion);
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const currentTime = now();
          if (!isUtc(currentTime)) throw new Error("runtime clock must return RFC3339 UTC");
          const response = await dependencies.store.runTransaction(async (transaction) => {
            const fingerprintPayload3 = {
              eventId,
              acknowledgedTermsVersion: termsVersion,
              expectedVersion: expectedVersion ?? null,
              contractVersion: typeof payload.contractVersion === "string" ? payload.contractVersion : null
            };
            const claim = createIdempotencyClaim({
              functionName: "eventApi",
              action: "event.registerInterest",
              openId: principal.openId,
              key,
              payload: fingerprintPayload3,
              requestId: request.requestId,
              expiresAt: new Date(Date.parse(currentTime) + 864e5).toISOString()
            });
            const stored = await transaction.getIdempotency(claim.namespace);
            const disposition = assertIdempotencyCompatible(claim, stored);
            if (disposition === "REPLAY" && stored !== null) return stored.response;
            if (disposition === "IN_PROGRESS") {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "The request is still in progress.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "IDEMPOTENCY_IN_PROGRESS" }
              });
            }
            const event = await transaction.getEvent(eventId);
            if (event === void 0 || !await isEventPublic(transaction, event) || Date.parse(event.startsAt) <= Date.parse(currentTime) || Date.parse(event.endsAt) <= Date.parse(currentTime) || !event.reservationAvailable || event.registrationMethod === "OFFICIAL_URL") {
              throw new SafeApiError(ApiErrorCode.EVENT_NOT_AVAILABLE, "The event cannot accept interest.", {
                details: { code: ApiErrorCode.EVENT_NOT_AVAILABLE, eventState: "UNAVAILABLE" }
              });
            }
            if (expectedVersion !== void 0) requireExpectedVersion(expectedVersion, event.version);
            if (termsVersion !== event.termsVersion) {
              throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, "The current terms must be acknowledged.", {
                details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [
                  { field: "acknowledgedTermsVersion", rule: "CURRENT_TERMS_VERSION_REQUIRED" }
                ] }
              });
            }
            if (event.registrationMethod === "WECHAT_PAYMENT" && !paymentReady(await transaction.getPaymentConfiguration())) {
              throw new SafeApiError(ApiErrorCode.PAYMENT_DISABLED, "Payment capability is disabled.", {
                details: { code: ApiErrorCode.PAYMENT_DISABLED, featureFlag: "payment" }
              });
            }
            const evaluated = await evaluateEligibility(transaction, event, userId, currentTime);
            if (!evaluated.eligible) {
              const claims = await effectiveClaimsForUser(transaction, userId, currentTime);
              const labels = new Set(claims.map((candidate) => candidate.labelId));
              const missing = event.requiredLabelIds.filter((required) => !labels.has(required));
              throw new SafeApiError(ApiErrorCode.ELIGIBILITY_NOT_MET, "Event eligibility is not met.", {
                details: { code: ApiErrorCode.ELIGIBILITY_NOT_MET, missingLabelIds: missing.map((id) => id) }
              });
            }
            const existing = await transaction.getEnrollment(eventId, userId);
            if (existing !== void 0) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "An enrollment already exists for this event.", {
                details: {
                  code: ApiErrorCode.CONFLICT,
                  conflictType: ACTIVE_ENROLLMENTS.has(existing.state) ? "DUPLICATE_ACTIVE_ENROLLMENT" : "ENROLLMENT_STATE_TRANSITION"
                }
              });
            }
            if (await transaction.countActiveEnrollments(eventId) >= event.capacity) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "The event has reached capacity.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "CAPACITY_REACHED" }
              });
            }
            const enrollment = {
              _id: `enrollment_${eventId}_${userId}`.slice(0, 120),
              eventId,
              userId,
              state: EnrollmentState.INTERESTED,
              paymentState: event.requiresPayment ? PaymentState.PENDING : PaymentState.NOT_REQUIRED,
              version: 1,
              createdAt: currentTime,
              updatedAt: currentTime
            };
            await transaction.saveEnrollment(enrollment);
            const projection = enrollmentProjection(enrollment);
            await transaction.saveIdempotency({ ...claim, status: "COMPLETED", response: projection });
            await transaction.appendAudit({
              _id: `audit_${request.requestId}`,
              actorUserId: userId,
              actorRole: actorRole(principal),
              action: "event.registerInterest",
              targetType: "EVENT_ENROLLMENT",
              targetId: enrollment._id,
              requestId: request.requestId,
              occurredAt: currentTime,
              result: "SUCCEEDED"
            });
            return projection;
          });
          return success(request.requestId, { enrollment: response });
        }
        case "event.cancelInterest": {
          assertPayload(payload, ["eventId", "reasonCode", "idempotencyKey", "expectedVersion"], [
            "eventId",
            "idempotencyKey"
          ]);
          const eventId = requireStableId(payload, "eventId");
          if (payload.reasonCode !== void 0 && !["SCHEDULE", "TRAVEL", "OTHER"].includes(String(payload.reasonCode))) invalid("reasonCode", "ENUM_REQUIRED");
          const key = requireIdempotencyKey(payload.idempotencyKey);
          const expectedVersion = optionalPositiveVersion(payload.expectedVersion);
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const currentTime = now();
          if (!isUtc(currentTime)) throw new Error("runtime clock must return RFC3339 UTC");
          const response = await dependencies.store.runTransaction(async (transaction) => {
            const fingerprintPayload3 = {
              eventId,
              reasonCode: typeof payload.reasonCode === "string" ? payload.reasonCode : null,
              expectedVersion: expectedVersion ?? null,
              contractVersion: typeof payload.contractVersion === "string" ? payload.contractVersion : null
            };
            const claim = createIdempotencyClaim({
              functionName: "eventApi",
              action: "event.cancelInterest",
              openId: principal.openId,
              key,
              payload: fingerprintPayload3,
              requestId: request.requestId,
              expiresAt: new Date(Date.parse(currentTime) + 864e5).toISOString()
            });
            const stored = await transaction.getIdempotency(claim.namespace);
            const disposition = assertIdempotencyCompatible(claim, stored);
            if (disposition === "REPLAY" && stored !== null) return stored.response;
            if (disposition === "IN_PROGRESS") {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "The request is still in progress.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "IDEMPOTENCY_IN_PROGRESS" }
              });
            }
            const existing = await transaction.getEnrollment(eventId, userId);
            if (existing === void 0) {
              throw new SafeApiError(ApiErrorCode.ENROLLMENT_NOT_FOUND, "No enrollment exists for this event.", {
                details: { code: ApiErrorCode.ENROLLMENT_NOT_FOUND, eventId }
              });
            }
            const event = await transaction.getEvent(eventId);
            if (event === void 0) {
              throw new SafeApiError(ApiErrorCode.EVENT_NOT_AVAILABLE, "The event cannot be cancelled.", {
                details: { code: ApiErrorCode.EVENT_NOT_AVAILABLE, eventState: "UNAVAILABLE" }
              });
            }
            if (event.state !== EventState.PUBLISHED && event.state !== EventState.PAUSED && event.state !== EventState.CANCELLED) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "The event state does not allow cancellation.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "EVENT_STATE_TRANSITION" }
              });
            }
            if (Date.parse(event.startsAt) <= Date.parse(currentTime)) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "Cancellation is closed after the event starts.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "CANCELLATION_WINDOW_CLOSED" }
              });
            }
            if (expectedVersion !== void 0) requireExpectedVersion(expectedVersion, existing.version);
            if (!ACTIVE_ENROLLMENTS.has(existing.state)) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "The enrollment cannot be cancelled.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "ENROLLMENT_STATE_TRANSITION" }
              });
            }
            if (existing.paymentState === PaymentState.AUTHORIZED || existing.paymentState === PaymentState.PAID) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, "Paid enrollment requires the refund workflow.", {
                details: { code: ApiErrorCode.CONFLICT, conflictType: "REFUND_WORKFLOW_REQUIRED" }
              });
            }
            const enrollment = {
              ...existing,
              state: EnrollmentState.CANCELLED,
              paymentState: existing.paymentState === PaymentState.PENDING ? PaymentState.CANCELLED : existing.paymentState,
              version: existing.version + 1,
              updatedAt: currentTime
            };
            await transaction.saveEnrollment(enrollment);
            const projection = enrollmentProjection(enrollment);
            await transaction.saveIdempotency({ ...claim, status: "COMPLETED", response: projection });
            await transaction.appendAudit({
              _id: `audit_${request.requestId}`,
              actorUserId: userId,
              actorRole: actorRole(principal),
              action: "event.cancelInterest",
              targetType: "EVENT_ENROLLMENT",
              targetId: enrollment._id,
              requestId: request.requestId,
              occurredAt: currentTime,
              result: "SUCCEEDED"
            });
            return projection;
          });
          return success(request.requestId, { enrollment: response });
        }
        case "event.getEnrollment": {
          assertPayload(payload, ["eventId"], ["eventId"]);
          const eventId = requireStableId(payload, "eventId");
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const enrollment = await dependencies.store.getEnrollment(eventId, userId);
          return success(request.requestId, enrollment === void 0 ? {} : { enrollment: enrollmentProjection(enrollment) });
        }
        case "organizer.getPublic": {
          assertPayload(payload, ["organizerId"], ["organizerId"]);
          const organizerId = requireStableId(payload, "organizerId");
          const organizer = await dependencies.store.getOrganizer(organizerId);
          if (!approvedOrganizer(organizer)) notFound("ORGANIZER", organizerId);
          return success(request.requestId, { organizer: organizerProjection(organizer) });
        }
        case "payment.getCapability": {
          assertPayload(payload, ["eventId"]);
          await authenticate(context);
          let event;
          if (payload.eventId !== void 0) {
            const eventId = requireStableId(payload, "eventId");
            event = await dependencies.store.getEvent(eventId);
            if (event === void 0 || !await isEventPublic(dependencies.store, event)) notFound("EVENT", eventId);
          }
          let capability;
          if (event !== void 0 && !event.requiresPayment) {
            capability = Object.freeze({ state: PaymentState.NOT_REQUIRED, enabled: false, reason: "EVENT_FREE" });
          } else if (paymentReady(await dependencies.store.getPaymentConfiguration())) {
            capability = Object.freeze({ state: PaymentState.PENDING, enabled: true, reason: "CAPABILITY_AVAILABLE" });
          } else {
            capability = Object.freeze({ state: PaymentState.DISABLED, enabled: false, reason: "P0_DISABLED" });
          }
          return success(request.requestId, { capability });
        }
      }
    } catch (error) {
      return safeFailureFromError(
        responseRequestId2,
        error instanceof Error ? error : new Error("Non-error thrown at eventApi boundary")
      );
    }
  }
  return Object.freeze({ actions: ACTIONS, main: implementedMain });
}
var endpoint = createNotImplementedEndpoint("eventApi", ACTIONS);
var main = endpoint.main;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  DEFAULT_CITY_OVERLAYS,
  DEFAULT_PAYMENT_CONFIGURATION,
  EVENT_INTEREST_TERMS_VERSION,
  assertEventApiSeed,
  assertFrozenCityOverlays,
  createEventApi,
  createInMemoryEventApiStore,
  endpoint,
  main
});
