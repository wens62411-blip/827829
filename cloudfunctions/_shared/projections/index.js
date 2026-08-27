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

// cloudfunctions/_shared/projections/index.ts
var projections_exports = {};
__export(projections_exports, {
  appendProjectionInvalidation: () => appendProjectionInvalidation,
  assertProjectionReadable: () => assertProjectionReadable,
  assertVerificationClaimEffective: () => assertVerificationClaimEffective,
  createProjectionInvalidation: () => createProjectionInvalidation,
  markProjectionDirty: () => markProjectionDirty,
  parseReadOnlyProjection: () => parseReadOnlyProjection,
  revokeAccessAndInvalidateAtomically: () => revokeAccessAndInvalidateAtomically
});
module.exports = __toCommonJS(projections_exports);

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

// cloudfunctions/_shared/validation/index.ts
function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

// cloudfunctions/_shared/projections/index.ts
var UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
var STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
var SHA256_PATTERN = /^[a-f0-9]{64}$/;
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
function hasExactFields(record, fields) {
  const actual = Object.keys(record).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length && actual.every((field, index) => field === expected[index]);
}
function isRevokedMediaRights(value) {
  if (!isPlainRecord(value)) return false;
  const hasRequiredFields = hasExactFields(value, [
    "state",
    "rightsHolderName",
    "sourceDescription",
    "permittedUses",
    "reviewedAt"
  ]);
  const hasRequiredFieldsAndDigest = hasExactFields(value, [
    "state",
    "rightsHolderName",
    "sourceDescription",
    "permittedUses",
    "reviewedAt",
    "evidenceDigest"
  ]);
  if (!hasRequiredFields && !hasRequiredFieldsAndDigest) return false;
  if (typeof value.state !== "string" || !MEDIA_REVOCATION_STATES.includes(value.state)) return false;
  if (typeof value.rightsHolderName !== "string" || value.rightsHolderName.length === 0) return false;
  if (typeof value.sourceDescription !== "string" || value.sourceDescription.length === 0) return false;
  if (!Array.isArray(value.permittedUses) || value.permittedUses.length !== 0) return false;
  if (typeof value.reviewedAt !== "string" || !UTC_PATTERN.test(value.reviewedAt) || Number.isNaN(Date.parse(value.reviewedAt))) return false;
  return value.evidenceDigest === void 0 || typeof value.evidenceDigest === "string" && SHA256_PATTERN.test(value.evidenceDigest);
}
function validateRevocationPolicy(kind, collection, patch) {
  let collectionAllowed = false;
  let patchAllowed = false;
  switch (kind) {
    case ProjectionInvalidationKind.RELATIONSHIP_CHANGED:
      if (collection === "friendships") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "state"]) && typeof patch.state === "string" && RELATIONSHIP_REVOCATION_STATES.includes(patch.state);
      } else if (collection === "blocks_reports") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "recordType", "state"]) && patch.recordType === "BLOCK" && patch.state === "ACTIVE";
      }
      break;
    case ProjectionInvalidationKind.VERIFICATION_CHANGED:
      if (collection === "verification_requests") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "status"]) && typeof patch.status === "string" && VERIFICATION_REVOCATION_STATES.includes(patch.status);
      } else if (collection === "verification_claims") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "reviewStatus", "publicVisible"]) && typeof patch.reviewStatus === "string" && VERIFICATION_REVOCATION_STATES.includes(patch.reviewStatus) && patch.publicVisible === false;
      }
      break;
    case ProjectionInvalidationKind.EVENT_CHANGED:
      if (collection === "events") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "state", "reservationAvailable"]) && typeof patch.state === "string" && EVENT_REVOCATION_STATES.includes(patch.state) && patch.reservationAvailable === false;
      } else if (collection === "organizers") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "reviewStatus"]) && typeof patch.reviewStatus === "string" && VERIFICATION_REVOCATION_STATES.includes(patch.reviewStatus);
      } else if (collection === "club_nodes") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "operationalState"]) && (patch.operationalState === OperationalState.PAUSED || patch.operationalState === OperationalState.DISABLED) || hasExactFields(patch, ["version", "reviewStatus"]) && typeof patch.reviewStatus === "string" && VERIFICATION_REVOCATION_STATES.includes(patch.reviewStatus);
      }
      break;
    case ProjectionInvalidationKind.CONTENT_CHANGED:
      if (collection === "art_items" || collection === "art_collections") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "publicationState"]) && typeof patch.publicationState === "string" && CONTENT_REVOCATION_STATES.includes(patch.publicationState);
      }
      break;
    case ProjectionInvalidationKind.MEDIA_RIGHTS_CHANGED:
      if (collection === "media_assets") {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ["version", "rights"]) && isRevokedMediaRights(patch.rights);
      }
      break;
  }
  if (!collectionAllowed) throw new Error("Source collection is not allowed for invalidation kind");
  if (!patchAllowed) throw new Error("Revocation patch does not match the exact shape for invalidation kind");
}
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
function markProjectionDirty(invalidation) {
  return Object.freeze({
    dirty: true,
    invalidationEventId: invalidation.eventId,
    requiredSourceVersion: invalidation.sourceVersion,
    dirtySince: invalidation.occurredAt
  });
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
async function appendProjectionInvalidation(writer, invalidation) {
  const result = await writer.add({ data: invalidation });
  return result.id;
}
async function revokeAccessAndInvalidateAtomically(runner, input) {
  if (typeof runner.runTransaction !== "function") {
    throw new Error("A real transaction runner is required");
  }
  if (!isPlainRecord(input)) throw new Error("Invalid revocation input");
  rejectUnexpectedFields(input, ["kind", "source", "invalidation"], "ProjectionRevocationInput");
  const { kind, source, invalidation } = input;
  if (!isPlainRecord(source)) throw new Error("Invalid revocation source");
  rejectUnexpectedFields(source, ["collection", "aggregateId", "expectedVersion", "patch"], "ProjectionRevocationSource");
  if (!isPlainRecord(invalidation)) throw new Error("Invalid projection invalidation");
  rejectUnexpectedFields(invalidation, [
    "eventId",
    "kind",
    "sourceAggregateId",
    "sourceVersion",
    "occurredAt",
    "reason",
    "requestId"
  ], "ProjectionInvalidation");
  if (kind !== invalidation.kind) throw new Error("Input kind must equal invalidation kind");
  const validatedInvalidation = createProjectionInvalidation({
    eventId: invalidation.eventId,
    kind: invalidation.kind,
    sourceAggregateId: invalidation.sourceAggregateId,
    sourceVersion: invalidation.sourceVersion,
    occurredAt: invalidation.occurredAt,
    reason: invalidation.reason,
    requestId: invalidation.requestId
  });
  if (source.aggregateId !== validatedInvalidation.sourceAggregateId) {
    throw new Error("Revocation source and invalidation must reference the same aggregate");
  }
  if (!Number.isSafeInteger(source.expectedVersion) || source.expectedVersion < 1) {
    throw new Error("expectedVersion must be a positive safe integer");
  }
  if (!isPlainRecord(source.patch)) throw new Error("Invalid revocation patch");
  const patch = source.patch;
  validateRevocationPolicy(kind, source.collection, patch);
  const patchVersion = patch.version;
  if (!Number.isSafeInteger(patchVersion) || patchVersion !== source.expectedVersion + 1 || validatedInvalidation.sourceVersion !== patchVersion) {
    throw new Error("Revocation and invalidation versions must equal expectedVersion + 1");
  }
  return runner.runTransaction(async (transaction) => {
    if (typeof transaction.updateSource !== "function" || typeof transaction.appendInvalidation !== "function") {
      throw new Error("Invalid projection transaction capability");
    }
    await transaction.updateSource(source);
    const result = await transaction.appendInvalidation(validatedInvalidation);
    return result.id;
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appendProjectionInvalidation,
  assertProjectionReadable,
  assertVerificationClaimEffective,
  createProjectionInvalidation,
  markProjectionDirty,
  parseReadOnlyProjection,
  revokeAccessAndInvalidateAtomically
});
