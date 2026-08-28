import type {
  CloudAction,
  CloudActionData,
  CloudActionPayload,
} from '../contracts/action-map';
import { CLOUD_ACTION_REGISTRY } from '../contracts/action-registry';
import {
  ApiErrorCode,
  type ApiErrorCode as ApiErrorCodeValue,
  type ApiResult,
} from '../types/api';
import type { RequestId } from '../types/primitives';
import { assertLiveCloudConfigured } from './runtime';

export interface CloudCallEvidence<Action extends CloudAction> {
  readonly action: Action;
  readonly platformRequestId: string | undefined;
  readonly apiResult: ApiResult<CloudActionData<Action>>;
}

interface PlatformCallFunctionResult extends ICloud.CallFunctionResult {
  readonly requestID?: string;
}

interface ApiEnvelopeCandidate {
  readonly ok?: boolean;
  readonly data?: object | null;
  readonly error?: object | null;
  readonly requestId?: string;
}

interface ApiErrorCandidate {
  readonly code?: string;
  readonly message?: string;
  readonly retryable?: boolean;
  readonly details?: object | null;
}

interface ValidationIssueCandidate {
  readonly field?: string;
  readonly rule?: string;
}

interface ErrorDetailsCandidate {
  readonly code?: string;
  readonly action?: string;
  readonly contractVersion?: string;
  readonly field?: string;
  readonly reason?: string;
  readonly issues?: readonly object[];
  readonly required?: boolean;
  readonly expiredAt?: string;
  readonly policy?: string;
  readonly requiredRoles?: readonly string[];
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly existingId?: string;
  readonly conflictType?: string;
  readonly expectedVersion?: number;
  readonly currentVersion?: number;
  readonly firstRequestId?: string;
  readonly retryAfterSeconds?: number;
  readonly service?: string;
  readonly incidentId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly missingEvidenceKinds?: readonly string[];
  readonly feature?: string;
  readonly blocksAccess?: boolean;
  readonly missingLabelIds?: readonly string[];
  readonly eventState?: string;
  readonly eventId?: string;
  readonly featureFlag?: string;
  readonly mediaAssetIds?: readonly string[];
  readonly tokenKind?: string;
  readonly revokedAt?: string;
  readonly projectionType?: string;
  readonly requiredSourceVersion?: number;
}

function isPlainObject(
  value: object | string | number | boolean | null | undefined,
): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: object, allowedKeys: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.every((key) => allowedKeys.includes(key));
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: string | undefined): boolean {
  return value === undefined || typeof value === 'string';
}

function isStringArray(value: readonly string[] | undefined, requireItem = false): boolean {
  return Array.isArray(value) && (!requireItem || value.length > 0) && value.every(isNonEmptyString);
}

function isPositiveVersion(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isUtcInstant(value: string | undefined): boolean {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function hasCodeAndKeys(
  details: object,
  candidate: ErrorDetailsCandidate,
  code: ApiErrorCodeValue,
  keys: readonly string[],
): boolean {
  return candidate.code === code && hasExactKeys(details, ['code', ...keys]);
}

function isValidationIssues(value: readonly object[] | undefined): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((issue) => {
      if (!isPlainObject(issue)) return false;
      const candidate = issue as ValidationIssueCandidate;
      return (
        hasExactKeys(issue, ['field', 'rule']) &&
        isNonEmptyString(candidate.field) &&
        isNonEmptyString(candidate.rule)
      );
    })
  );
}

