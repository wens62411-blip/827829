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

// miniprogram/shared/types/enums.ts
var RecordOrigin, VerificationState, ReviewStatus, Visibility, RuntimeMode, FriendshipState, EventState, PublicationState, MediaRightsState;
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
    Visibility = {
      PRIVATE: "PRIVATE",
      FRIENDS_ONLY: "FRIENDS_ONLY",
      PUBLIC: "PUBLIC"
    };
    RuntimeMode = {
      LIVE: "LIVE",
      DEGRADED: "DEGRADED",
      OFFLINE_DEMO: "OFFLINE_DEMO"
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

// cloudfunctions/identityApi/domain.ts
var domain_exports = {};
__export(domain_exports, {
  DEFAULT_PROFILE_VISIBILITY: () => DEFAULT_PROFILE_VISIBILITY,
  DEFAULT_SHARE_ALLOWED_FIELDS: () => DEFAULT_SHARE_ALLOWED_FIELDS,
  PERMANENTLY_PRIVATE_FIELD_KEYS: () => PERMANENTLY_PRIVATE_FIELD_KEYS,
  PROFILE_FIELD_KEYS: () => PROFILE_FIELD_KEYS,
  SHARE_ALLOWED_FIELD_KEYS: () => SHARE_ALLOWED_FIELD_KEYS,
  buildPublicCardRecord: () => buildPublicCardRecord,
  buildViewerCard: () => buildViewerCard,
  defaultRelationship: () => defaultRelationship,
  deriveShareToken: () => deriveShareToken,
  hashPrivateIdentifier: () => hashPrivateIdentifier,
  hashShareToken: () => hashShareToken,
  isKnownCityId: () => isKnownCityId,
  isSha256Digest: () => isSha256Digest,
  isValidQrScene: () => isValidQrScene,
  isValidRuntimeMode: () => isValidRuntimeMode,
  isValidShareToken: () => isValidShareToken,
  profileCompletionPercent: () => profileCompletionPercent,
  relationshipTier: () => relationshipTier,
  selectEffectiveClaims: () => selectEffectiveClaims,
  selectVisibleProfileFields: () => selectVisibleProfileFields,
  toProfilePrivateDto: () => toProfilePrivateDto,
  toPublicCardProjection: () => toPublicCardProjection,
  validateProfileVisibility: () => validateProfileVisibility
});
function visibilityAllows(value, tier) {
  if (tier === "OWNER") return true;
  if (value === Visibility.PUBLIC) return true;
  return tier === "FRIEND" && value === Visibility.FRIENDS_ONLY;
}
function allowedByShareScope(field, allowedFields) {
  return allowedFields === void 0 || allowedFields.has(field);
}
function selectVisibleProfileFields(profile, tier, allowedFields) {
  const scope = allowedFields === void 0 ? void 0 : new Set(allowedFields);
  const selected = {};
  for (const field of PROFILE_FIELD_KEYS) {
    if (!allowedByShareScope(field, scope)) continue;
    const visibility = profile.visibility[field];
    if (!visibilityAllows(visibility, tier)) continue;
    const value = profile[field];
    if (value === void 0) continue;
    if (Array.isArray(value)) {
      selected[field] = Object.freeze([...value]);
    } else {
      Object.assign(selected, { [field]: value });
    }
  }
  return Object.freeze(selected);
}
function defaultRelationship(viewerUserId, subjectUserId, at) {
  return Object.freeze({
    version: 1,
    createdAt: at,
    updatedAt: at,
    viewerUserId,
    subjectUserId,
    viewerBlockedSubject: false,
    subjectBlockedViewer: false,
    mayViewFriendsOnlyFields: false,
    sourceVersion: 1
  });
}
function relationshipTier(viewerUserId, subjectUserId, relationship) {
  if (viewerUserId === subjectUserId) return "OWNER";
  return relationship.friendshipState === FriendshipState.ACCEPTED && relationship.mayViewFriendsOnlyFields && !relationship.viewerBlockedSubject && !relationship.subjectBlockedViewer ? "FRIEND" : "STRANGER";
}
function selectEffectiveClaims(values, subjectUserId, evaluatedAt) {
  const evaluated = Date.parse(evaluatedAt);
  const result = [];
  for (const value of values) {
    try {
      const claim = parseReadOnlyProjection("PublicVerificationClaimProjection", value);
      const validUntil = claim.validUntil === void 0 ? Number.POSITIVE_INFINITY : Date.parse(claim.validUntil);
      if (claim.subjectUserId !== subjectUserId || claim.reviewStatus !== ReviewStatus.APPROVED || claim.verificationState !== VerificationState.HUMAN_REVIEWED || claim.publicVisible !== true || evaluated < Date.parse(claim.validFrom) || evaluated >= validUntil) continue;
      result.push(claim);
    } catch {
    }
  }
  return Object.freeze(result);
}
function profileCompletionPercent(profile) {
  const values = [profile.displayName, profile.avatarAssetId, profile.cityId, profile.biography];
  const complete = values.filter((value) => typeof value === "string" && value.trim().length > 0).length;
  return complete * 25;
}
function maskPhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return void 0;
  return `***${digits.slice(-4)}`;
}
function maskEmail(value) {
  const separator = value.lastIndexOf("@");
  if (separator <= 0 || separator === value.length - 1) return void 0;
  const local = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}
