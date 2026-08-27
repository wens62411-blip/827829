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

// cloudfunctions/_shared/auth/index.ts
var auth_exports = {};
__export(auth_exports, {
  asUserId: () => asUserId,
  requireTrustedOpenId: () => requireTrustedOpenId,
  requireTrustedPrincipal: () => requireTrustedPrincipal
});
module.exports = __toCommonJS(auth_exports);

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
function asUserId(value) {
  return value;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  asUserId,
  requireTrustedOpenId,
  requireTrustedPrincipal
});