function isSafeErrorDetails(
  code: ApiErrorCodeValue,
  details: object,
  action: CloudAction,
): boolean {
  const value = details as ErrorDetailsCandidate;
  switch (code) {
    case ApiErrorCode.NOT_IMPLEMENTED:
      return hasCodeAndKeys(details, value, code, ['action', 'contractVersion']) &&
        value.action === action && value.contractVersion === '1.0.0';
    case ApiErrorCode.INVALID_REQUEST:
      return hasCodeAndKeys(details, value, code, ['field', 'reason']) &&
        isOptionalString(value.field) && isNonEmptyString(value.reason);
    case ApiErrorCode.VALIDATION_FAILED:
      return hasCodeAndKeys(details, value, code, ['issues']) && isValidationIssues(value.issues);
    case ApiErrorCode.AUTH_REQUIRED:
      return hasCodeAndKeys(details, value, code, ['required']) && value.required === true;
    case ApiErrorCode.SESSION_EXPIRED:
      return hasCodeAndKeys(details, value, code, ['expiredAt']) &&
        (value.expiredAt === undefined || isUtcInstant(value.expiredAt));
    case ApiErrorCode.FORBIDDEN:
      return hasCodeAndKeys(details, value, code, ['policy']) && isNonEmptyString(value.policy);
    case ApiErrorCode.ROLE_REQUIRED:
      return hasCodeAndKeys(details, value, code, ['requiredRoles']) &&
        isStringArray(value.requiredRoles, true) &&
        value.requiredRoles!.every((role) => ['ORGANIZER', 'REVIEWER', 'ADMIN'].includes(role));
    case ApiErrorCode.NOT_FOUND:
      return hasCodeAndKeys(details, value, code, ['resourceType', 'resourceId']) &&
        isNonEmptyString(value.resourceType) && isOptionalString(value.resourceId);
    case ApiErrorCode.ALREADY_EXISTS:
      return hasCodeAndKeys(details, value, code, ['resourceType', 'existingId']) &&
        isNonEmptyString(value.resourceType) && isOptionalString(value.existingId);
    case ApiErrorCode.CONFLICT:
      return hasCodeAndKeys(details, value, code, ['conflictType']) && isNonEmptyString(value.conflictType);
    case ApiErrorCode.VERSION_CONFLICT:
      return hasCodeAndKeys(details, value, code, ['expectedVersion', 'currentVersion']) &&
        isPositiveVersion(value.expectedVersion) && isPositiveVersion(value.currentVersion);
    case ApiErrorCode.IDEMPOTENCY_CONFLICT:
      return hasCodeAndKeys(details, value, code, ['firstRequestId']) && isNonEmptyString(value.firstRequestId);
    case ApiErrorCode.INVALID_CURSOR:
      return hasCodeAndKeys(details, value, code, ['reason']) &&
        value.reason !== undefined && ['MALFORMED', 'EXPIRED', 'FILTER_MISMATCH'].includes(value.reason);
    case ApiErrorCode.RATE_LIMITED:
      return hasCodeAndKeys(details, value, code, ['retryAfterSeconds']) &&
        typeof value.retryAfterSeconds === 'number' &&
        Number.isFinite(value.retryAfterSeconds) &&
        value.retryAfterSeconds >= 0;
    case ApiErrorCode.SERVICE_UNAVAILABLE:
      return hasCodeAndKeys(details, value, code, ['service']) && isNonEmptyString(value.service);
    case ApiErrorCode.INTERNAL_ERROR:
      return hasCodeAndKeys(details, value, code, ['incidentId']) && isNonEmptyString(value.incidentId);
    case ApiErrorCode.REVIEW_INVALID_TRANSITION:
      return hasCodeAndKeys(details, value, code, ['from', 'to']) &&
        isNonEmptyString(value.from) && isNonEmptyString(value.to);
    case ApiErrorCode.REVIEW_EVIDENCE_REQUIRED:
      return hasCodeAndKeys(details, value, code, ['missingEvidenceKinds']) &&
        isStringArray(value.missingEvidenceKinds, true);
    case ApiErrorCode.RESOURCE_DISABLED:
      return hasCodeAndKeys(details, value, code, ['feature']) && isNonEmptyString(value.feature);
    case ApiErrorCode.BLOCKED_RELATIONSHIP:
      return hasCodeAndKeys(details, value, code, ['blocksAccess']) && value.blocksAccess === true;
    case ApiErrorCode.ELIGIBILITY_NOT_MET:
      return hasCodeAndKeys(details, value, code, ['missingLabelIds']) && isStringArray(value.missingLabelIds);
    case ApiErrorCode.EVENT_NOT_AVAILABLE:
      return hasCodeAndKeys(details, value, code, ['eventState']) && isNonEmptyString(value.eventState);
    case ApiErrorCode.ENROLLMENT_NOT_FOUND:
      return hasCodeAndKeys(details, value, code, ['eventId']) && isNonEmptyString(value.eventId);
    case ApiErrorCode.PAYMENT_DISABLED:
      return hasCodeAndKeys(details, value, code, ['featureFlag']) && value.featureFlag === 'payment';
    case ApiErrorCode.MEDIA_RIGHTS_REQUIRED:
      return hasCodeAndKeys(details, value, code, ['mediaAssetIds']) && isStringArray(value.mediaAssetIds, true);
    case ApiErrorCode.TOKEN_INVALID:
      return hasCodeAndKeys(details, value, code, ['tokenKind']) &&
        value.tokenKind !== undefined && ['CARD_SHARE', 'EVENT_SHARE'].includes(value.tokenKind);
    case ApiErrorCode.TOKEN_EXPIRED:
      return hasCodeAndKeys(details, value, code, ['expiredAt']) && isUtcInstant(value.expiredAt);
    case ApiErrorCode.TOKEN_REVOKED:
      return hasCodeAndKeys(details, value, code, ['revokedAt']) && isUtcInstant(value.revokedAt);
    case ApiErrorCode.PROJECTION_STALE:
      return hasCodeAndKeys(details, value, code, ['projectionType', 'requiredSourceVersion']) &&
        isNonEmptyString(value.projectionType) && isPositiveVersion(value.requiredSourceVersion);
  }
}