function toProfilePrivateDto(profile) {
  const dto = {
    profileId: profile._id,
    userId: profile.userId,
    displayName: profile.displayName,
    version: profile.version,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
  if (profile.phone !== void 0) {
    const masked = maskPhone(profile.phone);
    if (masked !== void 0) dto.phoneMasked = masked;
  }
  if (profile.email !== void 0) {
    const masked = maskEmail(profile.email);
    if (masked !== void 0) dto.emailMasked = masked;
  }
  if (profile.cityId !== void 0) dto.cityId = profile.cityId;
  if (profile.biography !== void 0) dto.biography = profile.biography;
  if (profile.avatarAssetId !== void 0) dto.avatarAssetId = profile.avatarAssetId;
  return Object.freeze(dto);
}
function toPublicCardProjection(record, claims) {
  const card = {
    cardId: record.cardId,
    ownerUserId: record.ownerUserId,
    displayName: record.displayName,
    visibility: record.visibility,
    claims: Object.freeze([...claims]),
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
  if (record.headline !== void 0) card.headline = record.headline;
  if (record.cityId !== void 0) card.cityId = record.cityId;
  if (record.avatarUrl !== void 0) card.avatarUrl = record.avatarUrl;
  if (record.biography !== void 0) card.biography = record.biography;
  return Object.freeze(card);
}
function buildViewerCard(base, visible, claims, tier, avatarUrl, allowedFields) {
  const scope = allowedFields === void 0 ? void 0 : new Set(allowedFields);
  const card = {
    cardId: base.cardId,
    ownerUserId: base.ownerUserId,
    displayName: visible.displayName ?? SAFE_ALIAS,
    visibility: tier === "OWNER" ? Visibility.PRIVATE : tier === "FRIEND" ? Visibility.FRIENDS_ONLY : Visibility.PUBLIC,
    claims: scope === void 0 || scope.has("claims") ? Object.freeze([...claims]) : Object.freeze([]),
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    version: base.version,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt
  };
  if (visible.headline !== void 0) card.headline = visible.headline;
  if (visible.cityId !== void 0) card.cityId = visible.cityId;
  if (visible.biography !== void 0) card.biography = visible.biography;
  if (visible.avatarAssetId !== void 0 && avatarUrl !== void 0) card.avatarUrl = avatarUrl;
  return Object.freeze(card);
}
function buildPublicCardRecord(input) {
  const selected = selectVisibleProfileFields(input.profile, "STRANGER");
  const record = {
    cardId: input.previous?.cardId ?? `card_${input.profile.userId}`,
    ownerUserId: input.profile.userId,
    displayName: selected.displayName ?? SAFE_ALIAS,
    visibility: Visibility.PUBLIC,
    claims: Object.freeze([...input.claims]),
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    sourceProfileVersion: input.profile.version,
    version: (input.previous?.version ?? 0) + 1,
    createdAt: input.previous?.createdAt ?? input.now,
    updatedAt: input.now
  };
  if (selected.headline !== void 0) record.headline = selected.headline;
  if (selected.cityId !== void 0) record.cityId = selected.cityId;
  if (selected.biography !== void 0) record.biography = selected.biography;
  if (selected.avatarAssetId !== void 0 && input.avatarUrl !== void 0) record.avatarUrl = input.avatarUrl;
  return Object.freeze(record);
}
function validateProfileVisibility(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  const exactKeys = [...PROFILE_FIELD_KEYS, ...PERMANENTLY_PRIVATE_FIELD_KEYS].sort();
  const actualKeys = Object.keys(record).sort();
  if (actualKeys.length !== exactKeys.length || !actualKeys.every((key, index) => key === exactKeys[index])) return false;
  if (!PROFILE_FIELD_KEYS.every((key) => Object.values(Visibility).includes(record[key]))) {
    return false;
  }
  return PERMANENTLY_PRIVATE_FIELD_KEYS.every((key) => record[key] === Visibility.PRIVATE);
}
function isKnownCityId(value) {
  return CITY_DIRECTORY.some((city) => city.id === value);
}
function hashPrivateIdentifier(value) {
  return (0, import_node_crypto2.createHash)("sha256").update(value, "utf8").digest("hex");
}
function deriveShareToken(signingKey, shareTokenId) {
  const keyLength = typeof signingKey === "string" ? Buffer.byteLength(signingKey, "utf8") : signingKey.byteLength;
  if (keyLength < 32) throw new Error("tokenSigningKey must contain at least 32 bytes");
  const bearer = (0, import_node_crypto2.createHmac)("sha256", signingKey).update(`ab-club-share:v1:${shareTokenId}`, "utf8").digest("base64url");
  return `sc_${bearer.slice(0, 27)}`;
}
function hashShareToken(value) {
  return (0, import_node_crypto2.createHash)("sha256").update(value, "utf8").digest("hex");
}
function isValidShareToken(value) {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}
function isValidQrScene(value) {
  return typeof value === "string" && value.length <= 32 && SCENE_PATTERN.test(value);
}
function isSha256Digest(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}
function isValidRuntimeMode(value) {
  return Object.values(RuntimeMode).includes(value);
}
var import_node_crypto2, PROFILE_FIELD_KEYS, PERMANENTLY_PRIVATE_FIELD_KEYS, SHARE_ALLOWED_FIELD_KEYS, DEFAULT_PROFILE_VISIBILITY, DEFAULT_SHARE_ALLOWED_FIELDS, SAFE_ALIAS, TOKEN_PATTERN, SCENE_PATTERN, SHA256_PATTERN;
var init_domain = __esm({
  "cloudfunctions/identityApi/domain.ts"() {
    import_node_crypto2 = require("node:crypto");
    init_geography();
    init_enums();
    init_projections();
    PROFILE_FIELD_KEYS = [
      "displayName",
      "avatarAssetId",
      "cityId",
      "biography",
      "headline",
      "industry",
      "company",
      "position",
      "experience",
      "interests"
    ];
    PERMANENTLY_PRIVATE_FIELD_KEYS = [
      "phone",
      "email",
      "governmentId",
      "verificationEvidenceUrls",
      "wechatIdentifiers",
      "riskControl"
    ];
    SHARE_ALLOWED_FIELD_KEYS = [
      ...PROFILE_FIELD_KEYS,
      "claims"
    ];
    DEFAULT_PROFILE_VISIBILITY = Object.freeze({
      displayName: Visibility.PUBLIC,
      avatarAssetId: Visibility.PUBLIC,
      cityId: Visibility.PUBLIC,
      biography: Visibility.PUBLIC,
      headline: Visibility.PRIVATE,
      industry: Visibility.PRIVATE,
      company: Visibility.PRIVATE,
      position: Visibility.PRIVATE,
      experience: Visibility.PRIVATE,
      interests: Visibility.PRIVATE,
      phone: Visibility.PRIVATE,
      email: Visibility.PRIVATE,
      governmentId: Visibility.PRIVATE,
      verificationEvidenceUrls: Visibility.PRIVATE,
      wechatIdentifiers: Visibility.PRIVATE,
      riskControl: Visibility.PRIVATE
    });
    DEFAULT_SHARE_ALLOWED_FIELDS = Object.freeze([
      ...SHARE_ALLOWED_FIELD_KEYS
    ]);
    SAFE_ALIAS = "AB Club \u4F1A\u5458";
    TOKEN_PATTERN = /^sc_[A-Za-z0-9_-]{27}$/;
    SCENE_PATTERN = /^sc_[A-Za-z0-9_-]{27}$/;
    SHA256_PATTERN = /^[a-f0-9]{64}$/;
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
async function requireTrustedPrincipal(getWxContext, loadPrincipal2) {
  const openId = requireTrustedOpenId(getWxContext);
  const principal = await loadPrincipal2(openId);
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
function asUserId(value) {
  return value;
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
  return (0, import_node_crypto3.createHash)("sha256").update(canonicalize(payload), "utf8").digest("hex");
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
var import_node_crypto3, IDEMPOTENCY_KEY_PATTERN;
var init_idempotency = __esm({
  "cloudfunctions/_shared/idempotency/index.ts"() {
    import_node_crypto3 = require("node:crypto");
    init_api();
    init_errors();
    IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
  }
});

// cloudfunctions/identityApi/service.ts
var service_exports = {};
__export(service_exports, {
  IDENTITY_ACTIONS: () => IDENTITY_ACTIONS,
  IDENTITY_RUNTIME_MODES: () => IDENTITY_RUNTIME_MODES,
  IDENTITY_WRITE_ACTIONS: () => IDENTITY_WRITE_ACTIONS,
  createIdentityEndpoint: () => createIdentityEndpoint
});
function responseRequestId2(event) {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId;
  return `srv_${(0, import_node_crypto4.randomUUID)()}`;
}
function now(runtime) {
  const instant = runtime.now?.() ?? /* @__PURE__ */ new Date();
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("Identity runtime returned an invalid clock value");
  }
  return instant.toISOString();
}
function plusMilliseconds(value, milliseconds) {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}
function randomStableId(prefix, bytes = 18) {
  return `${prefix}_${(0, import_node_crypto4.randomBytes)(bytes).toString("base64url")}`;
}
function success(requestId, data) {
  return { ok: true, data, requestId };
}
function validation(field, rule, message = "The request payload is invalid.") {
  throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, message, {
    details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field, rule }] }
  });
}
function invalidRequest(field, reason, message = "The request payload is invalid.") {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, message, {
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
function assertPayloadKeys(payload, allowed) {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(payload).find((key) => !allowedSet.has(key));
  if (extra !== void 0) invalidRequest(extra, "UNEXPECTED_FIELD");
  if (payload.contractVersion !== CONTRACT_VERSION) {
    invalidRequest("contractVersion", "UNSUPPORTED_CONTRACT_VERSION");
  }
}
function requireStableString(value, field) {
  if (typeof value !== "string" || !STABLE_ID_PATTERN.test(value)) invalidRequest(field, "MALFORMED_STABLE_ID");
  return value;
}
function requireVersionValue(value, field = "expectedVersion") {
  if (!Number.isSafeInteger(value) || value < 1) validation(field, "POSITIVE_INTEGER");
  return value;
}
function assertCurrentVersion(value, currentVersion) {
  requireExpectedVersion(requireVersionValue(value), currentVersion);
}
function assertCreationVersion(value) {
  if (value !== void 0 && value !== 0) validation("expectedVersion", "ZERO_OR_OMITTED_FOR_CREATE");
}
function requireUtc2(value, field) {
  if (typeof value !== "string" || !UTC_PATTERN2.test(value) || Number.isNaN(Date.parse(value))) {
    validation(field, "RFC3339_UTC");
  }
  return value;
}
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
function asJsonPayload(payload) {
  return cloneJson(payload);
}
function actorRole(principal) {
  return principal?.roles[0] ?? "SYSTEM";
}
function requireRuntime(runtime) {
  if (runtime === null || typeof runtime !== "object") throw new Error("Identity runtime is required");
  if (typeof runtime.getWxContext !== "function" || runtime.store === null || typeof runtime.store !== "object" || typeof runtime.store.runTransaction !== "function" || runtime.qrCode === null || typeof runtime.qrCode !== "object" || typeof runtime.qrCode.generate !== "function" || !isValidRuntimeMode(runtime.runtimeMode)) {
    throw new Error("Identity runtime adapter is incomplete");
  }
  deriveShareToken(runtime.tokenSigningKey, "share_AAAAAAAAAAAAAAAAAAAAAAAA");
}
async function loadPrincipal(runtime, reader = runtime.store) {
  return requireTrustedPrincipal(runtime.getWxContext, async (openId) => {
    const user = await reader.findUserByOpenIdHash(hashPrivateIdentifier(openId));
    if (user === null) return null;
    return {
      openId,
      userId: user._id,
      roles: user.roles,
      accountState: user.accountState
    };
  });
}
async function loadOptionalPrincipal(runtime) {
  try {
    const openId = requireTrustedOpenId(runtime.getWxContext);
    const user = await runtime.store.findUserByOpenIdHash(hashPrivateIdentifier(openId));
    if (user === null || user.accountState !== "ACTIVE") return null;
    return {
      openId,
      userId: user._id,
      roles: user.roles,
      accountState: user.accountState
    };
  } catch (error) {
    if (error instanceof SafeApiError && error.code === ApiErrorCode.AUTH_REQUIRED) return null;
    throw error;
  }
}
async function assertPrincipalStillActive(transaction, principal) {
  if (principal.userId === void 0) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, "Authentication is required.", {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true }
    });
  }
  const user = await transaction.findUserById(principal.userId);
  if (user === null || user.accountState !== "ACTIVE") {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "This account cannot perform the action.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "ACTIVE_ACCOUNT_REQUIRED" }
    });
  }
}
async function executeWrite(input) {
  const key = requireIdempotencyKey(input.payload.idempotencyKey);
  const instant = now(input.runtime);
  const claim = createIdempotencyClaim({
    functionName: "identityApi",
    action: input.action,
    // The shared helper names this field openId; pass only its one-way digest.
    openId: input.openIdHash,
    key,
    payload: asJsonPayload(input.payload),
    requestId: input.requestId,
    expiresAt: plusMilliseconds(instant, IDEMPOTENCY_TTL_MS)
  });
  return input.runtime.store.runTransaction(async (transaction) => {
    if (input.principal !== null) await assertPrincipalStillActive(transaction, input.principal);
    const existing = await transaction.findIdempotency(claim.namespace);
    const decision = assertIdempotencyCompatible(claim, existing);
    if (decision === "REPLAY") return input.replay(existing?.result, transaction, instant);
    if (decision === "IN_PROGRESS") {
      throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The original request is still being processed.", {
        retryable: true,
        details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "identityApi.idempotency" }
      });
    }
    const outcome = await input.operation(transaction, instant);
    const audit = createAuditAppend({
      auditEntryId: randomStableId("audit"),
      ...input.principal?.userId === void 0 ? {} : { actorUserId: input.principal.userId },
      actorRole: actorRole(input.principal),
      action: input.action,
      targetType: outcome.targetType,
      targetId: outcome.targetId,
      requestId: input.requestId,
      occurredAt: instant,
      result: "SUCCEEDED"
    });
    const idempotency = Object.freeze({
      ...claim,
      status: "COMPLETED",
      createdAt: instant,
      result: cloneJson(outcome.storedResult)
    });
    await transaction.appendAudit(audit);
    await transaction.saveIdempotency(idempotency);
    return outcome.data;
  });
}
function requireProfile(profile) {
  if (profile === null) notFound("PROFILE");
  return profile;
}
function requireCard(card) {
  if (card === null) notFound("CARD");
  return card;
}
function assertCardCurrent(card, profile) {
  if (card.sourceProfileVersion !== profile.requiredProjectionVersion || card.sourceProfileVersion !== profile.version) {
    throw new SafeApiError(ApiErrorCode.PROJECTION_STALE, "The card projection must be refreshed.", {
      details: {
        code: ApiErrorCode.PROJECTION_STALE,
        projectionType: "PublicCardProjection",
        requiredSourceVersion: profile.version
      }
    });
  }
}
async function loadRelationship(reader, viewerUserId, subjectUserId, instant) {
  if (viewerUserId === subjectUserId) return defaultRelationship(viewerUserId, subjectUserId, instant);
  const value = await reader.findRelationship(viewerUserId, subjectUserId);
  if (value === null) return defaultRelationship(viewerUserId, subjectUserId, instant);
  const relationship = parseReadOnlyProjection("ViewerRelationshipProjection", value);
  if (relationship.viewerUserId !== viewerUserId || relationship.subjectUserId !== subjectUserId) {
    throw new SafeApiError(
      ApiErrorCode.SERVICE_UNAVAILABLE,
      "The relationship projection is unavailable.",
      {
        retryable: false,
        details: {
          code: ApiErrorCode.SERVICE_UNAVAILABLE,
          service: "ViewerRelationshipProjection.identity_binding"
        }
      }
    );
  }
  return relationship;
}
function assertNotBlocked(relationship, forShare) {
  if (!relationship.viewerBlockedSubject && !relationship.subjectBlockedViewer) return;
  if (forShare) {
    throw new SafeApiError(ApiErrorCode.TOKEN_INVALID, "The share token is unavailable.", {
      details: { code: ApiErrorCode.TOKEN_INVALID, tokenKind: "CARD_SHARE" }
    });
  }
  throw new SafeApiError(ApiErrorCode.BLOCKED_RELATIONSHIP, "The relationship blocks card access.", {
    details: { code: ApiErrorCode.BLOCKED_RELATIONSHIP, blocksAccess: true }
  });
}
async function buildCardForViewer(input) {
  const owner = await input.reader.findUserById(input.ownerUserId);
  if (owner === null || owner.accountState !== "ACTIVE") notFound("CARD");
  const profile = requireProfile(await input.reader.findProfileByUserId(input.ownerUserId));
  const base = requireCard(await input.reader.findCardByOwnerUserId(input.ownerUserId));
  assertCardCurrent(base, profile);
  const relationship = await loadRelationship(
    input.reader,
    input.viewerUserId,
    input.ownerUserId,
    input.instant
  );
  assertNotBlocked(relationship, input.forShare);
  let tier = relationshipTier(input.viewerUserId, input.ownerUserId, relationship);
  if (input.forShare && tier === "OWNER") tier = "FRIEND";
  if (input.ownerMaySeePrivate === false && tier === "OWNER") tier = "STRANGER";
  const visible = selectVisibleProfileFields(profile, tier, input.allowedFields);
  const claims = selectEffectiveClaims(
    await input.reader.listVerificationClaims(input.ownerUserId),
    input.ownerUserId,
    input.instant
  );
  const avatarUrl = visible.avatarAssetId === void 0 ? void 0 : await input.reader.findApprovedMediaUrl(visible.avatarAssetId) ?? void 0;
  const card = buildViewerCard(
    base,
    visible,
    claims,
    tier,
    avatarUrl,
    input.allowedFields
  );
  return { card, relationship };
}
function validateShareAllowedFields(value) {
  const allowed = new Set(DEFAULT_SHARE_ALLOWED_FIELDS);
  if (value.length === 0 || value.some((field) => !allowed.has(field))) {
    throw new Error("defaultShareAllowedFields contains an unsupported field");
  }
  return Object.freeze([...new Set(value)]);
}
async function currentTargetVersion(reader, targetType, targetId) {
  if (targetType === "CARD") {
    const card = await reader.findCardById(targetId);
    if (card === null) notFound("CARD", targetId);
    return card.version;
  }
  const event = await reader.findPublicEvent(targetId);
  if (event === null) notFound("EVENT", targetId);
  return event.version;
}
async function assertTargetOwnedBy(reader, targetType, targetId, ownerUserId) {
  if (targetType === "CARD") {
    const card = await reader.findCardById(targetId);
    if (card === null) notFound("CARD", targetId);
    if (card.ownerUserId !== ownerUserId) {
      throw new SafeApiError(ApiErrorCode.FORBIDDEN, "Only the target owner may share it.", {
        details: { code: ApiErrorCode.FORBIDDEN, policy: "SHARE_TARGET_OWNER_REQUIRED" }
      });
    }
    return card.version;
  }
  const eventId = targetId;
  const [event, eventOwner] = await Promise.all([
    reader.findPublicEvent(eventId),
    reader.findEventShareOwnerUserId(eventId)
  ]);
  if (event === null || eventOwner === null) notFound("EVENT", eventId);
  if (eventOwner !== ownerUserId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, "Only the target owner may share it.", {
      details: { code: ApiErrorCode.FORBIDDEN, policy: "SHARE_TARGET_OWNER_REQUIRED" }
    });
  }
  return event.version;
}
function tokenInvalid(kind = "CARD_SHARE") {
  throw new SafeApiError(ApiErrorCode.TOKEN_INVALID, "The share token is invalid.", {
    details: { code: ApiErrorCode.TOKEN_INVALID, tokenKind: kind }
  });
}
function isStoredShareWellFormed(share) {
  const allowedFields = new Set(DEFAULT_SHARE_ALLOWED_FIELDS);
  const hasValidAllowedFields = Array.isArray(share.allowedFields) && share.allowedFields.length > 0 && new Set(share.allowedFields).size === share.allowedFields.length && share.allowedFields.every((field) => allowedFields.has(field));
  const expiresAtValid = typeof share.expiresAt === "string" && UTC_PATTERN2.test(share.expiresAt) && !Number.isNaN(Date.parse(share.expiresAt));
  const revokedAtValid = share.revoked ? typeof share.revokedAt === "string" && UTC_PATTERN2.test(share.revokedAt) && !Number.isNaN(Date.parse(share.revokedAt)) : share.revokedAt === void 0;
  return (share.targetType === "CARD" || share.targetType === "EVENT") && typeof share._id === "string" && STABLE_ID_PATTERN.test(share._id) && typeof share.ownerUserId === "string" && STABLE_ID_PATTERN.test(share.ownerUserId) && typeof share.targetId === "string" && STABLE_ID_PATTERN.test(share.targetId) && isSha256Digest(share.tokenDigest) && share.purpose === "WECHAT_FORWARD" && typeof share.revoked === "boolean" && revokedAtValid && Number.isSafeInteger(share.version) && share.version >= 1 && expiresAtValid && hasValidAllowedFields;
}
function assertShareUsable(share, instant) {
  if (!isStoredShareWellFormed(share)) {
    tokenInvalid(share.targetType === "EVENT" ? "EVENT_SHARE" : "CARD_SHARE");
  }
  if (share.revoked) {
    throw new SafeApiError(ApiErrorCode.TOKEN_REVOKED, "The share token was revoked.", {
      details: { code: ApiErrorCode.TOKEN_REVOKED, revokedAt: share.revokedAt }
    });
  }
  if (Date.parse(share.expiresAt) <= Date.parse(instant)) {
    throw new SafeApiError(ApiErrorCode.TOKEN_EXPIRED, "The share token expired.", {
      details: { code: ApiErrorCode.TOKEN_EXPIRED, expiredAt: share.expiresAt }
    });
  }
}
function requireStoredObject(value, fields) {
  if (!isPlainRecord(value) || fields.some((field) => !(field in value))) {
    throw new Error("Stored idempotency result is malformed");
  }
  return value;
}
async function handleBootstrap(runtime, payload, requestId) {
  assertPayloadKeys(payload, ["contractVersion", "idempotencyKey", "expectedVersion", "requestedRuntime"]);
  if (payload.requestedRuntime !== void 0 && payload.requestedRuntime !== "CLOUD") {
    validation("requestedRuntime", "CLOUD_ONLY");
  }
  const openId = requireTrustedOpenId(runtime.getWxContext);
  const openIdHash = hashPrivateIdentifier(openId);
  return executeWrite({
    runtime,
    action: "identity.bootstrap",
    requestId,
    payload,
    openIdHash,
    principal: null,
    operation: async (transaction, instant) => {
      let user = await transaction.findUserByOpenIdHash(openIdHash);
      if (user === null) {
        assertCreationVersion(payload.expectedVersion);
        user = Object.freeze({
          _id: randomStableId("user"),
          openIdHash,
          accountState: "ACTIVE",
          roles: Object.freeze(["MEMBER"]),
          version: 1,
          createdAt: instant,
          updatedAt: instant
        });
        await transaction.saveUser(user);
      } else {
        if (payload.expectedVersion !== void 0) assertCurrentVersion(payload.expectedVersion, user.version);
        if (user.accountState !== "ACTIVE") {
          throw new SafeApiError(ApiErrorCode.FORBIDDEN, "This account cannot perform the action.", {
            details: { code: ApiErrorCode.FORBIDDEN, policy: "ACTIVE_ACCOUNT_REQUIRED" }
          });
        }
      }
      const profile = await transaction.findProfileByUserId(user._id);
      const data = {
        session: {
          userId: user._id,
          roles: user.roles,
          runtimeMode: runtime.runtimeMode,
          contractVersion: CONTRACT_VERSION,
          profileComplete: profile !== null && profileCompletionPercent(profile) === 100,
          expiresAt: plusMilliseconds(instant, runtime.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS)
        },
        ...profile === null ? {} : { profile: toProfilePrivateDto(profile) }
      };
      return {
        data,
        storedResult: data,
        targetType: "USER",
        targetId: user._id
      };
    },
    replay: async (stored, transaction) => {
      const data = cloneJson(requireStoredObject(stored, ["session"]));
      const user = await transaction.findUserById(data.session.userId);
      if (user === null || user.accountState !== "ACTIVE") {
        throw new SafeApiError(ApiErrorCode.FORBIDDEN, "This account cannot perform the action.", {
          details: { code: ApiErrorCode.FORBIDDEN, policy: "ACTIVE_ACCOUNT_REQUIRED" }
        });
      }
      return data;
    }
  });
}
async function handleProfileGetMine(runtime, payload) {
  assertPayloadKeys(payload, ["contractVersion", "includeCompletion"]);
  if (typeof payload.includeCompletion !== "boolean") {
    invalidRequest("includeCompletion", "BOOLEAN_REQUIRED");
  }
  const principal = await loadPrincipal(runtime);
  const profile = requireProfile(await runtime.store.findProfileByUserId(principal.userId));
  return {
    profile: toProfilePrivateDto(profile),
    completionPercent: profileCompletionPercent(profile)
  };
}
function validateProfileInput(value) {
  if (!isPlainRecord(value)) validation("profile", "OBJECT");
  const allowed = /* @__PURE__ */ new Set(["displayName", "cityId", "biography", "avatarAssetId"]);
  const extra = Object.keys(value).find((key) => !allowed.has(key));
  if (extra !== void 0) invalidRequest(`profile.${extra}`, "UNEXPECTED_FIELD");
  if (typeof value.displayName !== "string") validation("profile.displayName", "STRING");
  const displayName = value.displayName.trim();
  if (displayName.length === 0 || displayName.length > DISPLAY_NAME_MAX) {
    validation("profile.displayName", `TRIMMED_1_TO_${DISPLAY_NAME_MAX}_CHARS`);
  }
  const result = { displayName };
  if (value.cityId !== void 0) {
    if (typeof value.cityId !== "string" || !isKnownCityId(value.cityId)) {
      validation("profile.cityId", "FROZEN_CITY_ID");
    }
    result.cityId = value.cityId;
  }
  if (value.biography !== void 0) {
    if (typeof value.biography !== "string" || value.biography.trim().length > BIOGRAPHY_MAX) {
      validation("profile.biography", `MAX_${BIOGRAPHY_MAX}_CHARS`);
    }
    const biography = value.biography.trim();
    if (biography.length > 0) result.biography = biography;
  }
  if (value.avatarAssetId !== void 0) {
    if (typeof value.avatarAssetId !== "string" || !ASSET_ID_PATTERN.test(value.avatarAssetId)) {
      validation("profile.avatarAssetId", "STABLE_MEDIA_ASSET_ID");
    }
    result.avatarAssetId = value.avatarAssetId;
  }
  return Object.freeze(result);
}
function updatedProfileRecord(current, userId, profile, instant) {
  const record = {
    _id: current?._id ?? randomStableId("profile"),
    userId,
    displayName: profile.displayName,
    visibility: current?.visibility ?? DEFAULT_PROFILE_VISIBILITY,
    requiredProjectionVersion: (current?.version ?? 0) + 1,
    version: (current?.version ?? 0) + 1,
    createdAt: current?.createdAt ?? instant,
    updatedAt: instant
  };
  if (profile.avatarAssetId !== void 0) record.avatarAssetId = profile.avatarAssetId;
  if (profile.cityId !== void 0) record.cityId = profile.cityId;
  if (profile.biography !== void 0) record.biography = profile.biography;
  if (current?.headline !== void 0) record.headline = current.headline;
  if (current?.industry !== void 0) record.industry = current.industry;
  if (current?.company !== void 0) record.company = current.company;
  if (current?.position !== void 0) record.position = current.position;
  if (current?.experience !== void 0) record.experience = Object.freeze([...current.experience]);
  if (current?.interests !== void 0) record.interests = Object.freeze([...current.interests]);
  if (current?.phone !== void 0) record.phone = current.phone;
  if (current?.email !== void 0) record.email = current.email;
  if (current?.governmentId !== void 0) record.governmentId = current.governmentId;
  if (current?.verificationEvidenceUrls !== void 0) {
    record.verificationEvidenceUrls = Object.freeze([...current.verificationEvidenceUrls]);
  }
  if (current?.wechatIdentifiers !== void 0) record.wechatIdentifiers = Object.freeze({ ...current.wechatIdentifiers });
  if (current?.riskControl !== void 0) record.riskControl = Object.freeze({ ...current.riskControl });
  return Object.freeze(record);
}
async function handleProfileUpdateMine(runtime, payload, requestId) {
  assertPayloadKeys(payload, ["contractVersion", "idempotencyKey", "expectedVersion", "profile"]);
  const inputProfile = validateProfileInput(payload.profile);
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId;
  return executeWrite({
    runtime,
    action: "profile.updateMine",
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const current = await transaction.findProfileByUserId(userId);
      if (current === null) assertCreationVersion(payload.expectedVersion);
      else assertCurrentVersion(payload.expectedVersion, current.version);
      const updated = updatedProfileRecord(current, userId, inputProfile, instant);
      await transaction.saveProfile(updated);
      const data = {
        profile: toProfilePrivateDto(updated),
        projectionRefreshRequested: true
      };
      return {
        data,
        storedResult: data,
        targetType: "PROFILE",
        targetId: updated._id
      };
    },
    replay: (stored) => cloneJson(requireStoredObject(stored, ["profile", "projectionRefreshRequested"]))
  });
}
async function handleCardGetMine(runtime, payload) {
  assertPayloadKeys(payload, ["contractVersion", "includePrivatePreview"]);
  if (typeof payload.includePrivatePreview !== "boolean") {
    invalidRequest("includePrivatePreview", "BOOLEAN_REQUIRED");
  }
  const includePrivatePreview = payload.includePrivatePreview;
  const principal = await loadPrincipal(runtime);
  let result;
  try {
    result = await buildCardForViewer({
      reader: runtime.store,
      ownerUserId: principal.userId,
      viewerUserId: principal.userId,
      instant: now(runtime),
      forShare: false,
      ownerMaySeePrivate: includePrivatePreview
    });
  } catch (error) {
    if (error instanceof SafeApiError && error.code === ApiErrorCode.PROJECTION_STALE) {
      throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The card is being refreshed. Please retry.", {
        retryable: true,
        details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "cards_public.projection" }
      });
    }
    throw error;
  }
  return { card: result.card };
}
async function handleCardGetForViewer(runtime, payload) {
  assertPayloadKeys(payload, ["contractVersion", "ownerUserId"]);
  const ownerUserId = asUserId(requireStableString(payload.ownerUserId, "ownerUserId"));
  const principal = await loadPrincipal(runtime);
  const result = await buildCardForViewer({
    reader: runtime.store,
    ownerUserId,
    viewerUserId: principal.userId,
    instant: now(runtime),
    forShare: false
  });
  return {
    card: result.card,
    relationship: result.relationship,
    claims: result.card.claims
  };
}
async function handleCardRefreshProjection(runtime, payload, requestId) {
  assertPayloadKeys(payload, ["contractVersion", "idempotencyKey", "expectedVersion", "reason"]);
  const reasons = ["PROFILE_CHANGED", "RELATIONSHIP_CHANGED", "VERIFICATION_CHANGED", "MANUAL_REPAIR"];
  if (typeof payload.reason !== "string" || !reasons.includes(payload.reason)) {
    validation("reason", "FROZEN_REFRESH_REASON");
  }
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId;
  return executeWrite({
    runtime,
    action: "card.refreshProjection",
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const profile = requireProfile(await transaction.findProfileByUserId(userId));
      assertCurrentVersion(payload.expectedVersion, profile.version);
      const previous = await transaction.findCardByOwnerUserId(userId);
      const claims = selectEffectiveClaims(
        await transaction.listVerificationClaims(userId),
        userId,
        instant
      );
      const publicSelection = selectVisibleProfileFields(profile, "STRANGER");
      const avatarUrl = publicSelection.avatarAssetId === void 0 ? void 0 : await transaction.findApprovedMediaUrl(publicSelection.avatarAssetId) ?? void 0;
      const card = buildPublicCardRecord({
        profile,
        previous,
        claims,
        ...avatarUrl === void 0 ? {} : { avatarUrl },
        now: instant
      });
      await transaction.saveCard(card);
      const data = {
        card: toPublicCardProjection(card, claims),
        refreshedFromVersion: profile.version
      };
      return {
        data,
        storedResult: data,
        targetType: "CARD",
        targetId: card.cardId
      };
    },
    replay: (stored) => cloneJson(requireStoredObject(stored, ["card", "refreshedFromVersion"]))
  });
}
function validateTarget(payload) {
  if (payload.targetType !== "CARD" && payload.targetType !== "EVENT") {
    validation("targetType", "CARD_OR_EVENT");
  }
  return {
    targetType: payload.targetType,
    targetId: requireStableString(payload.targetId, "targetId")
  };
}
function validateExpiry(value, instant, defaultTtlMs) {
  const expiresAt = value === void 0 ? plusMilliseconds(instant, defaultTtlMs) : requireUtc2(value, "expiresAt");
  const ttl = Date.parse(expiresAt) - Date.parse(instant);
  if (ttl <= 0 || ttl > MAX_SHARE_TTL_MS) validation("expiresAt", "FUTURE_WITHIN_30_DAYS");
  return expiresAt;
}
async function replayShareCreate(runtime, stored, reader) {
  const record = requireStoredObject(stored, ["shareTokenId", "targetType", "targetId", "expiresAt"]);
  if (record.targetType !== "CARD" && record.targetType !== "EVENT") {
    throw new Error("Stored share target type is malformed");
  }
  const shareTokenId = requireStableString(record.shareTokenId, "stored.shareTokenId");
  const token = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
  const share = await reader.findShareById(shareTokenId);
  if (share === null || !isStoredShareWellFormed(share) || share.targetType !== record.targetType || share.targetId !== record.targetId || share.tokenDigest !== hashShareToken(token)) {
    throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The share signing key is unavailable.", {
      retryable: false,
      details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "SHARE_TOKEN_SIGNING_KEY" }
    });
  }
  return {
    shareTokenId,
    token,
    targetType: record.targetType,
    targetId: requireStableString(record.targetId, "stored.targetId"),
    expiresAt: requireUtc2(record.expiresAt, "stored.expiresAt")
  };
}
async function handleShareCreate(runtime, payload, requestId) {
  assertPayloadKeys(payload, [
    "contractVersion",
    "idempotencyKey",
    "expectedVersion",
    "targetType",
    "targetId",
    "expiresAt"
  ]);
  const target = validateTarget(payload);
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId;
  const allowedFields = validateShareAllowedFields(
    runtime.defaultShareAllowedFields ?? DEFAULT_SHARE_ALLOWED_FIELDS
  );
  return executeWrite({
    runtime,
    action: "share.create",
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const targetVersion = await assertTargetOwnedBy(
        transaction,
        target.targetType,
        target.targetId,
        userId
      );
      assertCurrentVersion(payload.expectedVersion, targetVersion);
      const expiresAt = validateExpiry(
        payload.expiresAt,
        instant,
        runtime.defaultShareTtlMs ?? DEFAULT_SHARE_TTL_MS
      );
      const shareTokenId = randomStableId("share", 24);
      const token = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
      const share = Object.freeze({
        _id: shareTokenId,
        ownerUserId: userId,
        targetType: target.targetType,
        targetId: target.targetId,
        tokenDigest: hashShareToken(token),
        purpose: "WECHAT_FORWARD",
        allowedFields,
        expiresAt,
        revoked: false,
        version: 1,
        createdAt: instant,
        updatedAt: instant
      });
      await transaction.saveShare(share);
      const data = {
        shareTokenId,
        token,
        targetType: target.targetType,
        targetId: target.targetId,
        expiresAt
      };
      return {
        data,
        storedResult: {
          shareTokenId,
          targetType: target.targetType,
          targetId: target.targetId,
          expiresAt
        },
        targetType: "SHARE_TOKEN",
        targetId: shareTokenId
      };
    },
    replay: (stored, transaction) => replayShareCreate(runtime, stored, transaction)
  });
}
async function resolveShareRecord(runtime, payload) {
  const hasToken = payload.token !== void 0;
  const hasScene = payload.scene !== void 0;
  if (hasToken === hasScene) invalidRequest("payload", "EXACTLY_ONE_OF_TOKEN_OR_SCENE");
  if (hasToken) {
    if (!isValidShareToken(payload.token)) tokenInvalid();
    const presentedDigest2 = hashShareToken(payload.token);
    const share2 = await runtime.store.findShareByTokenDigest(presentedDigest2);
    if (share2 === null || share2.tokenDigest !== presentedDigest2) tokenInvalid();
    return share2;
  }
  if (!isValidQrScene(payload.scene)) tokenInvalid();
  const presentedDigest = hashShareToken(payload.scene);
  const share = await runtime.store.findShareByTokenDigest(presentedDigest);
  if (share === null || share.tokenDigest !== presentedDigest) tokenInvalid();
  return share;
}
async function resolveEventShare(runtime, share, instant, viewer) {
  const eventId = share.targetId;
  const [event, eventOwnerUserId] = await Promise.all([
    runtime.store.findPublicEvent(eventId),
    runtime.store.findEventShareOwnerUserId(eventId)
  ]);
  if (event === null || eventOwnerUserId !== share.ownerUserId) tokenInvalid("EVENT_SHARE");
  const parsed = parseReadOnlyProjection("PublicEventProjection", event);
  if (parsed.state !== EventState.PUBLISHED || parsed.publicationState !== PublicationState.PUBLISHED) {
    tokenInvalid("EVENT_SHARE");
  }
  const owner = await runtime.store.findUserById(share.ownerUserId);
  if (owner === null || owner.accountState !== "ACTIVE") tokenInvalid("EVENT_SHARE");
  if (viewer?.userId !== void 0) {
    const relationship = await loadRelationship(runtime.store, viewer.userId, share.ownerUserId, instant);
    assertNotBlocked(relationship, true);
  }
  return parsed;
}
async function handleShareResolve(runtime, payload) {
  assertPayloadKeys(payload, ["contractVersion", "token", "scene"]);
  const instant = now(runtime);
  const share = await resolveShareRecord(runtime, payload);
  assertShareUsable(share, instant);
  const viewer = await loadOptionalPrincipal(runtime);
  let resolution;
  if (share.targetType === "CARD") {
    const cardRecord = await runtime.store.findCardById(share.targetId);
    if (cardRecord === null || cardRecord.ownerUserId !== share.ownerUserId) tokenInvalid();
    const viewerUserId = viewer?.userId ?? randomStableId("anonymous");
    let result;
    try {
      result = await buildCardForViewer({
        reader: runtime.store,
        ownerUserId: cardRecord.ownerUserId,
        viewerUserId,
        instant,
        forShare: true,
        allowedFields: share.allowedFields
      });
    } catch (error) {
      if (error instanceof SafeApiError && error.code === ApiErrorCode.PROJECTION_STALE) {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The shared card is being refreshed. Please retry.", {
          retryable: true,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "cards_public.projection" }
        });
      }
      throw error;
    }
    resolution = {
      tokenId: share._id,
      targetType: "CARD",
      targetId: share.targetId,
      card: result.card,
      resolvedAt: instant,
      expiresAt: share.expiresAt,
      revoked: false
    };
  } else {
    const event = await resolveEventShare(runtime, share, instant, viewer);
    resolution = {
      tokenId: share._id,
      targetType: "EVENT",
      targetId: share.targetId,
      event,
      resolvedAt: instant,
      expiresAt: share.expiresAt,
      revoked: false
    };
  }
  return { resolution };
}
async function loadShareTargetVersion(reader, share) {
  return currentTargetVersion(reader, share.targetType, share.targetId);
}
async function handleShareRevoke(runtime, payload, requestId) {
  assertPayloadKeys(payload, ["contractVersion", "idempotencyKey", "expectedVersion", "shareTokenId"]);
  const shareTokenId = requireStableString(payload.shareTokenId, "shareTokenId");
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId;
  return executeWrite({
    runtime,
    action: "share.revoke",
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const share = await transaction.findShareById(shareTokenId);
      if (share === null) notFound("SHARE_TOKEN", shareTokenId);
      if (!isStoredShareWellFormed(share)) throw new Error("Stored share record is malformed");
      if (share.ownerUserId !== userId) {
        throw new SafeApiError(ApiErrorCode.FORBIDDEN, "Only the share owner may revoke it.", {
          details: { code: ApiErrorCode.FORBIDDEN, policy: "SHARE_OWNER_REQUIRED" }
        });
      }
      assertCurrentVersion(payload.expectedVersion, await loadShareTargetVersion(transaction, share));
      const revokedAt = share.revokedAt ?? instant;
      if (!share.revoked) {
        await transaction.saveShare(Object.freeze({
          ...share,
          revoked: true,
          revokedAt,
          version: share.version + 1,
          updatedAt: instant
        }));
      }
      const data = { shareTokenId, revokedAt };
      return {
        data,
        storedResult: data,
        targetType: "SHARE_TOKEN",
        targetId: shareTokenId
      };
    },
    replay: (stored) => cloneJson(requireStoredObject(stored, ["shareTokenId", "revokedAt"]))
  });
}
function qrPageForTarget(targetType) {
  return targetType === "CARD" ? "pages/card-share/index" : "pages/event-share/index";
}
async function replayQrScene(runtime, stored, reader) {
  const record = requireStoredObject(stored, [
    "shareTokenId",
    "targetType",
    "page",
    "qrAssetId"
  ]);
  if (record.targetType !== "CARD" && record.targetType !== "EVENT" || typeof record.shareTokenId !== "string" || !STABLE_ID_PATTERN.test(record.shareTokenId) || record.page !== qrPageForTarget(record.targetType) || typeof record.qrAssetId !== "string" || !STABLE_ID_PATTERN.test(record.qrAssetId)) {
    throw new Error("Stored QR idempotency result is malformed");
  }
  const shareTokenId = record.shareTokenId;
  const share = await reader.findShareById(shareTokenId);
  const scene = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
  if (share === null || !isStoredShareWellFormed(share) || share.targetType !== record.targetType || share.tokenDigest !== hashShareToken(scene) || !isValidQrScene(scene)) {
    throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The share signing key is unavailable.", {
      retryable: false,
      details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "SHARE_TOKEN_SIGNING_KEY" }
    });
  }
  return {
    shareTokenId,
    targetType: record.targetType,
    page: record.page,
    scene,
    qrAssetId: record.qrAssetId
  };
}
async function handleShareCreateQrScene(runtime, payload, requestId) {
  assertPayloadKeys(payload, [
    "contractVersion",
    "idempotencyKey",
    "expectedVersion",
    "shareTokenId",
    "targetType",
    "page"
  ]);
  const shareTokenId = requireStableString(payload.shareTokenId, "shareTokenId");
  if (payload.targetType !== "CARD" && payload.targetType !== "EVENT") {
    validation("targetType", "CARD_OR_EVENT");
  }
  const expectedPage = qrPageForTarget(payload.targetType);
  if (payload.page !== expectedPage) validation("page", "TARGET_MATCHING_COLD_START_PAGE");
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId;
  return executeWrite({
    runtime,
    action: "share.createQrScene",
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const share = await transaction.findShareById(shareTokenId);
      if (share === null) notFound("SHARE_TOKEN", shareTokenId);
      if (!isStoredShareWellFormed(share)) throw new Error("Stored share record is malformed");
      if (share.ownerUserId !== userId) {
        throw new SafeApiError(ApiErrorCode.FORBIDDEN, "Only the share owner may create its QR scene.", {
          details: { code: ApiErrorCode.FORBIDDEN, policy: "SHARE_OWNER_REQUIRED" }
        });
      }
      if (share.targetType !== payload.targetType) validation("targetType", "MUST_MATCH_SHARE_TARGET");
      if (share.revoked || Date.parse(share.expiresAt) <= Date.parse(instant)) {
        throw new SafeApiError(ApiErrorCode.CONFLICT, "The share is no longer available for QR generation.", {
          details: { code: ApiErrorCode.CONFLICT, conflictType: "SHARE_NOT_ACTIVE" }
        });
      }
      assertCurrentVersion(payload.expectedVersion, await loadShareTargetVersion(transaction, share));
      const scene = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
      if (!isValidQrScene(scene)) throw new Error("Generated share ID is not a safe QR scene");
      if (hashShareToken(scene) !== share.tokenDigest) {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The share signing key is unavailable.", {
          retryable: false,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "SHARE_TOKEN_SIGNING_KEY" }
        });
      }
      let generated;
      try {
        generated = await runtime.qrCode.generate({
          operationKey: `qr:${shareTokenId}:${payload.idempotencyKey}`,
          page: expectedPage,
          scene
        });
      } catch {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The mini program code could not be generated. Please retry.", {
          retryable: true,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "WECHAT_QR_CODE" }
        });
      }
      if (typeof generated.storageFileId !== "string" || generated.storageFileId.length === 0 || generated.storageFileId.includes(scene)) {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, "The mini program code could not be generated. Please retry.", {
          retryable: true,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: "WECHAT_QR_CODE" }
        });
      }
      const qrAssetId = randomStableId("media_qr");
      const media = Object.freeze({
        _id: qrAssetId,
        ownerUserId: userId,
        domain: payload.targetType === "CARD" ? "CARD_SHARE" : "EVENT_SHARE",
        storageFileId: generated.storageFileId,
        rights: Object.freeze({
          state: "CLAIMED",
          rightsHolderName: "AB Club member generated share code",
          sourceDescription: "Generated by the trusted WeChat mini program code service.",
          permittedUses: Object.freeze(["SHARE"])
        }),
        publicState: "PRIVATE",
        version: 1,
        createdAt: instant,
        updatedAt: instant
      });
      await transaction.saveQrMedia(media);
      const data = {
        shareTokenId,
        targetType: payload.targetType,
        page: expectedPage,
        scene,
        qrAssetId
      };
      return {
        data,
        storedResult: {
          shareTokenId,
          targetType: payload.targetType,
          page: expectedPage,
          qrAssetId
        },
        targetType: "MEDIA_ASSET",
        targetId: qrAssetId
      };
    },
    replay: (stored, transaction) => replayQrScene(runtime, stored, transaction)
  });
}
async function dispatch(runtime, action, payload, requestId) {
  switch (action) {
    case "identity.bootstrap":
      return handleBootstrap(runtime, payload, requestId);
    case "profile.getMine":
      return handleProfileGetMine(runtime, payload);
    case "profile.updateMine":
      return handleProfileUpdateMine(runtime, payload, requestId);
    case "card.getMine":
      return handleCardGetMine(runtime, payload);
    case "card.getForViewer":
      return handleCardGetForViewer(runtime, payload);
    case "card.refreshProjection":
      return handleCardRefreshProjection(runtime, payload, requestId);
    case "share.create":
      return handleShareCreate(runtime, payload, requestId);
    case "share.resolve":
      return handleShareResolve(runtime, payload);
    case "share.revoke":
      return handleShareRevoke(runtime, payload, requestId);
    case "share.createQrScene":
      return handleShareCreateQrScene(runtime, payload, requestId);
  }
}
function createIdentityEndpoint(runtime) {
  requireRuntime(runtime);
  const writeGuardPlans = {};
  IDENTITY_WRITE_ACTIONS.forEach((action) => {
    writeGuardPlans[action] = defineWriteGuardPlan(action);
  });
  return Object.freeze({
    actions: Object.freeze([...IDENTITY_ACTIONS]),
    writeGuardPlans: Object.freeze({ ...writeGuardPlans }),
    main: async (event) => {
      const fallbackRequestId = responseRequestId2(event);
      try {
        const request = validateCallEnvelope(event, IDENTITY_ACTIONS);
        const requestId = request.requestId;
        const data = await dispatch(runtime, request.action, request.payload, requestId);
        return success(requestId, data);
      } catch (error) {
        return safeFailureFromError(
          fallbackRequestId,
          error instanceof Error ? error : new Error("Non-error thrown at identityApi boundary")
        );
      }
    }
  });
}
var import_node_crypto4, IDENTITY_ACTIONS, IDENTITY_WRITE_ACTIONS, CONTRACT_VERSION, IDEMPOTENCY_TTL_MS, DEFAULT_SHARE_TTL_MS, MAX_SHARE_TTL_MS, DEFAULT_SESSION_TTL_MS, DISPLAY_NAME_MAX, BIOGRAPHY_MAX, ASSET_ID_PATTERN, STABLE_ID_PATTERN, UTC_PATTERN2, IDENTITY_RUNTIME_MODES;
var init_service = __esm({
  "cloudfunctions/identityApi/service.ts"() {
    import_node_crypto4 = require("node:crypto");
    init_api();
    init_enums();
    init_auth();
    init_audit();
    init_errors();
    init_idempotency();
    init_projections();
    init_validation();
    init_domain();
    IDENTITY_ACTIONS = [
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
    ];
    IDENTITY_WRITE_ACTIONS = [
      "identity.bootstrap",
      "profile.updateMine",
      "card.refreshProjection",
      "share.create",
      "share.revoke",
      "share.createQrScene"
    ];
    CONTRACT_VERSION = "1.0.0";
    IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1e3;
    DEFAULT_SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
    MAX_SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
    DEFAULT_SESSION_TTL_MS = 60 * 60 * 1e3;
    DISPLAY_NAME_MAX = 80;
    BIOGRAPHY_MAX = 500;
    ASSET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
    UTC_PATTERN2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
    IDENTITY_RUNTIME_MODES = Object.freeze([
      RuntimeMode.LIVE,
      RuntimeMode.DEGRADED,
      RuntimeMode.OFFLINE_DEMO
    ]);
  }
});

// cloudfunctions/identityApi/index.ts
var identityApi_exports = {};
__export(identityApi_exports, {
  ACTIONS: () => ACTIONS,
  DEFAULT_PROFILE_VISIBILITY: () => DEFAULT_PROFILE_VISIBILITY2,
  DEFAULT_SHARE_ALLOWED_FIELDS: () => DEFAULT_SHARE_ALLOWED_FIELDS2,
  IDENTITY_RUNTIME_MODES: () => IDENTITY_RUNTIME_MODES2,
  PERMANENTLY_PRIVATE_FIELD_KEYS: () => PERMANENTLY_PRIVATE_FIELD_KEYS2,
  PROFILE_FIELD_KEYS: () => PROFILE_FIELD_KEYS2,
  SHARE_ALLOWED_FIELD_KEYS: () => SHARE_ALLOWED_FIELD_KEYS2,
  WRITE_ACTIONS: () => WRITE_ACTIONS,
  createIdentityEndpoint: () => createIdentityEndpoint2,
  endpoint: () => endpoint,
  hashPrivateIdentifier: () => hashPrivateIdentifier2,
  hashShareToken: () => hashShareToken2,
  main: () => main,
  selectVisibleProfileFields: () => selectVisibleProfileFields2,
  validateProfileVisibility: () => validateProfileVisibility2
});
module.exports = __toCommonJS(identityApi_exports);