export function parseCloudApiResult<Action extends CloudAction>(
  action: Action,
  expectedRequestId: RequestId,
  transportResult: ICloud.CallFunctionResult['result'],
): ApiResult<CloudActionData<Action>> {
  if (!isPlainObject(transportResult)) {
    throw new Error('Cloud function returned a non-object AB Club envelope.');
  }
  const envelope = transportResult as ApiEnvelopeCandidate;
  if (envelope.requestId !== expectedRequestId) {
    throw new Error('Cloud function requestId does not match the caller requestId.');
  }

  if (envelope.ok === true) {
    if (!hasExactKeys(transportResult, ['ok', 'data', 'requestId']) || !isPlainObject(envelope.data)) {
      throw new Error('Cloud function returned an invalid success envelope.');
    }
    return transportResult as ApiResult<CloudActionData<Action>>;
  }

  if (envelope.ok === false) {
    if (!hasExactKeys(transportResult, ['ok', 'error', 'requestId']) || !isPlainObject(envelope.error)) {
      throw new Error('Cloud function returned an invalid failure envelope.');
    }
    const error = envelope.error as ApiErrorCandidate;
    if (
      !hasExactKeys(envelope.error, ['code', 'message', 'retryable', 'details']) ||
      !isNonEmptyString(error.code) ||
      !isNonEmptyString(error.message) ||
      typeof error.retryable !== 'boolean' ||
      !Object.values(ApiErrorCode).includes(error.code as ApiErrorCodeValue)
    ) {
      throw new Error('Cloud function returned an invalid safe error envelope.');
    }
    const code = error.code as ApiErrorCodeValue;
    const allowedErrorCodes: readonly ApiErrorCodeValue[] = CLOUD_ACTION_REGISTRY[action].errorCodes;
    if (!allowedErrorCodes.includes(code)) {
      throw new Error('Cloud function returned an error code not frozen for this action.');
    }
    if (
      error.details !== undefined &&
      (!isPlainObject(error.details) || !isSafeErrorDetails(code, error.details, action))
    ) {
      throw new Error('Cloud function returned unsafe or mismatched error details.');
    }
    return transportResult as ApiResult<CloudActionData<Action>>;
  }

  throw new Error('Cloud function returned an invalid AB Club ApiResult discriminator.');
}

/**
 * Typed application envelope over wx.cloud.callFunction.
 *
 * The platform requestID is transport evidence; apiResult.requestId is the
 * application request ID. They are deliberately returned as separate fields.
 * In LOCAL_ONLY this function throws before transport and never fabricates a
 * success or synthetic fallback.
 */
export async function callCloudAction<Action extends CloudAction>(
  action: Action,
  requestId: RequestId,
  payload: CloudActionPayload<Action>,
): Promise<CloudCallEvidence<Action>> {
  assertLiveCloudConfigured();

  const functionName = CLOUD_ACTION_REGISTRY[action].functionName;
  const transport = await wx.cloud.callFunction({
    name: functionName,
    data: { action, requestId, payload },
  });
  const platformTransport = transport as PlatformCallFunctionResult;
  const apiResult = parseCloudApiResult(action, requestId, platformTransport.result);

  return {
    action,
    platformRequestId: platformTransport.requestID,
    apiResult,
  };
}