// miniprogram/shared/contracts/action-map.ts
var CLOUD_ACTIONS_BY_FUNCTION = {
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

// miniprogram/shared/contracts/action-registry.ts
init_api();
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

// miniprogram/shared/contracts/index.ts
init_api();
init_enums();

// cloudfunctions/_shared/errors/envelope.ts
var import_node_crypto = require("node:crypto");
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

// cloudfunctions/identityApi/index.ts
var IdentityDomain = (init_domain(), __toCommonJS(domain_exports));
var IdentityRuntime = (init_service(), __toCommonJS(service_exports));
var ACTIONS = CLOUD_ACTIONS_BY_FUNCTION.identityApi;
var WRITE_ACTIONS = IdentityRuntime.IDENTITY_WRITE_ACTIONS;
var endpoint = createNotImplementedEndpoint("identityApi", ACTIONS);
var main = endpoint.main;
var createIdentityEndpoint2 = IdentityRuntime.createIdentityEndpoint;
var IDENTITY_RUNTIME_MODES2 = IdentityRuntime.IDENTITY_RUNTIME_MODES;
var DEFAULT_PROFILE_VISIBILITY2 = IdentityDomain.DEFAULT_PROFILE_VISIBILITY;
var DEFAULT_SHARE_ALLOWED_FIELDS2 = IdentityDomain.DEFAULT_SHARE_ALLOWED_FIELDS;
var PROFILE_FIELD_KEYS2 = IdentityDomain.PROFILE_FIELD_KEYS;
var PERMANENTLY_PRIVATE_FIELD_KEYS2 = IdentityDomain.PERMANENTLY_PRIVATE_FIELD_KEYS;
var SHARE_ALLOWED_FIELD_KEYS2 = IdentityDomain.SHARE_ALLOWED_FIELD_KEYS;
var hashPrivateIdentifier2 = IdentityDomain.hashPrivateIdentifier;
var hashShareToken2 = IdentityDomain.hashShareToken;
var selectVisibleProfileFields2 = IdentityDomain.selectVisibleProfileFields;
var validateProfileVisibility2 = IdentityDomain.validateProfileVisibility;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  DEFAULT_PROFILE_VISIBILITY,
  DEFAULT_SHARE_ALLOWED_FIELDS,
  IDENTITY_RUNTIME_MODES,
  PERMANENTLY_PRIVATE_FIELD_KEYS,
  PROFILE_FIELD_KEYS,
  SHARE_ALLOWED_FIELD_KEYS,
  WRITE_ACTIONS,
  createIdentityEndpoint,
  endpoint,
  hashPrivateIdentifier,
  hashShareToken,
  main,
  selectVisibleProfileFields,
  validateProfileVisibility
});
